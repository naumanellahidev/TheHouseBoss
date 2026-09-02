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
  // Variable font: weight stays fluid, so `axes` may be set but `weight` may
  // not. SOFT rounds the terminals slightly; WONK enables the display-only
  // alternate letterforms that give the headings their editorial character.
  axes: ["SOFT", "WONK", "opsz"],
});

/** Body and UI. Everything that is not an h1–h3. */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const fontVariables = `${fraunces.variable} ${inter.variable}`;
