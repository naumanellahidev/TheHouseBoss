import type { Photo, PhotoSize } from "@/types/domain";

/**
 * THE ONLY PLACE A MEDIA URL IS CONSTRUCTED.
 *
 * CLAUDE.md hard rule 1: the database stores the immutable `key`, never a full
 * URL. Changing storage provider or CDN domain is then one env var and every
 * existing image keeps working.
 *
 * Object layout: `{key}-{size}.webp`
 *   listings/{listingId}/{photoId}-1600.webp
 *   listings/{listingId}/{photoId}-800.webp
 *   listings/{listingId}/{photoId}-400.webp
 */

const MEDIA_URL = process.env.NEXT_PUBLIC_MEDIA_URL?.replace(/\/+$/, "") ?? "";

export function photoUrl(photo: Photo, size: PhotoSize = 1600): string {
  if (photo.kind === "external") return photo.url;
  return `${MEDIA_URL}/${photo.key}-${size}.webp`;
}

export function keyUrl(key: string, size: PhotoSize = 1600): string {
  return `${MEDIA_URL}/${key}-${size}.webp`;
}

/** Every object path a stored photo owns — used by delete and purge paths. */
export function allVariantPaths(key: string): string[] {
  return ([1600, 800, 400] as const).map((s) => `${key}-${s}.webp`);
}

/** The two variants removed 7 days after a listing sells (hard rule 10). */
export function purgeablePaths(key: string): string[] {
  return ([1600, 800] as const).map((s) => `${key}-${s}.webp`);
}

export const PLACEHOLDER_PROPERTY = "/placeholder-property.svg";
