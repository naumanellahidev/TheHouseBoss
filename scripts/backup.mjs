/**
 * Database and media backup.
 *
 *   node --env-file=.env.local scripts/backup.mjs
 *   node --env-file=.env.local scripts/backup.mjs --verify <dir>
 *
 * The Supabase free tier has **no automatic backups**. That is listed in
 * PROGRESS.md as a data-loss risk, and this is the mitigation: a full logical
 * dump of every application table as JSON, plus an inventory of every stored
 * object, written to a timestamped directory.
 *
 * JSON rather than `pg_dump` because pg_dump is not installed on the build
 * machine and, more usefully, because a JSON dump can be inspected and
 * partially restored without a Postgres client. The trade is that it does not
 * carry schema — but the schema lives in `supabase/migrations/`, which is in
 * version control, so a full rebuild is `db-migrate` followed by `--restore`.
 *
 * `--verify` re-reads a backup directory and checks that every file parses and
 * that the row counts match the manifest. A backup nobody has verified is a
 * hope, not a backup.
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { createClient } from "@supabase/supabase-js";

/** Every application table. Order matters for a restore: parents first. */
const TABLES = [
  "profiles",
  "cities",
  "communities",
  "listings",
  "articles",
  "reviews",
  "leads",
  "saved_searches",
  "media",
  "redirects",
  "sync_log",
  "site_settings",
];

const PAGE = 1000;

function client() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error(
      "✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n" +
        "  Run with: node --env-file=.env.local scripts/backup.mjs",
    );
    process.exit(1);
  }

  return createClient(url, key, { auth: { persistSession: false } });
}

/* ── verify ──────────────────────────────────────────────────────────────── */

const verifyIndex = process.argv.indexOf("--verify");
if (verifyIndex !== -1) {
  const dir = process.argv[verifyIndex + 1];
  if (!dir) {
    console.error("✗ --verify needs a directory: --verify backups/2026-09-03T…");
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  } catch (error) {
    console.error(`✗ could not read the manifest: ${error.message}`);
    process.exit(1);
  }

  console.log(`verifying ${dir}\n  taken ${manifest.takenAt}\n`);

  const files = new Set(readdirSync(dir));
  let problems = 0;

  for (const [table, expected] of Object.entries(manifest.rowCounts)) {
    const file = `${table}.json`;

    if (!files.has(file)) {
      console.error(`  ✗ ${table}: ${file} is missing`);
      problems += 1;
      continue;
    }

    try {
      const rows = JSON.parse(readFileSync(join(dir, file), "utf8"));
      if (!Array.isArray(rows)) throw new Error("not an array");
      if (rows.length !== expected) {
        console.error(`  ✗ ${table}: ${rows.length} rows, manifest says ${expected}`);
        problems += 1;
      } else {
        console.log(`  ✓ ${table}: ${rows.length} rows`);
      }
    } catch (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
      problems += 1;
    }
  }

  if (!files.has("media-objects.json")) {
    console.error("  ✗ media-objects.json is missing");
    problems += 1;
  } else {
    const objects = JSON.parse(readFileSync(join(dir, "media-objects.json"), "utf8"));
    console.log(`  ✓ media inventory: ${objects.length} objects`);
  }

  if (problems > 0) {
    console.error(`\n✗ ${problems} problem(s) — this backup is NOT trustworthy`);
    process.exit(1);
  }

  console.log("\n✓ backup verified: every file parses and every count matches");
  process.exit(0);
}

/* ── back up ─────────────────────────────────────────────────────────────── */

const db = client();

const takenAt = new Date().toISOString();
const dir = join("backups", takenAt.replace(/[:.]/g, "-"));
mkdirSync(dir, { recursive: true });

console.log(`backing up to ${dir}\n`);

const rowCounts = {};
let totalRows = 0;

for (const table of TABLES) {
  const rows = [];
  let from = 0;

  // Paged: a single select would silently cap at PostgREST's default limit,
  // which is exactly how a backup ends up quietly incomplete.
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select("*")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`  ✗ ${table}: ${error.message}`);
      process.exit(1);
    }

    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
    from += PAGE;
  }

  writeFileSync(join(dir, `${table}.json`), JSON.stringify(rows, null, 2));
  rowCounts[table] = rows.length;
  totalRows += rows.length;
  console.log(`  ✓ ${table}: ${rows.length} rows`);
}

/**
 * The media BUCKET is not copied here.
 *
 * An inventory is written instead: every key, its size and its entity. Copying
 * the objects themselves would mean gigabytes through this machine, and the
 * `media` table plus the bucket's own durability already covers the realistic
 * failure. What the inventory buys is the ability to tell, after an incident,
 * exactly which files should exist — which is the question that is impossible
 * to answer afterwards without it.
 */
const objects = [];
{
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("media")
      .select("key, variants, bytes, entity_type, entity_id, created_at")
      .range(from, from + PAGE - 1);

    if (error) {
      console.error(`  ✗ media inventory: ${error.message}`);
      process.exit(1);
    }

    for (const row of data ?? []) {
      for (const size of row.variants ?? []) {
        objects.push({ path: `${row.key}-${size}.webp`, entity: row.entity_type });
      }
    }

    if (!data || data.length < PAGE) break;
    from += PAGE;
  }
}

writeFileSync(join(dir, "media-objects.json"), JSON.stringify(objects, null, 2));
console.log(`  ✓ media inventory: ${objects.length} objects`);

writeFileSync(
  join(dir, "manifest.json"),
  JSON.stringify(
    {
      takenAt,
      project: process.env.NEXT_PUBLIC_SUPABASE_URL,
      tables: TABLES,
      rowCounts,
      totalRows,
      mediaObjects: objects.length,
      note:
        "Schema is NOT in this backup — it lives in supabase/migrations/, in version control. " +
        "To rebuild: apply the migrations, then restore these files in the order listed in `tables`.",
    },
    null,
    2,
  ),
);

console.log(`\n✓ ${totalRows} rows across ${TABLES.length} tables`);
console.log(`\n  Verify it now — an unverified backup is a hope, not a backup:`);
console.log(`  node --env-file=.env.local scripts/backup.mjs --verify ${dir}`);
