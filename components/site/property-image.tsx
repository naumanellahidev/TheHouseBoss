"use client";

import * as React from "react";
import Image from "next/image";

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

export const IMAGE_SIZES = {
  cardGrid3: "(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw",
  cardGrid4: "(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 25vw",
  listingHero: "(max-width: 1023px) 100vw, 66vw",
  fullBleed: "100vw",
  articleCover: "(max-width: 767px) 100vw, 720px",
  portrait: "(max-width: 767px) 100vw, 400px",
  thumb: "120px",
} as const;

export function PropertyImage({
  photo,
  size = 800,
  sizes,
  priority = false,
  className,
  wrapperClassName,
  aspect = "4/3",
}: {
  photo: Photo | null | undefined;
  size?: PhotoSize;
  sizes: string;
  priority?: boolean;
  className?: string;
  wrapperClassName?: string;
  /** Tailwind aspect utility suffix, e.g. "4/3" | "16/9" | "4/5". */
  aspect?: "4/3" | "16/9" | "21/9" | "4/5" | "1/1" | "none";
}) {
  const [failed, setFailed] = React.useState(false);

  const src = !photo || failed ? PLACEHOLDER_PROPERTY : photoUrl(photo, size);
  const alt = photo && !failed ? photo.alt : "";
  const isPlaceholder = !photo || failed;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-surface-sunken",
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
          "object-cover",
          isPlaceholder && "object-contain p-8 opacity-60",
          className,
        )}
      />
    </div>
  );
}
