import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Public listings and search — the Phase 3 Definition of Done.
 *
 * Everything here runs against the seeded listings, which deliberately cover
 * every status and listing type including a sold-and-purged one.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

test.describe("search", () => {
  test("the bare search page lists homes and announces the count", async ({ page }) => {
    await page.goto("/search");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Central Florida homes for sale",
    );

    // The count is in a live region, not just painted on screen.
    const count = page.locator("[aria-live='polite']").first();
    await expect(count).toBeVisible();
    await expect(count).toContainText(/home/);

    await expect(page.getByRole("article").first()).toBeVisible();
  });

  test("a filter combination produces a shareable URL that reproduces itself", async ({
    page,
    context,
  }) => {
    await page.goto("/search");

    // Apply a city through the real control, not by typing a URL.
    await page.getByLabel("Filter by city").selectOption("lake-mary");
    await expect(page).toHaveURL(/city=lake-mary/);

    await page.getByRole("button", { name: "3+", exact: true }).first().click();
    await expect(page).toHaveURL(/beds=3/);

    const shared = page.url();

    // The same URL in a brand-new tab shows the same filters applied.
    const other = await context.newPage();
    await other.goto(shared);
    await expect(other.getByLabel("Filter by city")).toHaveValue("lake-mary");
    await expect(
      other.getByRole("button", { name: "3+", exact: true }).first(),
    ).toHaveAttribute("aria-pressed", "true");
    await other.close();
  });

  test("back and forward restore the previous filter state", async ({ page }) => {
    await page.goto("/search");

    await page.getByLabel("Filter by city").selectOption("lake-mary");
    await expect(page).toHaveURL(/city=lake-mary/);

    await page.getByLabel("Filter by city").selectOption("sanford");
    await expect(page).toHaveURL(/city=sanford/);

    await page.goBack();
    await expect(page).toHaveURL(/city=lake-mary/);
    await expect(page.getByLabel("Filter by city")).toHaveValue("lake-mary");

    await page.goForward();
    await expect(page).toHaveURL(/city=sanford/);
    await expect(page.getByLabel("Filter by city")).toHaveValue("sanford");
  });

  test("filter options are facet-driven, and a zero-count option is disabled not hidden", async ({
    page,
  }) => {
    // The full option set lives in the mobile sheet; the desktop bar shows a
    // condensed inline version. Both read the same facets.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/search");
    await page.getByRole("button", { name: "Filters" }).click();

    // Every listing type from the database appears, each with its live count.
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByRole("button", { name: /New construction/ })).toBeVisible();

    // The seed has no land listing, so that option must still be there —
    // disabled, with its zero — rather than quietly missing (HR22).
    //
    // Scoped to the Property type group: "Land" is legitimately BOTH a listing
    // type and a property type in the schema, so an unscoped name matches twice.
    const land = sheet
      .getByRole("group", { name: "Property type" })
      .getByRole("button", { name: /^Land/ });
    await expect(land).toBeVisible();
    await expect(land).toBeDisabled();
  });

  test("a zero-result search offers the three recovery actions", async ({ page }) => {
    // A price band nothing can match.
    await page.goto("/search?min=90000000&max=99000000");

    await expect(page.getByText("No homes match these filters")).toBeVisible();
    await expect(page.getByRole("link", { name: "Widen the price range" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Clear all filters" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Get alerts for new listings" }),
    ).toBeVisible();

    // "Widen" actually widens, rather than being a button that changes nothing.
    await page.getByRole("link", { name: "Widen the price range" }).click();
    await expect(page).toHaveURL(/min=45000000/);
  });

  test("new construction is its own URL with the type locked on", async ({ page }) => {
    await page.goto("/search/new-construction");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "New construction",
    );
    await expect(page.getByText(/Register me before your first site visit/)).toBeVisible();

    // The type filter is the page, so the bar does not offer it.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload();
    await page.getByRole("button", { name: "Filters" }).click();
    await expect(
      page.getByRole("dialog").getByRole("button", { name: /New construction \(/ }),
    ).toHaveCount(0);
  });

  test("the city page locks the city and keeps a clean URL", async ({ page }) => {
    await page.goto("/lake-mary/homes-for-sale");

    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Homes for sale in Lake Mary",
    );
    await expect(page.getByLabel("Filter by city")).toHaveCount(0);

    await page.getByRole("button", { name: "3+", exact: true }).first().click();
    await expect(page).toHaveURL(/\/lake-mary\/homes-for-sale\?beds=3/);
  });

  test("an unknown city returns a real 404, not a page saying 404", async ({ page }) => {
    const response = await page.goto("/not-a-city/homes-for-sale");
    expect(response?.status()).toBe(404);
  });
});

test.describe("listing detail", () => {
  test("renders price, facts, description and the contact card", async ({ page }) => {
    await page.goto("/listing/123-lakeview-dr-lake-mary");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Lakeview");
    await expect(page.getByText("$525,000").first()).toBeVisible();
    await expect(page.getByText("Beds", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Location" })).toBeVisible();
  });

  test("emits RealEstateListing structured data with an Offer", async ({ page }) => {
    await page.goto("/listing/123-lakeview-dr-lake-mary");

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const graphs = blocks.map((b) => JSON.parse(b));
    const listing = graphs.find((g) => g["@type"] === "RealEstateListing");

    expect(listing, "a RealEstateListing graph should be present").toBeTruthy();
    expect(listing.offers.priceCurrency).toBe("USD");
    expect(listing.offers.availability).toContain("InStock");
    expect(listing.mainEntity["@type"]).toBeTruthy();

    const breadcrumbs = graphs.find((g) => g["@type"] === "BreadcrumbList");
    expect(breadcrumbs).toBeTruthy();
  });

  test("a sold, purged listing still resolves and explains itself", async ({ page }) => {
    const response = await page.goto("/listing/41-longwood-oaks-ave-longwood");

    // HR10/HR11: the page survives the purge.
    expect(response?.status()).toBe(200);
    await expect(page.getByText(/Photos archived/)).toBeVisible();
    await expect(page.getByText(/^Sold on/)).toBeVisible();

    // A sold listing offers "something similar" rather than a showing request.
    await expect(
      page.getByRole("link", { name: "Find me something similar" }).first(),
    ).toBeVisible();

    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const listing = blocks.map((b) => JSON.parse(b)).find((g) => g["@type"] === "RealEstateListing");
    expect(listing.offers.availability).toContain("SoldOut");
  });

  test("a missing listing returns a real 404", async ({ page }) => {
    const response = await page.goto("/listing/no-such-listing-anywhere");
    expect(response?.status()).toBe(404);
  });

  test("the gallery lightbox is keyboard operable and returns focus on close", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/listing/123-lakeview-dr-lake-mary");

    const trigger = page.getByRole("button", { name: /Open the gallery/ });
    await trigger.focus();
    await page.keyboard.press("Enter");

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Focus is inside the dialog, not left behind on the page.
    expect(
      await page.evaluate(
        () => document.querySelector('[role="dialog"]')?.contains(document.activeElement) ?? false,
      ),
    ).toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    // Focus RETURNS to the trigger — the item most often missed.
    await expect(trigger).toBeFocused();
  });
});

test.describe("sold archive", () => {
  test("lists sold homes and filters by city", async ({ page }) => {
    await page.goto("/sold");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Recently sold");
    await expect(page.getByRole("link", { name: "Longwood", exact: true })).toBeVisible();

    await page.getByRole("link", { name: "Longwood", exact: true }).click();
    await expect(page).toHaveURL(/city=longwood/);
    await expect(page.getByRole("article").first()).toBeVisible();
  });
});

/**
 * HR11 end to end: changing a live slug writes a redirect row via the database
 * trigger, and the old URL then serves it.
 */
test.describe("permanent URLs", () => {
  test.skip(!SUPABASE_URL || !SERVICE_KEY, "needs SUPABASE_SERVICE_ROLE_KEY");

  const OLD = "hr11-probe-old";
  const NEW = "hr11-probe-new";

  test("editing a published slug redirects the old URL", async ({ page }) => {
    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    await db.from("listings").delete().in("slug", [OLD, NEW]);
    await db.from("redirects").delete().eq("from_path", `/listing/${OLD}`);

    const { data: city } = await db.from("cities").select("id").limit(1).single();
    const { data: created } = await db
      .from("listings")
      .insert({
        slug: OLD,
        address: "HR11 Probe",
        city_id: city!.id,
        price: 1,
        status: "active",
        published: true,
        photos: [
          {
            kind: "external",
            url: "/placeholder-property.svg",
            w: 1600,
            h: 1200,
            alt: "probe",
          },
        ],
      })
      .select("id")
      .single();

    try {
      // Deliberately NOT visited before the rename. The listing page is ISR
      // cached, so a warm-up request would leave a 200 in the cache for the old
      // path and mask the redirect. In the app this cannot happen: the admin
      // save action revalidates the OLD path explicitly whenever a slug changes
      // (see saveListing in the listings actions).

      // The trigger writes the redirect; nothing in application code does.
      await db.from("listings").update({ slug: NEW }).eq("id", created!.id);

      const { data: rows } = await db
        .from("redirects")
        .select("to_path, status_code")
        .eq("from_path", `/listing/${OLD}`);

      expect(rows?.[0]?.to_path).toBe(`/listing/${NEW}`);

      // The old URL now serves a permanent redirect. Next answers 308, which
      // Google treats exactly as 301 and which preserves the method.
      const response = await page.goto(`/listing/${OLD}`);
      expect(response?.status()).toBe(200); // followed
      expect(page.url()).toContain(`/listing/${NEW}`);
    } finally {
      await db.from("listings").delete().eq("id", created!.id);
      await db.from("redirects").delete().eq("from_path", `/listing/${OLD}`);
    }
  });
});
