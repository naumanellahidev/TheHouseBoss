import { expect, test } from "@playwright/test";
import sharp from "sharp";

/**
 * The hero's words against the real pixels behind them.
 *
 * `npm run check:contrast` proves the palette — token against token. It cannot
 * prove this one: what sits behind the hero headline is a photograph the client
 * uploads from Admin → Settings → Branding, plus a gradient scrim. Swap the
 * photograph for a brighter one and white text can quietly drop below AA with
 * nothing in the codebase having changed.
 *
 * So this measures the composition as rendered: hide the glyphs, screenshot
 * exactly their box, and take the 98th-percentile luminance of what is behind
 * them — the brightest part the text actually covers, ignoring the top 2% so a
 * single specular highlight does not decide it. The text colour is read from
 * the element, so the check follows the tokens rather than assuming white.
 *
 * WCAG 2.1 AA: 3:1 for large text (>=24px, or >=18.66px bold), 4.5:1 otherwise.
 */

const WIDTHS = [360, 414, 768, 1024, 1440] as const;

const TARGETS = [
  { name: "badge", selector: "[data-hero-bleed] [data-slot='badge']" },
  { name: "headline", selector: "[data-hero-bleed] h1" },
  { name: "lead", selector: "[data-hero-bleed] p:nth-of-type(1)" },
  { name: "intro", selector: "[data-hero-bleed] p:nth-of-type(2)" },
  { name: "services", selector: "[data-hero-bleed] ul li:not([aria-hidden])" },
] as const;

function channel(value: number): number {
  const v = value / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}
const luminance = (r: number, g: number, b: number) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a: number, b: number) =>
  (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

for (const width of WIDTHS) {
  test(`hero text clears WCAG AA over the photograph @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { waitUntil: "networkidle" });
    // Freeze the ken-burns pan, so the sample is the frame that was measured.
    await page.addStyleTag({
      content: "*,*::before,*::after{animation:none!important;transition:none!important}",
    });

    const results: string[] = [];

    for (const target of TARGETS) {
      const element = page.locator(target.selector).first();
      if ((await element.count()) === 0 || !(await element.isVisible())) continue;

      const box = await element.boundingBox();
      if (!box || box.width < 4 || box.height < 4) continue;

      const { color, fontSize, fontWeight } = await element.evaluate((node) => {
        const style = getComputedStyle(node as Element);
        return {
          color: style.color,
          fontSize: Number.parseFloat(style.fontSize),
          fontWeight: Number(style.fontWeight) || 400,
        };
      });
      const [r, g, b] = (color.match(/\d+(\.\d+)?/g) ?? ["255", "255", "255"]).map(Number);
      const textLuminance = luminance(r!, g!, b!);

      await element.evaluate((node) => ((node as HTMLElement).style.visibility = "hidden"));
      const shot = await page.screenshot({
        clip: {
          x: Math.max(0, box.x),
          y: Math.max(0, box.y),
          width: Math.min(box.width, width - Math.max(0, box.x)),
          height: Math.min(box.height, 900 - Math.max(0, box.y)),
        },
      });
      await element.evaluate((node) => ((node as HTMLElement).style.visibility = ""));

      const { data, info } = await sharp(shot).raw().toBuffer({ resolveWithObject: true });
      const values: number[] = [];
      for (let i = 0; i < data.length; i += info.channels) {
        values.push(luminance(data[i]!, data[i + 1]!, data[i + 2]!));
      }
      values.sort((x, y) => x - y);
      const brightest = values[Math.floor(values.length * 0.98)] ?? values.at(-1)!;

      const large = fontSize >= 24 || (fontSize >= 18.66 && fontWeight >= 700);
      const required = large ? 3 : 4.5;
      const measured = contrast(textLuminance, brightest);

      results.push(
        `${target.name} (${Math.round(fontSize)}px): ${measured.toFixed(2)}:1, needs ${required}:1`,
      );
      expect(
        measured,
        `${target.name} at ${width}px measured ${measured.toFixed(2)}:1 against the photograph behind it — deepen the hero scrim in app/(marketing)/page.tsx`,
      ).toBeGreaterThanOrEqual(required);
    }

    expect(results.length, "no hero text was found to measure").toBeGreaterThan(0);
    test.info().annotations.push({ type: "measured", description: results.join(" · ") });
  });
}
