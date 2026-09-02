import { storage } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Orphan detection — docs/07 § 7.
 *
 * Two directions, and both are real:
 *
 *   1. objects in the bucket with no `media` row — an upload whose DB write
 *      failed, or a draft abandoned mid-upload
 *   2. `media` rows whose entity no longer exists, or whose key nothing
 *      references any more — a photo removed from a listing while storage was
 *      briefly unreachable
 *
 * NOTHING created in the last 24 hours is ever swept. An upload in progress
 * looks exactly like an orphan for the few seconds between the object landing
 * and the row being written, and sweeping it would delete a photo out from
 * under someone mid-edit.
 *
 * Shared by the admin Media screen and the nightly cron so the number she is
 * shown and the number that gets deleted are computed the same way.
 */

const SAFETY_WINDOW_MS = 24 * 60 * 60 * 1000;

export type OrphanReport = {
  /** Object paths in the bucket with no media row. */
  strayObjects: string[];
  /** media rows whose entity is gone or whose key nothing references. */
  strayRows: { id: string; key: string; bytes: number; entityType: string }[];
  /** What deleting everything above would free. */
  reclaimableBytes: number;
  /** Objects skipped because they are inside the 24h safety window. */
  skippedRecent: number;
};

/** Every base key currently referenced by a listing's photos array. */
async function referencedKeys(): Promise<Set<string>> {
  const db = createServiceClient();
  const keys = new Set<string>();

  const { data, error } = await db.from("listings").select("photos, floorplan_key");
  if (error) throw new Error(`referencedKeys(listings): ${error.message}`);

  for (const row of data ?? []) {
    for (const photo of (row.photos ?? []) as { kind?: string; key?: string }[]) {
      if (photo?.key) keys.add(photo.key);
    }
    if (row.floorplan_key) keys.add(row.floorplan_key as string);
  }

  const { data: articles } = await db.from("articles").select("cover_key, og_key");
  for (const row of articles ?? []) {
    if (row.cover_key) keys.add(row.cover_key as string);
    if (row.og_key) keys.add(row.og_key as string);
  }

  const { data: cities } = await db.from("cities").select("hero_key");
  for (const row of cities ?? []) {
    if (row.hero_key) keys.add(row.hero_key as string);
  }

  const { data: communities } = await db.from("communities").select("hero_key");
  for (const row of communities ?? []) {
    if (row.hero_key) keys.add(row.hero_key as string);
  }

  return keys;
}

export async function findOrphans(): Promise<OrphanReport> {
  const db = createServiceClient();
  const cutoff = Date.now() - SAFETY_WINDOW_MS;

  const [{ data: mediaRows, error }, referenced] = await Promise.all([
    db.from("media").select("id, key, bytes, entity_type, entity_id, created_at"),
    referencedKeys(),
  ]);
  if (error) throw new Error(`findOrphans(media): ${error.message}`);

  const rows = mediaRows ?? [];
  const knownKeys = new Set(rows.map((row) => row.key as string));

  // ── Direction 1: objects with no row ─────────────────────────────────────
  const objects = await storage.list("listings").catch(() => [] as string[]);
  const articleObjects = await storage.list("articles").catch(() => [] as string[]);
  const allObjects = [...objects, ...articleObjects];

  const strayObjects: string[] = [];
  for (const path of allObjects) {
    // `listings/{id}/{photoId}-1600.webp` → `listings/{id}/{photoId}`
    const base = path.replace(/-(1600|800|400)\.webp$/, "");
    if (base === path) continue; // not one of ours; leave it alone
    if (!knownKeys.has(base)) strayObjects.push(path);
  }

  // ── Direction 2: rows nothing references ─────────────────────────────────
  let skippedRecent = 0;
  const strayRows: OrphanReport["strayRows"] = [];

  for (const row of rows) {
    if (new Date(row.created_at as string).getTime() > cutoff) {
      skippedRecent += 1;
      continue;
    }
    if (referenced.has(row.key as string)) continue;
    strayRows.push({
      id: row.id as string,
      key: row.key as string,
      bytes: Number(row.bytes ?? 0),
      entityType: row.entity_type as string,
    });
  }

  // A stray object's size is not known without a HEAD per object, which is not
  // worth 3 requests per photo. The three derivatives average ~208 kB, so a
  // single object averages a third of that.
  const OBJECT_ESTIMATE = Math.round((208 * 1024) / 3);

  return {
    strayObjects,
    strayRows,
    reclaimableBytes:
      strayRows.reduce((n, row) => n + row.bytes, 0) +
      strayObjects.length * OBJECT_ESTIMATE,
    skippedRecent,
  };
}

/** Deletes everything `findOrphans` reported. Returns what was actually freed. */
export async function sweepOrphans(report: OrphanReport): Promise<{
  objectsDeleted: number;
  rowsDeleted: number;
  bytesReclaimed: number;
}> {
  const db = createServiceClient();

  const rowPaths = report.strayRows.flatMap((row) =>
    [1600, 800, 400].map((size) => `${row.key}-${size}.webp`),
  );

  const paths = [...report.strayObjects, ...rowPaths];
  const result = paths.length > 0
    ? await storage.deleteMany(paths)
    : { deleted: 0, failed: [] };

  let rowsDeleted = 0;
  if (report.strayRows.length > 0) {
    const { error } = await db
      .from("media")
      .delete()
      .in("id", report.strayRows.map((row) => row.id));
    if (error) console.error(`[sweepOrphans] row delete: ${error.message}`);
    else rowsDeleted = report.strayRows.length;
  }

  return {
    objectsDeleted: result.deleted,
    rowsDeleted,
    bytesReclaimed: report.reclaimableBytes,
  };
}
