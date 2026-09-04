import { expect, test } from "@playwright/test";

/**
 * Hard rule 5, as an assertion rather than a config flag.
 *
 * HR5 protects Vercel's image-transformation quota: exhausting it makes every
 * image return 402 in production. It used to be guaranteed by `images.
 * unoptimized: true`, which also stripped the srcset and forced one derivative
 * on every device. The custom loader in `lib/image-loader.ts` gives the same
 * guarantee — Next never routes through `/_next/image` when a loader is set —
 * so from here on THIS is what enforces the rule.
 *
 * If someone removes the loader, or adds a plain `<img>` fed by Vercel's
 * optimizer, this fails.
 */

const PAGES = ["/", "/search", "/sold", "/about"];

test("no page ever requests /_next/image", async ({ page }) => {
  const optimized: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_next/image")) optimized.push(request.url());
  });

  for (const path of PAGES) {
    await page.goto(path, { waitUntil: "networkidle" });
  }

  expect(optimized, `Vercel's optimizer was called: ${optimized.join(", ")}`).toEqual(
    [],
  );
});

test("stored photos are offered at more than one width", async ({ page }) => {
  await page.goto("/search", { waitUntil: "networkidle" });

  /*
    Only images the loader actually owns. The SVG placeholder and the icons in
    public/ are returned untouched by design, so asserting a srcset on every
    image on the page would fail for the right reason and read as the wrong one.
  */
  const srcsets = await page
    .locator('img[srcset*="-800.webp"], img[srcset*="-400.webp"]')
    .evaluateAll((nodes) => nodes.map((n) => n.getAttribute("srcset") ?? ""));

  test.skip(srcsets.length === 0, "No stored photos published in this database.");

  for (const srcset of srcsets) {
    const widths = [...srcset.matchAll(/-(\d+)\.webp/g)].map((m) => m[1]);
    expect(new Set(widths).size, `single-width srcset: ${srcset}`).toBeGreaterThan(1);
  }
});
