#!/usr/bin/env node
/**
 * Phase 2 verification — runs the real pipeline against the real project.
 *
 * This is not a unit test. It calls the same modules the upload route, the
 * purge cron and the orphan cron call, against the live Supabase bucket, and
 * asserts the outcomes the Phase 2 Definition of Done names:
 *
 *   1. one upload produces exactly THREE objects and ONE media row
 *   2. no original is stored — the bucket holds only the three WebP derivatives
 *   3. the 16th photo is rejected by the Postgres CHECK constraint (HR3)
 *   4. the sold purge deletes 1600w + 800w and KEEPS 400w (HR10)
 *   5. the orphan sweep finds and deletes a deliberately orphaned object
 *   6. storage_usage() matches the sum of the media rows
 *
 * Everything it creates is namespaced under a throwaway listing and deleted at
 * the end, including on failure.
 *
 *   npm run verify:p2
 */
import { randomUUID } from "node:crypto";

import sharp from "sharp";

import { processImage } from "@/lib/images/process";
import { findOrphans, sweepOrphans } from "@/lib/images/orphans";
import { purgeSoldPhotos } from "@/lib/images/purge";
import { deleteImages, storeImage } from "@/lib/images/store";
import { getStorageUsage } from "@/lib/queries/media";
import { storage } from "@/lib/storage";
import { createServiceClient } from "@/lib/supabase/service";

let passed = 0;
let failed = 0;

function check(label: string, condition: boolean, detail?: string) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failed += 1;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

/** A real JPEG, generated rather than committed, so the repo carries no fixture. */
async function makeSourceImage(seed: number): Promise<Buffer> {
  return sharp({
    create: {
      width: 2000,
      height: 1500,
      channels: 3,
      background: { r: (seed * 37) % 255, g: (seed * 91) % 255, b: 120 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();
}

const db = createServiceClient();
let listingId: string | null = null;
const createdKeys: string[] = [];

try {
  /* ── setup: a throwaway listing to hang photos off ────────────────────── */
  const { data: city } = await db.from("cities").select("id").limit(1).single();
  if (!city) throw new Error("no cities in the database — run npm run db:seed");

  const suffix = randomUUID().slice(0, 8);
  const { data: listing, error: listingError } = await db
    .from("listings")
    .insert({
      slug: `verify-p2-${suffix}`,
      address: `Verification Property ${suffix}`,
      city_id: city.id,
      price: 500000,
      status: "active",
      published: false,
    })
    .select("id, slug")
    .single();

  if (listingError || !listing) {
    throw new Error(`could not create the test listing: ${listingError?.message}`);
  }
  listingId = listing.id;
  console.log(`\nusing throwaway listing ${listing.slug}\n`);

  /* ── 1. derivatives ───────────────────────────────────────────────────── */
  console.log("1. image processing");
  const source = await makeSourceImage(1);
  const processed = await processImage(source);

  check("produces exactly three derivatives", processed.derivatives.length === 3);
  check(
    "sizes are 1600 / 800 / 400",
    processed.derivatives.map((d) => d.size).join(",") === "1600,800,400",
  );
  check(
    "the largest derivative is 1600px wide",
    processed.width === 1600,
    `got ${processed.width}`,
  );
  check(
    "every derivative is smaller than the source",
    processed.derivatives.every((d) => d.bytes < source.byteLength),
  );
  check(
    "a blur placeholder is produced as a WebP data URL",
    processed.blur.startsWith("data:image/webp;base64,"),
  );
  check(
    "the blur placeholder is tiny (under 2 kB)",
    processed.blur.length < 2048,
    `${processed.blur.length} chars`,
  );

  // EXIF must be gone: sharp reports no exif on the output buffer.
  const outMeta = await sharp(processed.derivatives[0]!.buffer).metadata();
  check("EXIF is stripped from the output", !outMeta.exif);
  check("output format is WebP", outMeta.format === "webp");

  /* ── 2. store: three objects + one row, no original ───────────────────── */
  console.log("\n2. storage and accounting");
  const stored = await storeImage({
    buffer: source,
    entityType: "listing",
    entityId: listingId,
  });
  createdKeys.push(stored.key);

  const objects = await storage.list(`listings/${listingId}`);
  check(
    "exactly three objects were written",
    objects.length === 3,
    `found ${objects.length}: ${objects.join(", ")}`,
  );
  check(
    "the objects are the three expected variants",
    [1600, 800, 400].every((size) =>
      objects.some((path) => path.endsWith(`${stored.key.split("/").pop()}-${size}.webp`)),
    ),
  );
  check(
    "no original is stored — every object is .webp",
    objects.every((path) => path.endsWith(".webp")),
  );

  const { data: mediaRows } = await db
    .from("media")
    .select("id, key, variants, bytes, width, height, content_hash")
    .eq("entity_id", listingId);

  check("exactly one media row was written", (mediaRows ?? []).length === 1);
  check(
    "the media row records all three variants",
    (mediaRows?.[0]?.variants ?? []).join(",") === "1600,800,400",
  );
  check(
    "the media row records the dimensions (HR7, zero CLS)",
    mediaRows?.[0]?.width === 1600 && Number(mediaRows?.[0]?.height) > 0,
  );
  check(
    "the key contains no size suffix and no extension (HR1)",
    !/-(1600|800|400)\.webp$/.test(stored.key),
  );
  check(
    "the key is not derived from the address (HR4)",
    !stored.key.toLowerCase().includes("verification"),
  );

  /* ── 3. duplicate rejection ───────────────────────────────────────────── */
  console.log("\n3. duplicate detection");
  let duplicateRejected = false;
  try {
    await storeImage({ buffer: source, entityType: "listing", entityId: listingId });
  } catch (error) {
    duplicateRejected = error instanceof Error && /already on this listing/i.test(error.message);
  }
  check("the same photo twice on one listing is refused", duplicateRejected);

  /* ── 4. the 15-photo ceiling, at the database layer (HR3) ─────────────── */
  console.log("\n4. photo limit (database layer)");
  const fakePhotos = Array.from({ length: 16 }, (_, i) => ({
    kind: "stored",
    key: `listings/${listingId}/limit-${i}`,
    w: 1600,
    h: 1200,
    alt: `Photo ${i}`,
  }));

  const { error: sixteenError } = await db
    .from("listings")
    .update({ photos: fakePhotos })
    .eq("id", listingId);

  check(
    "the 16th photo is rejected by the CHECK constraint",
    Boolean(sixteenError) && /photo_limit/.test(sixteenError?.message ?? ""),
    sixteenError ? sixteenError.message.slice(0, 80) : "the update SUCCEEDED",
  );

  const { error: fifteenError } = await db
    .from("listings")
    .update({ photos: fakePhotos.slice(0, 15) })
    .eq("id", listingId);
  check("exactly 15 photos is accepted", !fifteenError);

  /* ── 5. publishing rules at the database layer ────────────────────────── */
  console.log("\n5. publish constraints (database layer)");
  const { error: emptyPublishError } = await db
    .from("listings")
    .update({ photos: [], published: true })
    .eq("id", listingId);
  check(
    "publishing with no photos is rejected (HR6)",
    Boolean(emptyPublishError),
    emptyPublishError ? undefined : "the update SUCCEEDED",
  );

  /* ── 6. sold purge: 1600 + 800 go, 400 stays (HR10) ───────────────────── */
  console.log("\n6. sold-photo purge");
  const soldAt = new Date(Date.now() - 10 * 86_400_000).toISOString();
  const realPhoto = {
    kind: "stored",
    key: stored.key,
    w: stored.width,
    h: stored.height,
    alt: "Verification photo",
  };

  const { error: soldError } = await db
    .from("listings")
    .update({
      photos: [realPhoto],
      status: "sold",
      sold_at: soldAt,
      sold_price: 495000,
      keep_photos: false,
      photos_purged: false,
    })
    .eq("id", listingId);
  if (soldError) throw new Error(`could not mark the listing sold: ${soldError.message}`);

  const { data: afterSold } = await db
    .from("listings")
    .select("purge_after")
    .eq("id", listingId)
    .single();
  check(
    "the trigger set purge_after to sold_at + 7 days",
    Boolean(afterSold?.purge_after) &&
      Math.abs(
        new Date(afterSold!.purge_after as string).getTime() -
          (new Date(soldAt).getTime() + 7 * 86_400_000),
      ) < 60_000,
  );

  const purge = await purgeSoldPhotos();
  check("the purge processed at least this listing", purge.listings >= 1);

  const afterPurge = await storage.list(`listings/${listingId}`);
  check(
    "the 1600w is gone",
    !afterPurge.some((path) => path.endsWith("-1600.webp")),
    afterPurge.join(", "),
  );
  check("the 800w is gone", !afterPurge.some((path) => path.endsWith("-800.webp")));
  check(
    "the 400w SURVIVES (HR10)",
    afterPurge.some((path) => path.endsWith("-400.webp")),
    afterPurge.join(", "),
  );

  const { data: purgedListing } = await db
    .from("listings")
    .select("id, slug, photos_purged, photos")
    .eq("id", listingId)
    .single();
  check("the listing row still exists (HR10)", Boolean(purgedListing));
  check("photos_purged is now true", purgedListing?.photos_purged === true);
  check(
    "the photo record survives, so the page still renders",
    Array.isArray(purgedListing?.photos) && purgedListing!.photos.length === 1,
  );

  const { data: purgedMedia } = await db
    .from("media")
    .select("variants, bytes")
    .eq("key", stored.key)
    .single();
  check(
    "the media row now records only the 400w variant",
    (purgedMedia?.variants ?? []).join(",") === "400",
  );
  check(
    "the media row's byte count shrank with it",
    Number(purgedMedia?.bytes ?? 0) < stored.bytes,
    `${purgedMedia?.bytes} vs ${stored.bytes}`,
  );

  /* ── 7. orphan sweep ──────────────────────────────────────────────────── */
  console.log("\n7. orphan sweep");
  const orphanKey = `listings/${listingId}/orphan-test`;
  const orphanImage = await processImage(await makeSourceImage(2));
  await storage.upload({
    buffer: orphanImage.derivatives[2]!.buffer,
    path: `${orphanKey}-400.webp`,
    contentType: "image/webp",
  });

  const report = await findOrphans();
  check(
    "an object with no media row is detected",
    report.strayObjects.includes(`${orphanKey}-400.webp`),
    `saw ${report.strayObjects.length} stray objects`,
  );
  check(
    "recent uploads are protected by the 24h window",
    report.strayRows.every((row) => row.key !== stored.key),
  );

  const swept = await sweepOrphans(report);
  check("the sweep deleted at least the planted object", swept.objectsDeleted >= 1);
  check(
    "the planted object is gone from the bucket",
    !(await storage.exists(`${orphanKey}-400.webp`)),
  );

  /* ── 8. storage accounting ────────────────────────────────────────────── */
  console.log("\n8. storage accounting");
  const usage = await getStorageUsage();
  const { data: allMedia } = await db.from("media").select("bytes");
  const sum = (allMedia ?? []).reduce((n, row) => n + Number(row.bytes ?? 0), 0);

  check(
    "storage_usage() matches the sum of the media rows",
    usage.totalBytes === sum,
    `rpc ${usage.totalBytes} vs sum ${sum}`,
  );
  check("the 1 GB ceiling is reported", usage.limitBytes === 1_073_741_824);
} catch (error) {
  failed += 1;
  console.error(`\n✗ verification aborted: ${error instanceof Error ? error.message : error}`);
} finally {
  /* ── teardown ───────────────────────────────────────────────────────────── */
  if (createdKeys.length > 0) await deleteImages(createdKeys).catch(() => {});
  if (listingId) {
    const leftovers = await storage.list(`listings/${listingId}`).catch(() => []);
    if (leftovers.length > 0) await storage.deleteMany(leftovers).catch(() => {});
    await db.from("media").delete().eq("entity_id", listingId);
    await db.from("listings").delete().eq("id", listingId);
    console.log(`\ncleaned up the throwaway listing`);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
