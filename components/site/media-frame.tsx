import * as React from "react";

import { PropertyImage } from "@/components/site/property-image";
import { cn } from "@/lib/utils";
import type { Photo, PhotoSize } from "@/types/domain";

/**
 * Editorial media frame — the single place non-listing imagery is shaped.
 *
 * "Editorial" means an image that sells a place or a person rather than a
 * specific property: the home and city heroes, city tiles, the About portrait,
 * guide headers. Those get `--radius-2xl` (28px) via the `media-frame` utility.
 *
 * **Listing photography does not belong here.** It stays at `--radius-lg` in
 * `PropertyCard` and `Gallery`, because a for-sale photo rounded past 12px
 * reads as a social app rather than a listing (docs/03 § Radius rule). The two
 * cases are separated by component rather than by a prop precisely so the
 * distinction cannot be undone by passing the wrong argument.
 *
 * Rendering still goes through `PropertyImage`, so HR1/5/6/7 hold: the URL is
 * built from the key at runtime, sizes are pre-generated, a failure falls back
 * to the branded placeholder, and width/height are always present so CLS is 0.
 */
/**
 * Build a `Photo` from a stored hero key.
 *
 * Cities and communities carry a bare `heroKey`, not a `Photo`, so every caller
 * was constructing the same object literal inline. One helper so the fallback
 * dimensions stay consistent — they only feed the aspect ratio, since
 * `MediaFrame` renders with `fill`, but an inconsistent pair here is a silent
 * source of layout shift (HR7).
 */
export function heroPhoto(
  key: string | null | undefined,
  alt: string | null | undefined,
  w = 1600,
  h = 1200,
): Photo | null {
  return key ? { kind: "stored", key, w, h, alt: alt ?? "" } : null;
}

export function MediaFrame({
  photo,
  /**
   * 800 by default, NOT 1600.
   *
   * `next.config.ts` sets `images.unoptimized: true` (HR5), which means
   * next/image emits no srcset — so whichever variant this names is downloaded
   * by every device, and the `sizes` string below is inert for selection. We
   * pre-generate 400/800/1600 and can only serve one of them.
   *
   * Measured: two 1600w heroes cost 509 kB on a 412px viewport and pushed the
   * home page's mobile LCP to 6.1s. At 412px x 1.75 DPR the browser wants
   * ~720px, so 800 is the honest default and 1600 is an opt-in for images that
   * are genuinely displayed large on desktop.
   */
  size = 800,
  sizes,
  priority = false,
  aspect = "4/5",
  scrim = false,
  children,
  className,
  imageClassName,
}: {
  photo: Photo | null | undefined;
  size?: PhotoSize;
  /** Required — see docs/04 § 7. The wrong value is the usual cause of a bad mobile LCP. */
  sizes: string;
  priority?: boolean;
  aspect?: "4/3" | "16/9" | "21/9" | "4/5" | "1/1";
  /** Adds the bottom-up scrim. Required behind any text laid over the image. */
  scrim?: boolean;
  /** Overlays — captions, FloatCards, badges. Positioned by the caller. */
  children?: React.ReactNode;
  className?: string;
  imageClassName?: string;
}) {
  return (
    <div className={cn("media-frame", className)}>
      <PropertyImage
        photo={photo}
        size={size}
        sizes={sizes}
        priority={priority}
        aspect={aspect}
        className={imageClassName}
      />

      {scrim ? (
        <div aria-hidden="true" className="photo-scrim absolute inset-0" />
      ) : null}

      {children}
    </div>
  );
}
