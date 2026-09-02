import { expect, test } from "@playwright/test";

import {
  MIN_TARGET_POINTER,
  MIN_TARGET_TOUCH,
  PAGES,
  TOUCH_MAX_WIDTH,
  WIDTHS,
} from "./pages";

/**
 * Responsive contract — docs/04-responsive-spec.md § 8.
 *
 * Asserts at every width on every page:
 *   1. no horizontal overflow (the hard floor is 360px)
 *   2. interactive targets meet the minimum for that viewport class
 *   3. a full-page screenshot is written to shots/ for human review
 *
 * The assertions catch overflow and small targets. Only a person catches
 * "this is ugly at 768px" — review the screenshots.
 */

for (const page_ of PAGES) {
  test.describe(page_.name, () => {
    for (const width of WIDTHS) {
      test(`${page_.name} @ ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(page_.path, { waitUntil: "load" });

        // ── 1. no horizontal overflow ─────────────────────────────────
        const overflow = await page.evaluate(() => {
          const el = document.documentElement;
          if (el.scrollWidth <= el.clientWidth + 1) return null;
          const limit = el.clientWidth;
          const culprits = [...document.querySelectorAll<HTMLElement>("*")]
            .filter((n) => n.getBoundingClientRect().right > limit + 1)
            .slice(0, 5)
            .map((n) => {
              const r = n.getBoundingClientRect();
              return `<${n.tagName.toLowerCase()} class="${String(
                n.className,
              ).slice(0, 90)}"> right=${Math.round(r.right)}`;
            });
          return { scrollWidth: el.scrollWidth, clientWidth: limit, culprits };
        });

        expect(
          overflow,
          overflow
            ? `Horizontal overflow at ${width}px (${overflow.scrollWidth} > ${overflow.clientWidth}).\nCulprits:\n  ${overflow.culprits.join("\n  ")}`
            : "",
        ).toBeNull();

        // ── 2. target size ────────────────────────────────────────────
        if (!page_.specimen) {
          const min =
            width < TOUCH_MAX_WIDTH ? MIN_TARGET_TOUCH : MIN_TARGET_POINTER;

          const small = await page.evaluate((minSize) => {
            const sel =
              'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"]';
            return [...document.querySelectorAll<HTMLElement>(sel)]
              .filter((n) => {
                const r = n.getBoundingClientRect();
                if (r.width === 0 && r.height === 0) return false;

                const cs = getComputedStyle(n);
                if (cs.visibility === "hidden" || cs.display === "none")
                  return false;

                // honeypots and anything removed from the tab order
                if (n.getAttribute("tabindex") === "-1") return false;
                if (n.closest('[aria-hidden="true"]')) return false;

                // Visually-hidden-until-focused controls (the skip link) are
                // 1x1 at rest by design; they size up when focused.
                if (n.classList.contains("sr-only")) return false;

                // WCAG 2.5.8 exempts links inside a block of running text
                if (
                  n.tagName === "A" &&
                  n.closest("p, li, dd, figcaption, caption")
                )
                  return false;

                return r.width < minSize || r.height < minSize;
              })
              .slice(0, 8)
              .map((n) => {
                const r = n.getBoundingClientRect();
                return `<${n.tagName.toLowerCase()}> ${Math.round(r.width)}x${Math.round(r.height)} "${(n.textContent ?? "").trim().slice(0, 30)}"`;
              });
          }, min);

          expect(
            small,
            `Targets under ${min}x${min} at ${width}px:\n  ${small.join("\n  ")}`,
          ).toEqual([]);
        }

        // ── 3. screenshot for review ──────────────────────────────────
        await page.screenshot({
          path: `shots/${page_.name}-${width}.png`,
          fullPage: true,
        });
      });
    }
  });
}
