#!/usr/bin/env node
/**
 * Design-token guard — CLAUDE.md hard rule 23.
 *
 * Fails the build if a component contains a raw hex color or an arbitrary
 * pixel value. Tokens live only in the @theme block of app/globals.css.
 *
 * Run: npm run check:tokens
 */
import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";

const ROOTS = ["app", "components", "lib"];
const EXTS = new Set([".ts", ".tsx"]);

/** Files that are allowed to contain raw values, with the reason. */
const ALLOWLIST = new Map([
  ["app/globals.css", "the token source"],
  ["app/icon.svg", "static asset"],
  [
    "app/opengraph-image.tsx",
    "satori inline styles cannot read CSS custom properties",
  ],
  [
    "components/site/compliance-footer.tsx",
    "inline SVG mark uses currentColor only — checked manually",
  ],
  [
    "app/layout.tsx",
    "viewport.themeColor is browser metadata and cannot read a CSS variable",
  ],
  [
    "app/dev/styleguide/page.tsx",
    "documents the token hex values in prose — that is the page's job",
  ],
  [
    "lib/email/templates.ts",
    "email clients cannot read a CSS custom property, so tokens must be inlined; each constant names the @theme variable it mirrors and must be updated with it",
  ],
]);

const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const ARBITRARY_PX = /\[[0-9]+(\.[0-9]+)?px\]/g;

const violations = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await walk(path);
      continue;
    }
    if (!EXTS.has(extname(entry.name))) continue;
    if (ALLOWLIST.has(path)) continue;

    const source = await readFile(path, "utf8");
    source.split("\n").forEach((line, i) => {
      // ignore comment lines documenting a token value
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

      for (const [re, label] of [
        [HEX, "raw hex color"],
        [ARBITRARY_PX, "arbitrary pixel value"],
      ]) {
        re.lastIndex = 0;
        const found = line.match(re);
        if (found) {
          violations.push({
            path,
            line: i + 1,
            label,
            match: found.join(", "),
            text: line.trim().slice(0, 100),
          });
        }
      }
    });
  }
}

for (const root of ROOTS) await walk(root);

if (violations.length === 0) {
  console.log("✓ token guard: no raw hex colors or arbitrary pixel values");
  process.exit(0);
}

console.error(
  `\n✗ token guard: ${violations.length} violation(s) — CLAUDE.md hard rule 23\n`,
);
for (const v of violations) {
  console.error(`  ${v.path}:${v.line}  ${v.label} (${v.match})`);
  console.error(`      ${v.text}`);
}
console.error(
  "\n  Fix: add the value to the @theme block in app/globals.css and use the token.\n",
);
process.exit(1);
