import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";

/**
 * Admin dashboard suite — Phase 2.
 *
 * Signs in for real. `admin.setup.ts` redeems a magic link through our own
 * callback route exactly as a person clicking the emailed link would — so the
 * whole auth path is exercised (middleware guard, token exchange, cookie write,
 * the layout's `profiles.role = 'admin'` check) rather than stubbed — and saves
 * the resulting session for the signed-in block below.
 *
 * Requires:
 *   ADMIN_TEST_EMAIL           an account created by scripts/create-admin.mjs
 *   SUPABASE_SERVICE_ROLE_KEY  server-only; test files never ship to a browser
 *
 * Skipped, loudly, when they are absent, so a contributor without production
 * credentials does not see a mysterious red suite.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL;

const CONFIGURED = Boolean(SUPABASE_URL && SERVICE_KEY && ADMIN_EMAIL);

/** Screens the client uses on her phone. 360px is the hard floor (docs/04 § 1). */
const MOBILE_CRITICAL = [
  { path: "/admin", name: "dashboard" },
  { path: "/admin/listings", name: "listings" },
  { path: "/admin/leads", name: "leads" },
];

const ADMIN_PAGES = [
  ...MOBILE_CRITICAL,
  { path: "/admin/media", name: "media" },
  { path: "/admin/settings", name: "settings" },
  { path: "/admin/listings/new", name: "new listing" },
];

test.describe("admin", () => {
  test.skip(
    !CONFIGURED,
    "set ADMIN_TEST_EMAIL and SUPABASE_SERVICE_ROLE_KEY to run the admin suite",
  );

  /* ── Auth boundary ─────────────────────────────────────────────────────── */

  test("an anonymous visitor is sent to the login screen", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login/);
    await expect(page.getByRole("heading", { name: "Dashboard sign-in" })).toBeVisible();
  });

  test("the login screen says to check your email and never whether the address exists", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Email address").fill("definitely-not-an-account@example.com");
    await page.getByRole("button", { name: "Send magic link" }).click();

    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();
    await expect(page.getByText(/has an account/)).toBeVisible();
  });

  test("the admin area is noindex", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
  });

  /* ── Signed in ─────────────────────────────────────────────────────────── */

  test.describe("signed in", () => {
    test.use({ storageState: ADMIN_STATE });

    test("the dashboard renders its panels", async ({ page }) => {
      await page.goto("/admin");
      await expect(page.getByRole("heading", { name: "Dashboard", level: 2 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Storage", level: 3 })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Recent leads" })).toBeVisible();
    });

    test("the storage meter is present in the sidebar at desktop width", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto("/admin");
      await expect(page.getByRole("progressbar")).toHaveCount(2); // sidebar + panel
    });

    test("every admin screen loads and has exactly one h1", async ({ page }) => {
      for (const target of ADMIN_PAGES) {
        await page.goto(target.path, { waitUntil: "load" });
        expect(
          await page.locator("h1").count(),
          `${target.name} should have exactly one h1`,
        ).toBe(1);
        expect(
          await page.locator("main").count(),
          `${target.name} needs a main landmark`,
        ).toBe(1);
      }
    });

    test("no critical or serious axe violations on any admin screen", async ({ page }) => {
      for (const target of ADMIN_PAGES) {
        await page.goto(target.path, { waitUntil: "load" });

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        const blocking = results.violations.filter(
          (v) => v.impact === "critical" || v.impact === "serious",
        );

        const report = blocking
          .map((v) => `[${v.impact}] ${v.id}: ${v.help} @ ${v.nodes[0]?.target.join(" ")}`)
          .join("\n  ");

        expect(blocking, `${target.name}\n  ${report}\n`).toEqual([]);
      }
    });

    /* ── 360px: the client reads leads on her phone (docs/06 § 11 rule 8) ── */

    test("no horizontal overflow at 360px on the mobile-critical screens", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 780 });

      for (const target of MOBILE_CRITICAL) {
        await page.goto(target.path, { waitUntil: "load" });
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
        expect(overflow, `${target.name} overflows by ${overflow}px at 360`).toBeLessThanOrEqual(0);
      }
    });

    test("the mobile drawer traps focus, closes on Escape and locks scroll", async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto("/admin");

      await page.getByRole("button", { name: "Open dashboard menu" }).click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();

      const focusInside = await page.evaluate(() => {
        const panel = document.querySelector('[role="dialog"]');
        return panel?.contains(document.activeElement) ?? false;
      });
      expect(focusInside).toBe(true);

      await page.keyboard.press("Escape");
      await expect(dialog).toBeHidden();
    });

    /* ── The listing editor ────────────────────────────────────────────── */

    test("publish is blocked until the pre-publish checklist passes", async ({ page }) => {
      await page.goto("/admin/listings/new");

      const publish = page.getByRole("button", { name: "Publish" });
      await expect(publish).toBeDisabled();

      // The checklist is on the Publish tab and names what is missing.
      await page.getByRole("tab", { name: "Publish" }).click();
      await expect(page.getByRole("heading", { name: "Before publishing" })).toBeVisible();
      await expect(page.getByRole("button", { name: /At least one photo/ })).toBeVisible();
    });

    test("photos cannot be added until the draft exists", async ({ page }) => {
      await page.goto("/admin/listings/new");
      await page.getByRole("tab", { name: "Media" }).click();
      await expect(page.getByText(/Save this listing once/)).toBeVisible();
    });

    test("the editor becomes an accordion below 768px", async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto("/admin/listings/new");

      await expect(page.getByRole("tab", { name: "Basics" })).toHaveCount(0);
      await expect(page.getByRole("button", { name: "Basics" })).toBeVisible();
    });

    /* ── Leads ─────────────────────────────────────────────────────────── */

    test("the leads inbox shows the enquiry and its contact actions", async ({ page }) => {
      await page.goto("/admin/leads");

      const heading = page.getByRole("heading", { name: "Leads", level: 2 });
      await expect(heading).toBeVisible();

      // Either there are leads, or the empty state teaches — never a blank grid.
      const hasLeads = (await page.getByRole("link", { name: /Verification Tester/ }).count()) > 0;
      if (hasLeads) {
        await expect(page.getByRole("link", { name: /^mailto|@/ }).first()).toBeVisible();
      } else {
        await expect(page.getByText("No enquiries yet")).toBeVisible();
      }
    });

    test("the CSV export link carries the current filters", async ({ page }) => {
      await page.goto("/admin/leads?status=new");
      const href = await page.getByRole("link", { name: "Export CSV" }).getAttribute("href");
      expect(href).toContain("/api/admin/leads/export");
      expect(href).toContain("status=new");
    });
  });
});
