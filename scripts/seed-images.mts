#!/usr/bin/env node
/**
 * Seed the site's stock photography.
 *
 *   npm run seed:images            fill anything currently empty
 *   npm run seed:images -- --force replace images that are already set
 *   npm run seed:images -- --dry   download and process, write nothing
 *
 * Every image goes through `storeImage()` — the same function the admin upload
 * route calls. That is the whole point: routing through it rather than talking
 * to storage directly is what buys HR1 (a key is stored, never a URL), HR2 (the
 * original is never persisted, only the three WebP derivatives), HR7 (width and
 * height come from the 1600 derivative, so CLS stays 0) and HR9 (exactly one
 * `media` row per object) without this script having to re-implement any of it.
 *
 * THE UPLOAD AND THE REFERENCE ARE WRITTEN IN THE SAME PASS, deliberately. The
 * nightly orphan cron deletes any stored key that no row points at once it is
 * 24 hours old, so an image uploaded now and attached tomorrow is an image that
 * gets deleted tonight.
 *
 * NOTHING HERE MAY BE USED AS A LISTING PHOTO. A stock image standing in for a
 * home a buyer can go and view is misrepresentation under FREC advertising
 * rules. Listings show the branded fallback until real photography exists.
 * See scripts/image-manifest.json.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { storeImage } from "@/lib/images/store";
// Shared with the Branding tab so both file site artwork under the same id.
import { SITE_ENTITY_ID } from "@/lib/images/site-entity";
import { createServiceClient } from "@/lib/supabase/service";

const FORCE = process.argv.includes("--force");
const DRY = process.argv.includes("--dry");

/**
 * `media.entity_id` is a uuid column, but `site_settings` is a singleton keyed
 * `id = 1`. A fixed sentinel gives site-level images a stable, valid owner —
 * fixed rather than random so re-running does not orphan the previous batch.
 */

type ImageSpec = { url: string; alt: string; source: string };
type Manifest = {
  cities: (ImageSpec & { slug: string })[];
  communities: (ImageSpec & { slug: string })[];
  site: (ImageSpec & { target: "hero_key" | "og_key" })[];
};

const manifest: Manifest = JSON.parse(
  readFileSync(join(process.cwd(), "scripts", "image-manifest.json"), "utf8"),
);

let stored = 0;
let skipped = 0;
let failed = 0;

async function download(url: string): Promise<Buffer> {
  const response = await fetch(url, {
    headers: { "User-Agent": "the-house-boss-seed/1.0" },
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} fetching ${url}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  // MAX_UPLOAD_BYTES is 10 MB; processImage would reject with 413 anyway, but
  // failing here names the file rather than the pipeline stage.
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error(`${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB is over the 10 MB limit`);
  }
  return buffer;
}

/**
 * Download → store → return the key. Callers write the reference themselves,
 * because which column it lands in differs per entity.
 */
async function place(
  label: string,
  spec: ImageSpec,
  entityType: "city" | "community" | "site",
  entityId: string,
): Promise<string | null> {
  try {
    const buffer = await download(spec.url);

    if (DRY) {
      console.log(`  · ${label}: ${(buffer.byteLength / 1024).toFixed(0)} kB (dry run)`);
      skipped += 1;
      return null;
    }

    const image = await storeImage({ buffer, entityType, entityId });
    stored += 1;
    console.log(
      `  ✓ ${label}: ${image.key} (${image.width}x${image.height}, ${(image.bytes / 1024).toFixed(0)} kB)`,
    );
    return image.key;
  } catch (error) {
    failed += 1;
    console.error(`  ✗ ${label}: ${(error as Error).message}`);
    return null;
  }
}

const db = createServiceClient();

console.log(
  `seeding stock imagery${FORCE ? " (force)" : ""}${DRY ? " (dry run)" : ""}\n`,
);

/* ── Cities ──────────────────────────────────────────────────────────────── */

console.log("cities");
for (const entry of manifest.cities) {
  const { data: city } = await db
    .from("cities")
    .select("id, name, hero_key")
    .eq("slug", entry.slug)
    .maybeSingle();

  if (!city) {
    console.log(`  · ${entry.slug}: no such city, skipped`);
    skipped += 1;
    continue;
  }
  if (city.hero_key && !FORCE) {
    console.log(`  · ${entry.slug}: already has a hero, skipped`);
    skipped += 1;
    continue;
  }

  const key = await place(entry.slug, entry, "city", city.id as string);
  if (!key) continue;

  // hero_alt is not optional: lib/validation/place.ts refuses a key without it,
  // and an empty alt makes the image decorative to a screen reader.
  const { error } = await db
    .from("cities")
    .update({ hero_key: key, hero_alt: entry.alt })
    .eq("id", city.id);

  if (error) {
    failed += 1;
    console.error(`  ✗ ${entry.slug}: stored but not referenced — ${error.message}`);
  }
}

/* ── Communities ─────────────────────────────────────────────────────────── */

console.log("\ncommunities");
for (const entry of manifest.communities) {
  const { data: community } = await db
    .from("communities")
    .select("id, hero_key")
    .eq("slug", entry.slug)
    .maybeSingle();

  if (!community) {
    console.log(`  · ${entry.slug}: no such community, skipped`);
    skipped += 1;
    continue;
  }
  if (community.hero_key && !FORCE) {
    console.log(`  · ${entry.slug}: already has a hero, skipped`);
    skipped += 1;
    continue;
  }

  const key = await place(entry.slug, entry, "community", community.id as string);
  if (!key) continue;

  const { error } = await db
    .from("communities")
    .update({ hero_key: key, hero_alt: entry.alt })
    .eq("id", community.id);

  if (error) {
    failed += 1;
    console.error(`  ✗ ${entry.slug}: stored but not referenced — ${error.message}`);
  }
}

/* ── Site-level ──────────────────────────────────────────────────────────── */

console.log("\nsite");
{
  const { data: settings } = await db
    .from("site_settings")
    .select("id, hero_key, og_key")
    .eq("id", 1)
    .maybeSingle();

  if (!settings) {
    console.log("  · no site_settings row, skipped");
    skipped += manifest.site.length;
  } else {
    for (const entry of manifest.site) {
      const existing = settings[entry.target] as string | null;
      if (existing && !FORCE) {
        console.log(`  · ${entry.target}: already set, skipped`);
        skipped += 1;
        continue;
      }

      const key = await place(entry.target, entry, "site", SITE_ENTITY_ID);
      if (!key) continue;

      // Written as a branch rather than a computed key: a computed key widens
      // to `Record<string, string>`, which the generated Supabase types reject.
      const { error } = await db
        .from("site_settings")
        .update(
          entry.target === "hero_key" ? { hero_key: key } : { og_key: key },
        )
        .eq("id", 1);

      if (error) {
        failed += 1;
        console.error(`  ✗ ${entry.target}: stored but not referenced — ${error.message}`);
      }
    }
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log(`\n${stored} stored · ${skipped} skipped · ${failed} failed`);

if (failed > 0) {
  console.error(
    "\n✗ Some images failed. Anything stored but not referenced will be swept by\n" +
      "  the orphan cron within 24h — re-run to fix, or clear it from Admin → Media.",
  );
  process.exit(1);
}

if (!DRY && stored > 0) {
  console.log("\n  Confirm they render before trusting this:");
  console.log("    curl -s $BASE_URL/lake-mary | grep -o 'cities/[^\"]*-800.webp' | head -1");
}
