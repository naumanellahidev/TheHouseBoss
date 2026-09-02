import { nanoid } from "nanoid";

import {
  ImageProcessingError,
  processImage,
  type ProcessedImage,
} from "@/lib/images/process";
import { canAcceptUpload } from "@/lib/queries/media";
import { storage, objectPath, allVariantPaths } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Process → upload → account. The whole of an image's life in one place.
 *
 * Ordering is not incidental (docs/07 § 8, failure-mode table):
 *
 *   1. pre-flight the storage budget, so a full bucket produces a readable
 *      message instead of an opaque Supabase error at 100%
 *   2. upload the objects FIRST
 *   3. write the `media` row SECOND
 *
 * That order makes "upload succeeded, DB write failed" the only reachable
 * failure, and it is recoverable — the catch block deletes the objects it just
 * wrote. The reverse order would leave a `media` row pointing at nothing, which
 * nothing can clean up automatically.
 */

export type EntityType =
  | "listing"
  | "article"
  | "city"
  | "community"
  | "profile"
  | "site";

export type StoredImage = {
  /** Immutable base key. No size suffix, no extension (HR1, HR4). */
  key: string;
  width: number;
  height: number;
  bytes: number;
  blur: string;
};

/**
 * Key layout from docs/07 § 3. `nanoid(8)` — NEVER derived from the address,
 * title or slug (HR4), so editing an address cannot orphan an image.
 */
export function buildKey(entityType: EntityType, entityId: string): string {
  const folder =
    entityType === "listing"
      ? "listings"
      : entityType === "article"
        ? "articles"
        : entityType === "city"
          ? "cities"
          : entityType === "community"
            ? "communities"
            : entityType === "profile"
              ? "profile"
              : "site";

  return `${folder}/${entityId}/${nanoid(8)}`;
}

export async function storeImage(opts: {
  buffer: Buffer;
  entityType: EntityType;
  entityId: string;
}): Promise<StoredImage> {
  const processed: ProcessedImage = await processImage(opts.buffer);

  const budget = await canAcceptUpload(processed.totalBytes);
  if (!budget.ok) throw new ImageProcessingError(budget.reason, 507);

  await assertNotDuplicate(opts.entityType, opts.entityId, processed.contentHash);

  const key = buildKey(opts.entityType, opts.entityId);
  const written: string[] = [];

  try {
    for (const derivative of processed.derivatives) {
      const path = objectPath(key, derivative.size);
      await storage.upload({
        buffer: derivative.buffer,
        path,
        contentType: "image/webp",
      });
      written.push(path);
    }

    const db = createServiceClient();
    const { error } = await db.from("media").insert({
      key,
      variants: processed.derivatives.map((d) => d.size),
      bytes: processed.totalBytes,
      width: processed.width,
      height: processed.height,
      mime: "image/webp",
      content_hash: processed.contentHash,
      entity_type: opts.entityType,
      entity_id: opts.entityId,
    });

    if (error) throw new Error(error.message);
  } catch (error) {
    // Roll back the bytes we just consumed. Best effort — the orphan cron is
    // the backstop if this also fails.
    if (written.length > 0) await storage.deleteMany(written);
    throw error;
  }

  return {
    key,
    width: processed.width,
    height: processed.height,
    bytes: processed.totalBytes,
    blur: processed.blur,
  };
}

/**
 * "This photo is already on this listing" (docs/07 § 8). The unique index
 * `media_entity_hash_idx` is the real guarantee; this check exists to turn a
 * constraint violation into a sentence the client can act on.
 */
async function assertNotDuplicate(
  entityType: EntityType,
  entityId: string,
  contentHash: string,
): Promise<void> {
  const db = createServiceClient();
  const { data } = await db
    .from("media")
    .select("id")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("content_hash", contentHash)
    .maybeSingle();

  if (data) {
    throw new ImageProcessingError(
      "This photo is already on this listing.",
      409,
    );
  }
}

/**
 * Removes every variant of a key plus its `media` row.
 *
 * Storage first, row second, and a storage failure does NOT abort the row
 * delete: docs/07 § 7 — never leave an entity pointing at deleted images. The
 * orphan cron reclaims anything storage refused.
 */
export async function deleteImages(keys: string[]): Promise<{
  deleted: number;
  failed: string[];
}> {
  if (keys.length === 0) return { deleted: 0, failed: [] };

  const paths = keys.flatMap(allVariantPaths);
  let result = { deleted: 0, failed: paths };

  try {
    result = await storage.deleteMany(paths);
  } catch (error) {
    console.error("[deleteImages] storage delete failed:", error);
  }

  const db = createServiceClient();
  const { error } = await db.from("media").delete().in("key", keys);
  if (error) console.error(`[deleteImages] media row delete: ${error.message}`);

  return result;
}
