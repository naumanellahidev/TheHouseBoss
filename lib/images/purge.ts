import { getListingsDueForPurge } from "@/lib/queries/media";
import { purgeablePaths } from "@/lib/storage/url";
import { storage } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * The sold-photo purge — CLAUDE.md hard rule 10, docs/07 § 7.
 *
 * Seven days after a listing sells, the 1600w and 800w derivatives are deleted
 * and the 400w is KEPT. The listing row is never deleted and the page is never
 * removed: it keeps its URL, its ranking, its backlinks and its value as proof
 * of track record. That is the whole point of the rule — this is a storage
 * measure, not a content measure.
 *
 * `keep_photos = true` opts a portfolio listing out entirely. `purge_after` is
 * set by the `set_purge_after` trigger, never by this code.
 *
 * Shared by the nightly cron and by the manual trigger in Settings →
 * Maintenance, so the button and the schedule run identical code.
 *
 * It deliberately does NOT revalidate. Cache invalidation needs a request
 * context, and binding it here would make this function uncallable from a
 * script — which is exactly where it needs to be callable, because a purge is
 * destructive and has to be verifiable outside a browser. The affected slugs
 * come back in the result and the caller revalidates them.
 */

export type PurgeResult = {
  listings: number;
  objectsDeleted: number;
  bytesFreed: number;
  failures: string[];
  /** Slugs the caller should revalidate. */
  purgedSlugs: string[];
};

/** ~140 kB (1600w) + ~50 kB (800w) per photo, from the budget in docs/07 § 1. */
const PURGEABLE_BYTES_PER_PHOTO = 190 * 1024;

/** What survives a purge: the 400w, ~18 kB of a ~208 kB three-variant total. */
const SURVIVING_SHARE = 18 / 208;

export async function purgeSoldPhotos(): Promise<PurgeResult> {
  const due = await getListingsDueForPurge();
  const db = createServiceClient();

  const result: PurgeResult = {
    listings: 0,
    objectsDeleted: 0,
    bytesFreed: 0,
    failures: [],
    purgedSlugs: [],
  };

  for (const listing of due) {
    const photos = (listing.photos ?? []) as { kind?: string; key?: string }[];
    const stored = photos.filter((photo) => photo?.kind === "stored" && photo.key);

    const paths = stored.flatMap((photo) => purgeablePaths(photo.key!));

    if (paths.length > 0) {
      const deletion = await storage.deleteMany(paths);
      result.objectsDeleted += deletion.deleted;
      if (deletion.failed.length > 0) {
        result.failures.push(`${listing.slug}: ${deletion.failed.length} objects`);
      }
    }

    // The flag is set even if some deletions failed. Retrying forever against
    // an object storage refuses to delete would block every later listing; the
    // orphan cron reclaims whatever is left behind.
    const { error } = await db
      .from("listings")
      .update({ photos_purged: true })
      .eq("id", listing.id);

    if (error) {
      result.failures.push(`${listing.slug}: ${error.message}`);
      continue;
    }

    // The media rows now describe a single surviving variant, and their byte
    // counts have to shrink with them — otherwise storage_usage() keeps
    // reporting space that was just given back, and the dashboard meter
    // silently stops being true.
    //
    // The share is an estimate, not a measurement: only the total across all
    // three variants was ever recorded, and re-measuring would cost a HEAD
    // request per object. 18 kB of a 208 kB total is the ratio from the budget
    // table in docs/07 § 1.
    const keys = stored.map((photo) => photo.key!);
    if (keys.length > 0) {
      const { data: mediaRows } = await db
        .from("media")
        .select("id, bytes")
        .in("key", keys);

      for (const row of mediaRows ?? []) {
        await db
          .from("media")
          .update({
            variants: [400],
            bytes: Math.max(1, Math.round(Number(row.bytes ?? 0) * SURVIVING_SHARE)),
          })
          .eq("id", row.id);
      }
    }

    result.listings += 1;
    result.bytesFreed += stored.length * PURGEABLE_BYTES_PER_PHOTO;
    result.purgedSlugs.push(listing.slug as string);
  }

  return result;
}
