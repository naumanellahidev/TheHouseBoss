import { createHash } from "node:crypto";

import sharp from "sharp";

import type { PhotoSize } from "@/types/domain";

/**
 * The image pipeline — docs/07-image-pipeline.md § 2.
 *
 * Server-side only. `sharp` is a native module, so any route importing this
 * must declare `export const runtime = "nodejs"`. Edge cannot run it.
 *
 * Three rules are enforced here and nowhere else:
 *
 *   HR2  the original is never persisted — this module returns derivatives and
 *        the caller has nothing else to write
 *   HR5  we pre-generate 1600/800/400, so Vercel's image transformation quota
 *        is never touched
 *   HR7  width and height come back with the derivatives and are stored, so a
 *        listing page can always reserve the box. CLS target is 0.
 *
 * EXIF is applied and then discarded: `.rotate()` bakes in the orientation flag
 * before any resize, and sharp drops all other metadata unless asked to keep
 * it. Phone photos arrive rotated, and EXIF GPS on a property photo is a
 * privacy leak.
 */

/** Per docs/07 § 1. Quality falls with size because the display area does. */
export const VARIANTS: { size: PhotoSize; quality: number }[] = [
  { size: 1600, quality: 78 },
  { size: 800, quality: 75 },
  { size: 400, quality: 70 },
];

export const ACCEPTED_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

/** Post-client-compression cap. docs/07 § 2. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export type Derivative = {
  size: PhotoSize;
  buffer: Buffer;
  bytes: number;
};

export type ProcessedImage = {
  derivatives: Derivative[];
  /** Dimensions of the LARGEST derivative — what gets stored on the photo. */
  width: number;
  height: number;
  totalBytes: number;
  /** Tiny base64 WebP data URL for the next/image blur placeholder. */
  blur: string;
  /** sha256 of the source, so a duplicate on the same entity is rejected. */
  contentHash: string;
};

export class ImageProcessingError extends Error {
  constructor(
    message: string,
    readonly status: number = 415,
  ) {
    super(message);
    this.name = "ImageProcessingError";
  }
}

/**
 * Decode once, then derive. Reading metadata first also validates the file:
 * sharp throws on anything that is not an image, which is a cheaper and more
 * reliable check than trusting the declared mime type.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.byteLength > MAX_UPLOAD_BYTES) {
    throw new ImageProcessingError(
      `That file is ${(input.byteLength / 1_048_576).toFixed(1)} MB. The limit is 10 MB — it should have been compressed in the browser first.`,
      413,
    );
  }

  let meta;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageProcessingError(
      "That file could not be read as an image. Upload a JPEG, PNG, WebP or AVIF.",
    );
  }

  if (!meta.width || !meta.height) {
    throw new ImageProcessingError(
      "That image has no readable dimensions. Try re-exporting it.",
    );
  }

  // A single 100 MP file would exhaust the lambda's memory during decode.
  if (meta.width * meta.height > 80_000_000) {
    throw new ImageProcessingError(
      "That image is too large to process. Resize it below 80 megapixels first.",
      413,
    );
  }

  const derivatives: Derivative[] = [];
  let width = 0;
  let height = 0;

  for (const { size, quality } of VARIANTS) {
    // withoutEnlargement: a 900px source must never be upscaled to 1600px —
    // that produces a bigger, blurrier file for no gain (docs/07 § 2).
    const pipeline = sharp(input)
      .rotate()
      .resize(size, null, { withoutEnlargement: true, fit: "inside" })
      .webp({ quality, effort: 4 });

    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });

    derivatives.push({ size, buffer: data, bytes: data.byteLength });

    if (size === VARIANTS[0]!.size) {
      width = info.width;
      height = info.height;
    }
  }

  return {
    derivatives,
    width,
    height,
    totalBytes: derivatives.reduce((n, d) => n + d.bytes, 0),
    blur: await makeBlurDataUrl(input),
    contentHash: createHash("sha256").update(input).digest("hex"),
  };
}

/**
 * A ~24px WebP as a base64 data URL, fed straight to `next/image`'s
 * `blurDataURL`.
 *
 * PROGRESS.md records why this is not a blurhash string: same perceived-speed
 * benefit, no client-side decode library, and next/image consumes it directly.
 * It costs a few hundred bytes in the row rather than a runtime dependency in
 * every bundle that renders a photo.
 */
export async function makeBlurDataUrl(input: Buffer): Promise<string> {
  const tiny = await sharp(input)
    .rotate()
    .resize(24, null, { withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 45, effort: 2 })
    .toBuffer();

  return `data:image/webp;base64,${tiny.toString("base64")}`;
}
