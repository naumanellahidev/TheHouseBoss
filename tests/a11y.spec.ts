import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

import { PAGES } from "./pages";

/**
 * WCAG 2.1 AA gate — docs/13-qa-checklists.md § 4.
 *
 * Automated tooling catches roughly 30–40% of real issues. Zero violations
 * here is the floor, not the finish line: the manual keyboard and
 * screen-reader passes in the checklist are still required.
 */

for (const page_ of PAGES) {
  test.describe(page_.name, () => {
    test("no critical or serious axe violations", async ({ page }) => {
      await page.goto(page_.path, { waitUntil: "load" });

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );

      const report = blocking
        .map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help}\n    ${v.nodes
              .slice(0, 3)
              .map((n) => n.target.join(" "))
              .join("\n    ")}`,
        )
        .join("\n  ");

      expect(blocking, blocking.length ? `\n  ${report}\n` : "").toEqual([]);
    });

    test("exactly one h1", async ({ page }) => {
      await page.goto(page_.path, { waitUntil: "load" });
      await expect(page.locator("h1")).toHaveCount(1);
    });

    // Routes outside the (marketing) group have no header, so no skip link.
    if (!page_.noChrome) {
      test("first Tab reaches the skip link", async ({ page }) => {
        await page.goto(page_.path, { waitUntil: "load" });
        await page.keyboard.press("Tab");

        const focused = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement | null;
          return el ? (el.textContent ?? "").trim() : null;
        });

        expect(focused).toContain("Skip to content");
      });
    }
  });
}

/**
 * Behaviours the per-page rules cannot cover. These are the three things most
 * likely to silently regress: the reduced-motion escape hatch, the mobile nav
 * focus trap, and iOS input zoom.
 */
test.describe("global behaviour", () => {
  test("prefers-reduced-motion disables transitions", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/", { waitUntil: "load" });

    const durations = await page.evaluate(() =>
      [...document.querySelectorAll("*")]
        .map((el) => getComputedStyle(el).transitionDuration)
        .filter((d) => d && d !== "0s")
        .filter((d) => parseFloat(d) > 0.001),
    );

    expect(durations, "transitions still running under reduced motion").toEqual(
      [],
    );
    await context.close();
  });

  test("mobile nav traps focus and closes on Escape", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "load" });

    await page.getByRole("button", { name: "Open menu" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // body scroll must be locked while the sheet is open
    const locked = await page.evaluate(
      () => getComputedStyle(document.body).overflow,
    );
    expect(locked).toBe("hidden");

    // focus must stay inside the sheet
    for (let i = 0; i < 25; i++) await page.keyboard.press("Tab");
    const inside = await page.evaluate(() =>
      Boolean(document.activeElement?.closest('[role="dialog"]')),
    );
    expect(inside, "focus escaped the mobile nav sheet").toBe(true);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("no form control is below 16px (iOS would zoom)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/dev/styleguide", { waitUntil: "load" });

    const small = await page.evaluate(() =>
      [...document.querySelectorAll("input, select, textarea")]
        .map((el) => ({
          tag: el.tagName,
          size: parseFloat(getComputedStyle(el).fontSize),
        }))
        .filter((x) => x.size < 16)
        .map((x) => `${x.tag} ${x.size}px`),
    );

    expect(small).toEqual([]);
  });
});
