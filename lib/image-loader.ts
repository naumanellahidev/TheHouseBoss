/**
 * The `next/image` loader.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Every stored photo is written as three WebP derivatives — 400, 800 and 1600 —
 * and until now the browser was only ever offered ONE of them. `images.
 * unoptimized: true` makes `next/image` emit a bare `src` with no `srcset`, so
 * a phone downloaded the same file a 27-inch monitor did. That was the single
 * largest remaining item on mobile Lighthouse.
 *
 * ── Why this does not break hard rule 5 ───────────────────────────────────
 *
 * HR5 exists to protect Vercel's image-transformation quota: exhausting it
 * returns 402 for every image in production. A custom loader does not touch
 * that quota — Next never routes through `/_next/image` when one is configured,
 * it puts whatever this function returns straight into the `srcset`. So the
 * quota stays at zero while the browser finally gets a choice of three widths.
 *
 * `unoptimized: true` and a custom loader are mutually exclusive: the former
 * wins and the loader is ignored. That is why `next.config.ts` now sets
 * `loader: "custom"` instead, and why HR5's wording in CLAUDE.md was amended to
 * name the quota rather than the flag. There is a test that asserts no request
 * to `/_next/image` is ever made.
 *
 * ── The mapping ───────────────────────────────────────────────────────────
 *
 * `src` already arrives as a finished URL from `lib/storage/url.ts`, shaped
 * `{base}/{key}-{size}.webp`. This swaps the size segment for the smallest
 * derivative that still covers the requested width. Nothing else about the URL
 * is touched, so HR1 holds: the key is still the only thing the database
 * stores, and the base URL is still built at runtime.
 */

/** The three widths the upload pipeline actually writes. */
const AVAILABLE = [400, 800, 1600] as const;

/** Matches the size segment of a media URL, and only at the very end. */
const SIZED = /-(400|800|1600)\.webp$/;

export default function imageLoader({
  src,
  width,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  /*
    Anything that is not one of our derivatives is returned untouched: the SVG
    placeholder, the icons in `public/`, an `external` photo from a future MLS
    feed. Rewriting those would produce a URL that does not exist, and a broken
    image is a worse outcome than a slightly large one.
  */
  if (!SIZED.test(src)) return src;

  // The smallest derivative that still covers the slot, so a 500px slot on a
  // 2x screen (width 1000) gets the 1600 rather than a blurry 800.
  const chosen = AVAILABLE.find((size) => size >= width) ?? 1600;

  return src.replace(SIZED, `-${chosen}.webp`);
}
