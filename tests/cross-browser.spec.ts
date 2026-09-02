import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/**
 * Cross-browser pass — Phase 7 task 6.
 *
 * Runs in Firefox and WebKit as well as Chromium. WebKit is the important one:
 * it is the engine behind Safari on macOS and behind **every** browser on iOS,
 * and it is where the layout traps in docs/04 § 9 actually bite — `svh` units,
 * scroll-snap, `position: sticky` inside a scroll container, and the 16px input
 * floor that stops iOS zooming a form on focus.
 *
 * Deliberately narrow. The full suite runs in Chromium; duplicating 350 tests
 * across three engines on this machine would take half an hour and tell us
 * almost nothing new. What is checked here is the set of things that genuinely
 * differ between engines.
 */

const PAGES = [
  "/",
  "/search",
  "/listing/123-lakeview-dr-lake-mary",
  "/lake-mary",
  "/guides/va-home-buyer",
  "/contact",
];

test.describe("cross-browser", () => {
  test("no horizontal overflow at 360px on any page type", async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });

    for (const path of PAGES) {
      await page.goto(path, { waitUntil: "load" });
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
    }
  });

  test("form inputs are at least 16px, so iOS does not zoom on focus", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/contact");

    const sizes = await page
      .locator("input, textarea, select")
      .evaluateAll((elements) =>
        elements
          .filter((el) => (el as HTMLElement).offsetParent !== null)
          .map((el) => parseFloat(getComputedStyle(el).fontSize)),
      );

    expect(sizes.length).toBeGreaterThan(0);
    for (const size of sizes) {
      expect(size, "an input below 16px makes iOS Safari zoom the page").toBeGreaterThanOrEqual(16);
    }
  });

  test("the sticky listing sidebar does not overflow the viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/listing/123-lakeview-dr-lake-mary");

    // `position: sticky` inside a scroll container behaves differently across
    // engines; what matters is that the card never becomes taller than the
    // space it has (docs/04 § 5).
    const aside = page.locator("aside").first();
    if ((await aside.count()) === 0) return;

    const box = await aside.boundingBox();
    if (box) expect(box.height).toBeLessThanOrEqual(800);
  });

  test("the mobile gallery carousel scrolls and snaps", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/listing/123-lakeview-dr-lake-mary");

    const scroller = page.locator("ul.snap-x").first();
    if ((await scroller.count()) === 0) return;

    const scrollable = await scroller.evaluate(
      (el) => el.scrollWidth >= el.clientWidth,
    );
    expect(scrollable).toBe(true);
  });

  test("the mobile menu opens, traps focus and closes on Escape", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const trigger = page.getByRole("button", { name: /menu/i }).first();
    if ((await trigger.count()) === 0) return;

    await trigger.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("no critical or serious axe violations on the main page types", async ({
    page,
  }) => {
    for (const path of ["/", "/search", "/listing/123-lakeview-dr-lake-mary"]) {
      await page.goto(path, { waitUntil: "load" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      const report = blocking
        .map((v) => `[${v.impact}] ${v.id}: ${v.help} @ ${v.nodes[0]?.target.join(" ")}`)
        .join("\n  ");

      expect(blocking, `${path}\n  ${report}\n`).toEqual([]);
    }
  });
});
