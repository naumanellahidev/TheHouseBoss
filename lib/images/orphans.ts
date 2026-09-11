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
 * It has happened twice:
 *
 *   - `site_settings.hero_key`/`og_key` and `profiles.avatar_key` were missing.
 *     Caught before anything was uploaded to them.
 *   - `site_settings.logo_key`, `logo_invert_key` (migration 015) and
 *     `portrait_key` (migration 023) were added without being added here. The
 *     sweep deleted the uploaded logo, inverted logo and portrait; found
 *     2026-09-11 when the LocalBusiness JSON-LD pointed at them and every
 *     variant returned 404. Those files are gone and had to be re-uploaded.
 *
 * `npm run check:orphan-keys` now fails the build when a `*_key` column exists
 * in the migrations but not in this function, so the next one is caught in CI
 * rather than by a missing logo.
 *
 * Two further sources hold keys inside JSON rather than in a column, and both
 * were unprotected:
 *   - article bodies: the Tiptap editor inserts an inline image as a media URL
 *     in `body_json`, so an image in the middle of an article lived only there
 *   - `page_sections.content`, which may carry image references
 * Both are scanned for anything that looks like one of our object paths.
 *
 * Every read FAILS CLOSED. A query that errors must abort the sweep: an empty
 * result from a failed read would mark everything that table references as
 * unreferenced, and the sweep would delete it all. Only the listings read
 * threw before; the rest silently treated an error as "no rows".
 *
 * The full list of key-bearing columns, verified against the migrations:
 *   listings.photos[].key, listings.floorplan_key
 *   articles.cover_key, articles.og_key, articles.body_json (inline images)
 *   cities.hero_key, communities.hero_key
 *   site_settings.hero_key, og_key, logo_key, logo_invert_key, portrait_key
 *   profiles.avatar_key
 *   page_sections.content (scanned)
 *
 * If a migration adds another, add it here in the same commit.
 */

/**
 * The prefixes `buildKey` can produce (lib/images/store.ts), preceded by any
 * boundary a key can sit after in JSON or HTML.
 *
 * Deliberately generous: a false match only keeps a file the sweep would have
 * deleted, while a miss deletes a file something still shows.
 */
const KEY_PATTERN =
  /(?:^|[\/\s"'(=])((?:listings|articles|cities|communities|profile|site)\/[A-Za-z0-9_\-/]+?)(?:-(?:1600|800|400)\.webp)?(?=$|[?#"'\s)])/g;

/**
 * Pulls every object key out of an arbitrary JSON value — a bare key, a full
 * media URL, or an object path with a size suffix all reduce to the base key.
 */
function keysInJson(value: unknown, add: (key: string) => void): void {
  if (typeof value === "string") {
    for (const match of value.matchAll(KEY_PATTERN)) add(match[1]);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) keysInJson(item, add);
    return;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) keysInJson(item, add);
  }
}

async function referencedKeys(): Promise<Set<string>> {
  const db = createServiceClient();
  const keys = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value === "string" && value.length > 0) keys.add(value);
  };

  /** Throws on error — see "FAILS CLOSED" above. */
  const read = async <T>(
    label: string,
    query: PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  ): Promise<T[]> => {
    const { data, error } = await query;
    if (error) throw new Error(`referencedKeys(${label}): ${error.message}`);
    return data ?? [];
  };

  type Row = Record<string, unknown>;

  for (const row of await read<Row>(
    "listings",
    db.from("listings").select("photos, floorplan_key"),
  )) {
    for (const photo of (row.photos ?? []) as { kind?: string; key?: string }[]) {
      add(photo?.key);
    }
    add(row.floorplan_key);
  }

  for (const row of await read<Row>(
    "articles",
    db.from("articles").select("cover_key, og_key, body_json"),
  )) {
    add(row.cover_key);
    add(row.og_key);
    keysInJson(row.body_json, add);
  }

  for (const row of await read<Row>("cities", db.from("cities").select("hero_key"))) {
    add(row.hero_key);
  }

  for (const row of await read<Row>(
    "communities",
    db.from("communities").select("hero_key"),
  )) {
    add(row.hero_key);
  }

  for (const row of await read<Row>(
    "site_settings",
    db
      .from("site_settings")
      .select("hero_key, og_key, logo_key, logo_invert_key, portrait_key"),
  )) {
    add(row.hero_key);
    add(row.og_key);
    add(row.logo_key);
    add(row.logo_invert_key);
    add(row.portrait_key);
  }

  for (const row of await read<Row>("profiles", db.from("profiles").select("avatar_key"))) {
    add(row.avatar_key);
  }

  for (const row of await read<Row>(
    "page_sections",
    db.from("page_sections").select("content"),
  )) {
    keysInJson(row.content, add);
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
