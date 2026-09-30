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
/*
  ── The phone clamp ──────────────────────────────────────────────────────
  A phone reports a device pixel ratio around 2.6, so a full-width slot on a
  412px screen asks for ~1080px and the browser takes the 1600 derivative.
  Measured on the live site: that is 274 kB for the home hero where the 800
  derivative is 74 kB, and it was most of a 4.1s mobile LCP.

  The declared width below 768px is therefore deliberately smaller than the
  slot, which caps the effective density at roughly 2x instead of 2.6x. On a
  photographic hero behind a scrim that is not visible; 200 kB on the LCP path
  is. Desktop is untouched, because there the ratio is 1 and the widths are
  honest.
*/
export const IMAGE_SIZES = {
  cardGrid3: "(max-width: 767px) 60vw, (max-width: 1279px) 50vw, 33vw",
  cardGrid4: "(max-width: 767px) 60vw, (max-width: 1023px) 50vw, 25vw",
  listingHero: "(max-width: 767px) 70vw, (max-width: 1023px) 100vw, 66vw",
  fullBleed: "(max-width: 767px) 70vw, 100vw",
  articleCover: "(max-width: 767px) 70vw, 720px",
  /*
    Measured, not guessed: the About and home portraits render ~479px on a
    1440 desktop and full width on a phone. The old 400px cap made the browser
    pick a 400px file for a 479px slot.
  */
  portrait: "(max-width: 767px) 100vw, 480px",
  thumb: "120px",
} as const;
