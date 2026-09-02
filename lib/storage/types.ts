import type { PhotoSize } from "@/types/domain";

/**
 * Storage boundary — CLAUDE.md hard rule 8.
 *
 * Nothing outside `lib/storage/` may import the Supabase Storage SDK. The
 * `phase-review` skill greps for violations. This is what makes a move to
 * Cloudflare R2 (docs/07 § 10) a two-env-var change instead of a refactor.
 */

export type StoredFile = {
  /** Immutable base key. No size suffix, no extension. Never in a URL column. */
  key: string;
  width: number;
  height: number;
  /** Total across every variant written. */
  bytes: number;
  /** Tiny base64 WebP data URL for the next/image blur placeholder. */
  blur: string;
};

export type UploadInput = {
  buffer: Buffer;
  /** Full object path, e.g. `listings/{id}/{photoId}-1600.webp`. */
  path: string;
  contentType: string;
  /** Keys are immutable, so a one-year immutable cache is always safe. */
  cacheControl?: string;
};

export interface StorageProvider {
  readonly name: "supabase" | "r2" | "local";

  upload(input: UploadInput): Promise<void>;

  /** Best-effort. Missing objects are not an error — the caller may be retrying. */
  deleteMany(paths: string[]): Promise<{ deleted: number; failed: string[] }>;

  /** Full public URL for an object path. */
  publicUrl(path: string): string;

  /** Object paths under a prefix. Used by the orphan-media cron. */
  list(prefix: string): Promise<string[]>;

  exists(path: string): Promise<boolean>;
}

/** `{key}-{size}.webp` — the one place the object layout is expressed. */
export function objectPath(key: string, size: PhotoSize): string {
  return `${key}-${size}.webp`;
}

export const ALL_SIZES: readonly PhotoSize[] = [1600, 800, 400] as const;

/** Removed 7 days after a listing sells (HR10). The 400w always survives. */
export const PURGEABLE_SIZES: readonly PhotoSize[] = [1600, 800] as const;

export const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
