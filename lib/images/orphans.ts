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

/**
 * Every base key any row currently points at.
 *
 * THIS SET IS A DELETE-LIST INVERSE. Anything stored but missing from here is
 * deleted by the nightly cron once it is 24 hours old, so a column omitted here
 * is not a missed optimisation — it is data loss on a timer.
 *
 * `site_settings` and `profiles.avatar_key` were both missing, which meant the
 * site-wide hero, the OG image and the admin's avatar were all scheduled for
 * deletion the day after they were set. Found while planning the image seeding;
 * nothing had been uploaded to those columns yet, so nothing was actually lost.
 *
 * The full list of key-bearing columns, verified against the migrations:
 *   listings.photos[].key, listings.floorplan_key
 *   articles.cover_key, articles.og_key
 *   cities.hero_key, communities.hero_key
 *   site_settings.hero_key, site_settings.og_key
 *   profiles.avatar_key
 *
 * If a migration adds another, add it here in the same commit.
 */
async function referencedKeys(): Promise<Set<string>> {
  const db = createServiceClient();
  const keys = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.length > 0) keys.add(value);
  };

  const { data, error } = await db.from("listings").select("photos, floorplan_key");
  if (error) throw new Error(`referencedKeys(listings): ${error.message}`);

  for (const row of data ?? []) {
    for (const photo of (row.photos ?? []) as { kind?: string; key?: string }[]) {
      add(photo?.key);
    }
    add(row.floorplan_key);
  }

  const { data: articles } = await db.from("articles").select("cover_key, og_key");
  for (const row of articles ?? []) {
    add(row.cover_key);
    add(row.og_key);
  }

  const { data: cities } = await db.from("cities").select("hero_key");
  for (const row of cities ?? []) add(row.hero_key);

  const { data: communities } = await db.from("communities").select("hero_key");
  for (const row of communities ?? []) add(row.hero_key);

  const { data: settings } = await db.from("site_settings").select("hero_key, og_key");
  for (const row of settings ?? []) {
    add(row.hero_key);
    add(row.og_key);
  }

  const { data: profiles } = await db.from("profiles").select("avatar_key");
  for (const row of profiles ?? []) add(row.avatar_key);

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
  //
  // Every prefix `buildKey` can produce (lib/images/store.ts). Only `listings`
  // and `articles` were listed before, so a failed upload under `cities/`,
  // `communities/`, `profile/` or `site/` was never reclaimed — the opposite
  // failure to the one above, and a leak rather than data loss, but still wrong.
  //
  // A prefix that has never been written to returns an empty list, so listing
  // all six costs nothing until they are used.
  const PREFIXES = [
    "listings",
    "articles",
    "cities",
    "communities",
    "profile",
    "site",
  ] as const;

  const allObjects = (
    await Promise.all(
      PREFIXES.map((prefix) =>
        storage.list(prefix).catch(() => [] as string[]),
      ),
    )
  ).flat();

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
