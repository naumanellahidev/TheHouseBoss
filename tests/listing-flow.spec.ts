import sharp from "sharp";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";

/**
 * The Phase 2 headline: a listing created with 15 photos and published, start
 * to finish, through the actual UI.
 *
 * It also proves the three places the 15-photo limit is enforced (HR3) agree:
 * the uploader refuses the 16th file, the API route refuses it, and the
 * Postgres CHECK constraint refuses it. `verify-phase2.mts` covers the API and
 * database layers directly; this covers the UI layer and the whole flow.
 *
 * Slow by nature — 15 photos are compressed in the browser and then resized
 * three times each on the server — so it gets its own file and its own timeout
 * rather than dragging the admin suite's runtime up with it.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL;

const CONFIGURED = Boolean(SUPABASE_URL && SERVICE_KEY && ADMIN_EMAIL);

const ADDRESS = `2200 Verification Way ${Date.now().toString(36)}`;

/**
 * Fifteen genuinely different photos.
 *
 * They have to differ AFTER the browser re-encodes them: the uploader
 * compresses to WebP before sending, and the server rejects a duplicate on the
 * same listing by content hash. Fifteen tiny images that happen to compress to
 * identical bytes trip that guard — which is exactly what the first run of this
 * test did, and is why the fixture is now generated with sharp instead of one
 * hand-rolled PNG with a byte poked out of it.
 *
 * Generated rather than committed, so the repo carries no binary fixtures.
 */
async function photoFiles(count: number) {
  const files: { name: string; mimeType: string; buffer: Buffer }[] = [];

  for (let i = 0; i < count; i++) {
    const hue = Math.round((360 / count) * i);
    const other = (hue + 180) % 360;
    // A distinct hue AND a distinct shape: two images differing only in a flat
    // colour can still land on the same bytes after lossy encoding.
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">` +
      `<rect width="1200" height="900" fill="hsl(${hue},70%,55%)"/>` +
      `<circle cx="${100 + i * 60}" cy="450" r="${60 + i * 12}" fill="hsl(${other},80%,40%)"/>` +
      `</svg>`;

    const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer();
    files.push({ name: `photo-${i + 1}.jpg`, mimeType: "image/jpeg", buffer });
  }

  return files;
}

test.describe("listing lifecycle", () => {
  test.skip(!CONFIGURED, "set ADMIN_TEST_EMAIL and SUPABASE_SERVICE_ROLE_KEY");
  test.use({ storageState: ADMIN_STATE });
  test.describe.configure({ mode: "serial", timeout: 300_000 });

  let listingId: string | null = null;

  test.afterAll(async () => {
    if (!CONFIGURED) return;
    // Remove the row, its media rows and its objects, whatever the test did.
    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await db.from("listings").select("id").eq("address", ADDRESS);
    for (const row of data ?? []) {
      const { data: media } = await db.from("media").select("key").eq("entity_id", row.id);
      const paths = (media ?? []).flatMap((m) =>
        [1600, 800, 400].map((size) => `${m.key}-${size}.webp`),
      );
      if (paths.length > 0) await db.storage.from("media").remove(paths);
      await db.from("media").delete().eq("entity_id", row.id);
      await db.from("listings").delete().eq("id", row.id);
    }
  });

  test("a draft is created from the basics, and photos unlock after the first save", async ({
    page,
  }) => {
    await page.goto("/admin/listings/new");

    await page.getByLabel("Street address").fill(ADDRESS);
    await page.getByLabel("ZIP").fill("32746");
    await page.getByLabel("Price").fill("625000");

    await page.getByRole("button", { name: "Save draft" }).click();

    // A successful create replaces the /new URL with the edit URL.
    await expect(page).toHaveURL(/\/admin\/listings\/[0-9a-f-]{36}\/edit/, {
      timeout: 20_000,
    });

    listingId = page.url().match(/listings\/([0-9a-f-]{36})\//)?.[1] ?? null;
    expect(listingId).toBeTruthy();

    await page.getByRole("tab", { name: "Media" }).click();
    await expect(page.getByText("0 / 15 photos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose photos" })).toBeVisible();
  });

  test("15 photos upload, and the 16th is refused with an explanation", async ({
    page,
  }) => {
    test.skip(!listingId, "the draft was not created");

    await page.goto(`/admin/listings/${listingId}/edit?tab=media`);
    await page.getByRole("tab", { name: "Media" }).click();

    await page.locator('input[type="file"]').setInputFiles(await photoFiles(15));

    await expect(page.getByText("15 / 15 photos")).toBeVisible({ timeout: 240_000 });

    // The zone disables itself WITH a reason, never in silence (UX rule 4).
    await expect(page.getByText(/This listing has all 15 photos/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose photos" })).toHaveCount(0);

    // Alt text is missing on all of them, and the count says so.
    await expect(page.getByText(/15 photos are missing alt text/)).toBeVisible();

    // Photos persist on their own shortly after landing, without an explicit
    // save — so closing the tab here would not orphan them.
    //
    // Polled against the DATABASE, not against the save indicator: the
    // indicator cannot say which write it refers to, so waiting on it passes on
    // the second-to-last save and the page closes before the last one lands.
    // That is exactly what made an earlier run persist 14 of 15.
    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await expect
      .poll(
        async () => {
          const { data } = await db
            .from("listings")
            .select("photos")
            .eq("id", listingId!)
            .single();
          return (data?.photos as unknown[] | null)?.length ?? 0;
        },
        { timeout: 30_000, message: "photos should reach the database on their own" },
      )
      .toBe(15);
  });

  test("the 16th photo is refused by the API, not only by the uploader", async ({
    page,
  }) => {
    test.skip(!listingId, "the draft was not created");

    // The uploader disables its own drop zone at 15, so this goes straight at
    // the route with the session cookie — the layer an automated client would
    // actually hit. HR3 is enforced in the UI, here, AND by a Postgres CHECK;
    // all three have to agree.
    await page.goto(`/admin/listings/${listingId}/edit`);

    const result = await page.evaluate(async (id) => {
      // A 1x1 PNG is enough: the count check runs before the image is decoded.
      const png = await fetch(
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
      ).then((r) => r.blob());

      const body = new FormData();
      body.append("file", new File([png], "sixteenth.png", { type: "image/png" }));
      body.append("entityType", "listing");
      body.append("entityId", id);

      const response = await fetch("/api/admin/upload", { method: "POST", body });
      return { status: response.status, body: await response.json() };
    }, listingId!);

    expect(result.status).toBe(409);
    expect(result.body.error).toMatch(/already has 15 photos/);
  });

  test("publish is blocked until alt text, description and meta are present", async ({
    page,
  }) => {
    test.skip(!listingId, "the draft was not created");

    await page.goto(`/admin/listings/${listingId}/edit?tab=publish`);
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

    // Every photo gets alt text.
    await page.getByRole("tab", { name: "Media" }).click();
    const altFields = page.getByPlaceholder("Kitchen with quartz island and gas range");
    const count = await altFields.count();
    for (let i = 0; i < count; i++) {
      await altFields.nth(i).fill(`Verification photo ${i + 1}`);
    }

    await page.getByRole("tab", { name: "Content" }).click();
    await page
      .getByLabel("Description")
      .fill(
        "A verification listing used by the automated Phase 2 suite. It exists only long enough to prove that a listing can be created, photographed, checked and published end to end, and it is deleted immediately afterwards.",
      );

    await page.getByRole("tab", { name: "SEO" }).click();
    await page
      .getByLabel("Meta description")
      .fill(
        "Automated verification listing for the Phase 2 admin dashboard. Deleted as soon as the test finishes.",
      );

    await page.getByRole("tab", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled({
      timeout: 15_000,
    });

    // Save explicitly and WAIT for it. Autosave is fire-and-forget by design,
    // so a test that navigates away immediately can outrun it — which is what
    // the first run of this suite did.
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.getByText("Draft saved.")).toBeVisible({ timeout: 20_000 });
  });

  test("a hard reload recovers everything that was saved", async ({ page }) => {
    test.skip(!listingId, "the draft was not created");

    // The DoD item: nothing entered above is lost across a full page load.
    await page.goto(`/admin/listings/${listingId}/edit?tab=media`);
    await expect(page.getByText("15 / 15 photos")).toBeVisible();
    await expect(page.getByText(/missing alt text/)).toHaveCount(0);

    await page.getByRole("tab", { name: "Publish" }).click();
    await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  test("publishing makes the listing live and it shows as Live in the list", async ({
    page,
  }) => {
    test.skip(!listingId, "the draft was not created");

    await page.goto(`/admin/listings/${listingId}/edit?tab=publish`);
    await page.getByRole("button", { name: "Publish" }).click();

    await expect(page.getByText("Listing published.")).toBeVisible({ timeout: 20_000 });

    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await db
      .from("listings")
      .select("published, published_at, photos, slug")
      .eq("id", listingId!)
      .single();

    expect(data?.published).toBe(true);
    expect(data?.published_at).toBeTruthy();
    expect((data?.photos as unknown[]).length).toBe(15);

    // Every photo carries alt text and an order index — the order IS the array
    // index, so the first entry is the cover.
    const photos = data!.photos as { alt: string; order: number; key: string }[];
    expect(photos.every((p) => p.alt.trim().length > 0)).toBe(true);
    expect(photos.map((p) => p.order)).toEqual([...Array(15).keys()]);

    // Exactly three objects per photo, one media row per photo.
    const { data: media } = await db
      .from("media")
      .select("key, variants")
      .eq("entity_id", listingId!);
    expect(media?.length).toBe(15);
    expect(media?.every((m) => (m.variants as number[]).length === 3)).toBe(true);

    // ResponsiveTable renders the card list AND the table, hiding one by CSS,
    // so the address matches more than once. .first() is the visible one.
    await page.goto("/admin/listings?q=Verification");
    await expect(
      page.getByRole("link", { name: ADDRESS, exact: true }).first(),
    ).toBeVisible();
  });

  test("deleting requires typing the address", async ({ page }) => {
    test.skip(!listingId, "the draft was not created");

    await page.goto("/admin/listings?q=Verification");
    await page.getByRole("button", { name: `Delete ${ADDRESS}` }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    const confirm = dialog.getByRole("button", { name: "Delete" });
    await expect(confirm).toBeDisabled();

    await dialog.getByRole("textbox").fill("not the address");
    await expect(confirm).toBeDisabled();

    await dialog.getByRole("textbox").fill(ADDRESS);
    await expect(confirm).toBeEnabled();

    await confirm.click();
    await expect(page.getByText("Listing deleted.")).toBeVisible({ timeout: 20_000 });
  });
});
