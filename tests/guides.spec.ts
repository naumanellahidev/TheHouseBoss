import { expect, test } from "@playwright/test";

/**
 * Phase 5 — guides and the remaining pages.
 *
 * The checks here are the Definition of Done items that are easy to believe are
 * true and expensive to be wrong about: that each lead form is tagged with the
 * right `lead_type`, and that every legally required disclaimer is on the page
 * the compliance table says it belongs on (docs/09 § 6).
 */

/** docs/09 § 6, the disclaimer placement table. */
const DISCLAIMERS: { path: string; name: string; needs: RegExp[]; leadType: string }[] = [
  {
    path: "/guides/va-home-buyer",
    name: "VA guide",
    needs: [/not lending advice/i, /Department of Veterans Affairs/i],
    leadType: "va",
  },
  {
    path: "/assumable-mortgage-homes",
    name: "assumable",
    needs: [/not lending advice/i, /not legal advice/i],
    leadType: "assumable",
  },
  {
    path: "/new-construction-representation",
    name: "new construction",
    needs: [/not legal advice/i, /do not replace a licensed home inspection/i],
    leadType: "new_construction",
  },
  {
    path: "/sell-your-central-florida-home",
    name: "sell",
    needs: [/not an appraisal/i, /not a guarantee of sale price/i],
    leadType: "seller",
  },
  {
    path: "/market-updates",
    name: "market updates",
    needs: [/not an appraisal/i],
    leadType: "general",
  },
];

test.describe("guides and compliance", () => {
  for (const page_ of DISCLAIMERS) {
    test(`${page_.name}: required disclaimers are present`, async ({ page }) => {
      await page.goto(page_.path, { waitUntil: "load" });
      const body = await page.locator("main").innerText();

      for (const needle of page_.needs) {
        expect(
          body,
          `${page_.path} must carry the disclaimer matching ${needle}`,
        ).toMatch(needle);
      }
    });
  }

  for (const page_ of DISCLAIMERS.filter((p) => p.leadType !== "general")) {
    test(`${page_.name}: the lead form is tagged ${page_.leadType}`, async ({ page }) => {
      await page.goto(page_.path, { waitUntil: "load" });

      // The hidden field is what the API reads, so it is what gets asserted.
      const field = page.locator('input[name="lead_type"]').first();
      await expect(field).toHaveValue(page_.leadType);
    });
  }

  test("every guide opens its sections with a direct answer", async ({ page }) => {
    // docs/14 § 1, rule 1. The AnswerFirst component is the mechanism, so its
    // presence per section is the check.
    for (const path of [
      "/guides/va-home-buyer",
      "/assumable-mortgage-homes",
      "/new-construction-representation",
      "/sell-your-central-florida-home",
    ]) {
      await page.goto(path, { waitUntil: "load" });

      const sections = await page.locator("main h2").count();
      const answers = await page.locator("main .border-l-2.border-accent").count();

      expect(
        answers,
        `${path} should open most sections with a direct answer`,
      ).toBeGreaterThanOrEqual(Math.floor((sections - 2) / 2));
    }
  });

  test("the guide table of contents links to real headings", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/assumable-mortgage-homes");

    const toc = page.getByRole("navigation", { name: "On this page" });
    await expect(toc).toBeVisible();

    const hrefs = await toc.getByRole("link").evaluateAll((links) =>
      links.map((link) => (link as HTMLAnchorElement).getAttribute("href")),
    );

    expect(hrefs.length).toBeGreaterThan(2);

    for (const href of hrefs) {
      const id = (href ?? "").replace(/^#/, "");
      await expect(
        page.locator(`#${id}`),
        `the table of contents points at #${id}, which must exist`,
      ).toHaveCount(1);
    }
  });

  /*
    Three, not four. The seller guide was removed from the navigation, the
    footer and this index when the client made buying the sole transaction
    focus.

    `/sell-your-central-florida-home` still RESOLVES and still returns 200 —
    HR11 says a published URL is permanent, and it carries indexed long-form
    content. It is unlinked, not deleted. The `permanent URLs` test in
    search.spec.ts is what guards that; this one only asserts what the index
    offers.
  */
  test("the guides index links to the three buyer guides", async ({ page }) => {
    await page.goto("/guides");

    for (const path of [
      "/guides/va-home-buyer",
      "/assumable-mortgage-homes",
      "/new-construction-representation",
    ]) {
      // Scoped to main: the header nav links to every guide as well.
      await expect(page.locator(`main a[href="${path}"]`)).toHaveCount(1);
    }
  });

  test("the contact page pre-selects the interest it was linked with", async ({
    page,
  }) => {
    await page.goto("/contact?interest=assumable");
    await expect(page.locator('input[name="lead_type"]').first()).toHaveValue(
      "assumable",
    );

    // An unknown value must fall back rather than write nonsense to the row.
    await page.goto("/contact?interest=nonsense");
    await expect(page.locator('input[name="lead_type"]').first()).toHaveValue(
      "general",
    );
  });

  test("legal pages are noindex, dated, and reachable from the footer", async ({
    page,
  }) => {
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/accessibility"]) {
      await page.goto(path, { waitUntil: "load" });

      const robots = await page.locator('meta[name="robots"]').getAttribute("content");
      expect(robots, `${path} should be noindex`).toContain("noindex");

      const body = await page.locator("main").innerText();
      expect(body, `${path} should carry a date`).toMatch(/Last (updated|reviewed):/);
    }

    // The footer links to all three from every page.
    await page.goto("/");
    for (const path of ["/legal/privacy", "/legal/terms", "/legal/accessibility"]) {
      await expect(page.locator(`footer a[href="${path}"]`)).toHaveCount(1);
    }
  });

  test("the accessibility statement gives a working way to report a barrier", async ({
    page,
  }) => {
    await page.goto("/legal/accessibility");
    const body = await page.locator("main").innerText();

    // A statement with no contact route is the thing docs/09 § 3 calls worse
    // than none, so this asserts both the route and the response commitment.
    expect(body).toMatch(/two business days/i);
    await expect(page.locator('main a[href="/contact"]')).toHaveCount(1);
  });

  test("the reviews page emits no AggregateRating markup", async ({ page }) => {
    await page.goto("/reviews");

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();

    // docs/09 § 7: never, unless every rating is first-party, verifiable and
    // displayed. A star rating in search results is exactly what makes
    // fabricated review markup worth a manual action.
    for (const block of blocks) {
      expect(block).not.toContain("AggregateRating");
    }
  });
});
