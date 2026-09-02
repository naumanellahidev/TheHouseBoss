import type { StorageUsage } from "@/types/domain";

/**
 * Storage budget constants and pure formatting.
 *
 * Deliberately dependency-free. These values and helpers are needed by client
 * components — the uploader's live estimate, the media grid, the settings
 * maintenance panel — and the moment one of them reaches for a helper that
 * lives beside a query, the service-role client comes with it and the runtime
 * guard in lib/supabase/service.ts fires.
 *
 * That is exactly how this module came to exist: `formatBytes` used to live in
 * the storage-meter component, which imports `lib/queries/media`, which imports
 * the service client. Anything importing the meter for its formatter pulled the
 * whole chain into the browser bundle (CLAUDE.md hard rule 20).
 *
 * Nothing here may import a query, a Supabase client, or a React component.
 */

/** Supabase free tier. Changing plan? Change this and the dashboard follows. */
export const STORAGE_LIMIT_BYTES = 1_073_741_824;

/** In-app banner at 800 MB; uploads blocked at 950 MB (docs/07 § 9). */
export const STORAGE_WARN_BYTES = 838_860_800;
export const STORAGE_BLOCK_BYTES = 996_147_200;

/** ~208 kB across the three derivatives, from the budget table in docs/07 § 1. */
export const BYTES_PER_PHOTO = 208 * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${Math.round(bytes / 1024)} kB`;
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`;
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`;
}

export type StorageLevel = {
  key: "ok" | "warning" | "critical";
  label: string;
  /** Tailwind class for the bar. Colour is never the only signal — the label is. */
  bar: string;
};

export function storageLevel(usage: StorageUsage): StorageLevel {
  const ratio = usage.limitBytes > 0 ? usage.totalBytes / usage.limitBytes : 0;
  if (usage.totalBytes >= STORAGE_WARN_BYTES || ratio >= 0.9) {
    return { key: "critical", label: "Nearly full", bar: "bg-danger" };
  }
  if (ratio >= 0.7) {
    return { key: "warning", label: "Getting full", bar: "bg-warning" };
  }
  return { key: "ok", label: "Healthy", bar: "bg-success" };
}
