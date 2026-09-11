import { Fraunces, Inter } from "next/font/google";

/**
 * Two families, both variable, both self-hosted by next/font.
 * This is the entire font budget — do not add a third.
 * See docs/03-design-system.md § 2.
 */

/** Display serif. Headings h1–h3, hero copy, and the large listing price only. */
export const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  /*
    Variable font: weight stays fluid, so `axes` may be set but `weight` may not.

    `opsz` ONLY. SOFT and WONK were listed here too, and they were 54 kB of the
    121 kB file shipped to every visitor — while doing nothing: both default to
    0 (Google Fonts metadata), and nothing in the CSS ever set
    `font-variation-settings` to move them. The headings have always rendered
    at SOFT 0 / WONK 0, which is exactly what the file without those axes
    renders. Dropping them changed no glyph and took the font to 67 kB, which on
    a throttled mobile connection was bandwidth the LCP image was waiting for.

    If the design ever wants softened terminals or the wonky alternates, add the
    axis back here AND set `font-variation-settings` where it is wanted — one
    without the other is either invisible or free weight.

    `opsz` stays: optical sizing is automatic (`font-optical-sizing: auto`) and
    is what gives the large headings their high-contrast display cut.
  */
  axes: ["opsz"],
});

/** Body and UI. Everything that is not an h1–h3. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const fontVariables = `${fraunces.variable} ${inter.variable}`;
