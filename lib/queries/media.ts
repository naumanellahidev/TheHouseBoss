import {
  STORAGE_BLOCK_BYTES,
  STORAGE_LIMIT_BYTES,
} from "@/lib/storage/budget";
import { createServiceClient } from "@/lib/supabase/service";
import type { StorageUsage } from "@/types/domain";

/**
 * Media accounting. Admin-only, so these use the service client — they are
 * called from cron routes and from admin pages that have already passed
 * `requireAdmin()`.
 *
 * The 1 GB Supabase Storage ceiling is the binding constraint of this project
 * (docs/07-image-pipeline.md). Everything here exists so it is visible before
 * it bites, not after.
 */

// The budget constants live in lib/storage/budget.ts, which imports nothing —
// client components need them, and importing them from here would drag the
// service-role client into the browser bundle (HR20).

export async function getStorageUsage(): Promise<StorageUsage> {
  const db = createServiceClient();
  const { data, error } = await db.rpc("storage_usage");
  if (error) throw new Error(`getStorageUsage: ${error.message}`);

  const row = Array.isArray(data) ? data[0] : data;
  return {
    totalBytes: Number(row?.total_bytes ?? 0),
    listingBytes: Number(row?.listing_bytes ?? 0),
    articleBytes: Number(row?.article_bytes ?? 0),
    otherBytes: Number(row?.other_bytes ?? 0),
    objectCount: Number(row?.object_count ?? 0),
    limitBytes: STORAGE_LIMIT_BYTES,
  };
}

/**
 * Pre-flight for the upload route. Refusing with a readable message beats
 * letting Supabase return an opaque error at 100% full.
 */
export async function canAcceptUpload(estimatedBytes: number): Promise<
  { ok: true } | { ok: false; reason: string }
> {
  const usage = await getStorageUsage();
  if (usage.totalBytes + estimatedBytes > STORAGE_BLOCK_BYTES) {
    const usedMb = Math.round(usage.totalBytes / 1_048_576);
    return {
      ok: false,
      reason:
        `Storage is nearly full (${usedMb} MB of 1024 MB). Free space in ` +
        `Media — sort by size, or purge sold listings — then try again.`,
    };
  }
  return { ok: true };
}

/** Listings whose large photos are due for purging (hard rule 10). */
export async function getListingsDueForPurge() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("listings")
    .select("id, slug, photos")
    .eq("status", "sold")
    .eq("photos_purged", false)
    .eq("keep_photos", false)
    .lt("purge_after", new Date().toISOString())
    .limit(200);

  if (error) throw new Error(`getListingsDueForPurge: ${error.message}`);
  return data ?? [];
}

/**
 * "Next purge: 3 listings on Sep 12 → frees 8.5 MB", for the dashboard.
 * 15 photos x ~190 kB of purgeable variants ≈ 2.85 MB per listing.
 */
export async function getUpcomingPurge() {
  const db = createServiceClient();
  const { data, error } = await db
    .from("listings")
    .select("id, slug, purge_after, photos")
    .eq("status", "sold")
    .eq("photos_purged", false)
    .eq("keep_photos", false)
    .not("purge_after", "is", null)
    .order("purge_after", { ascending: true })
    .limit(20);

  if (error) throw new Error(`getUpcomingPurge: ${error.message}`);

  const PURGEABLE_BYTES_PER_PHOTO = 190 * 1024;
  return (data ?? []).map((l: { id: string; slug: string; purge_after: string; photos: unknown }) => ({
    id: l.id,
    slug: l.slug,
    purgeAfter: l.purge_after,
    freesBytes:
      (Array.isArray(l.photos) ? l.photos.length : 0) * PURGEABLE_BYTES_PER_PHOTO,
  }));
}
