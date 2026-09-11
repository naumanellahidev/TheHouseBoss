#!/usr/bin/env node
/**
 * Guards lib/images/orphans.ts against the bug that deleted the site's logo and
 * portrait (2026-09-11).
 *
 * The nightly orphan sweep deletes every stored image whose key is not returned
 * by `referencedKeys()`. A new `*_key` column that is not added there is
 * therefore not an oversight — it is a timer: whatever gets uploaded to it is
 * deleted the next night. Migrations 015 and 023 added three such columns and
 * nobody added them to the sweep.
 *
 * This fails the build when any `<name>_key` column in the migrations is not
 * named in orphans.ts.
 *
 * Run: npm run check:orphan-keys
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = "supabase/migrations";

/**
 * `*_key` columns that are identifiers, not storage keys. Adding a name here
 * is a claim that the column never holds an image path — be sure.
 */
const NOT_STORAGE = new Set([
  "section_key", // page_sections: "(page_slug, section_key)" addresses a row
]);

const columns = new Set();
for (const file of readdirSync(DIR).filter((f) => f.endsWith(".sql"))) {
  const sql = readFileSync(join(DIR, file), "utf8").replace(/--[^\n]*/g, "");
  // `foo_key text` inside a create table, or `add column [if not exists] foo_key text`
  for (const m of sql.matchAll(/\b([a-z][a-z0-9_]*_key)\s+text\b/gi)) {
    columns.add(m[1].toLowerCase());
  }
}

const orphans = readFileSync("lib/images/orphans.ts", "utf8");
const body = orphans.slice(orphans.indexOf("async function referencedKeys"));

const missing = [...columns]
  .filter((c) => !NOT_STORAGE.has(c))
  .filter((c) => !new RegExp(`\\b${c}\\b`).test(body))
  .sort();

console.log(
  `checked ${columns.size} *_key column(s) against referencedKeys(): ` +
    [...columns].sort().join(", "),
);

if (missing.length > 0) {
  console.error(
    `\n✗ ${missing.length} storage-key column(s) are NOT protected from the nightly orphan sweep:\n` +
      missing.map((c) => `    - ${c}`).join("\n") +
      "\n\n  Anything uploaded to these will be DELETED about 24 hours later.\n" +
      "  Add each to referencedKeys() in lib/images/orphans.ts, or — only if the\n" +
      "  column genuinely never holds an image path — to NOT_STORAGE in this script.\n",
  );
  process.exit(1);
}

console.log("✓ every storage-key column is protected from the orphan sweep");
