"use client";

import * as React from "react";
import Image from "next/image";

import { IMAGE_SIZES } from "@/lib/image-sizes";
import { PLACEHOLDER_PROPERTY, photoUrl } from "@/lib/storage/url";
import { cn } from "@/lib/utils";
import type { Photo, PhotoSize } from "@/types/domain";

/**
 * The ONLY way an image is rendered in this app.
 *
 * Guarantees, all from CLAUDE.md:
 *  HR1 — URL built at runtime from the key, never read from the database
 *  HR5 — Vercel optimization is off; we pre-generate 1600/800/400
 *  HR6 — onError falls back to a branded placeholder; no broken-image icon
 *  HR7 — width/height always passed, so CLS is 0
 *
 * `sizes` is REQUIRED. Getting it wrong is the most common cause of a failed
 * mobile Lighthouse score on this site. Values per context are in
 * docs/04-responsive-spec.md § 7.
 */

/*
  Re-exported for the components that already import it from here. The values
  themselves live in `lib/image-sizes.ts`, which has no "use client" directive —
  a server component importing them from THIS module received a client
  reference and got `undefined`, which Next then replaced with `100vw`.

  New call sites should import from `@/lib/image-sizes` directly.
*/
export { IMAGE_SIZES };

export function PropertyImage({
  photo,
  size = 800,
  sizes,
  priority = false,
  className,
  wrapperClassName,
  aspect = "4/3",
  bare = false,
  fallback,
}: {
  photo: Photo | null | undefined;
  size?: PhotoSize;
  sizes: string;
  priority?: boolean;
  className?: string;
  wrapperClassName?: string;
  /** Tailwind aspect utility suffix, e.g. "4/3" | "16/9" | "4/5". */
  aspect?: "4/3" | "16/9" | "21/9" | "4/5" | "1/1" | "none";
  /**
   * Artwork, not photography — a logo or a mark.
   *
   * Drops the sunken plate and the clip. Both are right for a photograph: the
   * plate is what fills the frame while the image loads and the clip keeps a
   * cover-fitted photo inside its box. Behind a TRANSPARENT logo the plate
   * becomes a pale rectangle, which on the dark footer read as a white card
   * around the mark.
   *
   * The `onError` fallback is dropped with it. A missing logo should render
   * nothing and let the type-set lockup take over, not show a house icon.
   */
  bare?: boolean;
  /**
   * What to render instead when `bare` artwork is missing or fails to load.
   *
   * Without it, a failed logo left the header's home link with no content and
   * no accessible name — axe reported it as a serious `link-name` violation and
   * the responsive audit caught the same link as a 0x44 touch target. "Render
   * nothing" is right for a decorative mark and wrong for one that is also a
   * link's label, so the caller supplies the substitute.
   */
  fallback?: React.ReactNode;
}) {
  const [failed, setFailed] = React.useState(false);

  if (bare && (!photo || failed)) return <>{fallback ?? null}</>;

  const src = !photo || failed ? PLACEHOLDER_PROPERTY : photoUrl(photo, size);
  const alt = photo && !failed ? photo.alt : "";
  const isPlaceholder = !photo || failed;

  return (
    <div
      className={cn(
        "relative",
        !bare && "overflow-hidden bg-surface-sunken",
        aspect === "4/3" && "aspect-4/3",
        aspect === "16/9" && "aspect-video",
        aspect === "21/9" && "aspect-21/9",
        aspect === "4/5" && "aspect-4/5",
        aspect === "1/1" && "aspect-square",
        wrapperClassName,
      )}
    >
      <Image
        src={src}
        alt={alt}
        // Placeholder is decorative; a real photo carries its own description.
        aria-hidden={isPlaceholder || alt === "" ? true : undefined}
        fill={aspect !== "none"}
        width={aspect === "none" && photo ? photo.w : undefined}
        height={aspect === "none" && photo ? photo.h : undefined}
        sizes={sizes}
        priority={priority}
        loading={priority ? undefined : "lazy"}
        placeholder={
          photo && photo.kind === "stored" && photo.blur ? "blur" : "empty"
        }
        blurDataURL={photo && photo.kind === "stored" ? photo.blur : undefined}
        onError={() => setFailed(true)}
        className={cn(
          bare ? "object-contain" : "object-cover",
          !bare && isPlaceholder && "object-contain p-8 opacity-60",
          className,
        )}
      />
    </div>
  );
}
