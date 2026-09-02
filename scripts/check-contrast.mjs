#!/usr/bin/env node
/**
 * Contrast guard — WCAG 2.1 AA.
 *
 * Parses the real hex values out of the @theme block in app/globals.css and
 * asserts every documented token pairing. Hand-calculated contrast figures in
 * a design doc drift and are wrong more often than not; this computes them.
 *
 * Run: npm run check:contrast
 */
import { readFile } from "node:fs/promises";

const CSS = await readFile("app/globals.css", "utf8");

/** Pull `--color-x: #RRGGBB;` pairs out of the theme block. */
const palette = Object.fromEntries(
  [...CSS.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)].map(
    (m) => [m[1], m[2]],
  ),
);

function srgbToLinear(c) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = srgbToLinear((n >> 16) & 255);
  const g = srgbToLinear((n >> 8) & 255);
  const b = srgbToLinear(n & 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * kind determines the threshold:
 *   text      4.5  — body copy and any text below 24px / 19px bold
 *   large     3.0  — text at 24px+, or 19px+ bold
 *   nontext   3.0  — UI component boundaries, focus rings, meaningful graphics
 */
const PAIRS = [
  ["stone-900", "bone-50", "text", "body text on the page ground"],
  ["stone-700", "bone-50", "text", "secondary text"],
  ["stone-500", "bone-50", "text", "subtle text — labels, metadata at 13px"],
  ["stone-500", "bone-100", "text", "subtle text on a sunken section"],
  ["stone-500", "surface", "text", "subtle text on a card"],
  ["gold-600", "bone-50", "text", "accent-quiet as text on light"],
  ["gold-600", "bone-100", "text", "accent-quiet on a sunken section"],
  ["gold-600", "surface", "text", "accent-quiet on a card"],
  ["gold-600", "accent-wash", "text", "accent-quiet on the accent wash"],
  ["gold-600", "danger-bg", "text", "accent-quiet inside a danger callout"],
  ["gold-600", "warning-bg", "text", "accent-quiet inside a warning callout"],
  ["gold-600", "success-bg", "text", "accent-quiet inside a success callout"],
  ["gold-600", "info-bg", "text", "accent-quiet inside an info callout"],
  ["stone-700", "bone-100", "text", "secondary text on a sunken section"],
  ["stone-500", "danger-bg", "text", "subtle text inside a callout"],
  ["gold-600", "bone-50", "nontext", "focus ring on light"],
  ["gold-600", "ink-900", "nontext", "focus ring on navy"],
  ["gold-400", "ink-900", "text", "accent text on navy"],
  ["gold-500", "ink-900", "text", "accent text on navy"],
  ["gold-500", "ink-950", "text", "accent text on the compliance footer"],
  ["ink-950", "gold-500", "text", "label on a gold button"],
  ["bone-50", "ink-900", "text", "inverted body text"],
  ["bone-50", "ink-950", "text", "inverted text on the compliance footer"],
  ["border-strong", "bone-50", "nontext", "input and outline-button borders"],
  ["success", "success-bg", "text", "success message"],
  ["warning", "warning-bg", "text", "warning message"],
  ["danger", "danger-bg", "text", "error message"],
  ["info", "info-bg", "text", "info message"],
];

const THRESHOLD = { text: 4.5, large: 3, nontext: 3 };

// tokens defined as an alias (var(--color-x)) resolve through the palette
const resolve = (name) => {
  if (palette[name]) return palette[name];
  const alias = CSS.match(
    new RegExp(`--color-${name}:\\s*var\\(--color-([a-z0-9-]+)\\)`),
  );
  return alias ? resolve(alias[1]) : null;
};

let failed = 0;
const rows = [];

for (const [fg, bg, kind, note] of PAIRS) {
  const fgHex = resolve(fg);
  const bgHex = resolve(bg);
  if (!fgHex || !bgHex) {
    console.error(`? could not resolve ${fg} on ${bg}`);
    failed++;
    continue;
  }
  const ratio = contrast(fgHex, bgHex);
  const need = THRESHOLD[kind];
  const ok = ratio >= need;
  if (!ok) failed++;
  rows.push(
    `${ok ? "✓" : "✗"} ${ratio.toFixed(2).padStart(6)}:1  (need ${need})  ` +
      `${fg} ${fgHex} on ${bg} ${bgHex}  — ${note}`,
  );
}

console.log(rows.join("\n"));

if (failed > 0) {
  console.error(
    `\n✗ contrast guard: ${failed} pairing(s) below WCAG 2.1 AA.\n` +
      `  Fix the token in app/globals.css, then update the table in\n` +
      `  docs/03-design-system.md § 1 with the number this script prints.\n`,
  );
  process.exit(1);
}

console.log("\n✓ contrast guard: every documented pairing meets WCAG 2.1 AA");
