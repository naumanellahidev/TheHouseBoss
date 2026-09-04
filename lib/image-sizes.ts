/**
 * The `sizes` string for every image context.
 *
 * ── Why this is not in `property-image.tsx` ───────────────────────────────
 *
 * It used to be, and that was a silent bug. `property-image.tsx` is a
 * `"use client"` module, so when a SERVER component imported `IMAGE_SIZES` from
 * it, what arrived was a client reference — not the object. `IMAGE_SIZES.cardGrid3`
 * evaluated to `undefined`, `sizes={undefined}` reached `next/image`, and Next
 * substituted its own default of `100vw`.
 *
 * Nothing was visibly wrong, because `images.unoptimized: true` stripped `sizes`
 * from the markup anyway — the attribute had no effect on what was downloaded.
 * The custom loader in `lib/image-loader.ts` changed that: `sizes` now chooses
 * between the 400, 800 and 1600 derivatives, so `100vw` on a four-across grid
 * means every tile downloads the 1600.
 *
 * A plain module has no directive, so it is shared by both environments and the
 * values survive the boundary. Contexts and their reasoning: docs/04 § 7.
 */
export const IMAGE_SIZES = {
  cardGrid3: "(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw",
  cardGrid4: "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw",
  listingHero: "(max-width: 1023px) 100vw, 66vw",
  fullBleed: "100vw",
  articleCover: "(max-width: 767px) 100vw, 720px",
  portrait: "(max-width: 767px) 100vw, 400px",
  thumb: "120px",
} as const;
