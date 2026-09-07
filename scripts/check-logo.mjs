#!/usr/bin/env node
/**
 * Guard: there is exactly ONE logo source in this application.
 *
 *   npm run check:logo
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * The client uploads their artwork once, in Admin → Settings → Branding, and it
 * is supposed to appear everywhere. It did not. Three places rendered something
 * else, and each failed silently — nothing errors when a logo falls back, it
 * just quietly shows the wrong brand:
 *
 *   - the admin sidebar rendered the literal string "The House Boss"
 *   - the admin sign-in screen rendered `<Logo>` with no `settings`, so it fell
 *     back to the type-set lockup
 *   - the styleguide did the same
 *
 * The sidebar was the worst of the three, because it is the screen the client
 * looks at most. So this checks the two ways the rule can be broken.
 *
 * ── Rule 1: `<Logo>` must always be given `settings` ──────────────────────
 *
 * Without it the component cannot know the uploaded key and renders the
 * fallback. There is no error, no warning, and nothing on screen says "this is
 * not your logo".
 *
 * ── Rule 2: the brand name must not be hardcoded in markup ────────────────
 *
 * `siteConfig.name` is the compile-time fallback and `settings.brandName` is
 * the runtime value. A literal "The House Boss" in a component is neither —
 * it is a third source that no admin screen can change.
 */
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

const ROOTS = ["app", "components"];

/**
 * Files allowed to contain the brand name as a literal.
 *
 * `logo.tsx` is the component that renders it. `site-config.ts` is the
 * compile-time source. The compliance footer carries the legal disclosure,
 * which is a different string governed by FREC rather than by branding.
 */
const ALLOWED_LITERAL = [
  "components/site/logo.tsx",
  "components/site/compliance-footer.tsx",
];

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      yield* walk(path);
    } else if (/\.(tsx|ts)$/.test(entry.name)) {
      yield path;
    }
  }
}

/**
 * Blank out comments, keeping newlines so reported line numbers stay true.
 *
 * Deliberately crude: it does not understand a `//` inside a string literal.
 * For this guard that is the safe direction to be wrong in — the worst case is
 * a missed finding on a line holding both a URL and the brand name, and the
 * alternative is a parser nobody will maintain.
 */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + " ".repeat(m.length - p1.length));
}

const problems = [];

for (const root of ROOTS) {
  for await (const file of walk(root)) {
    const rel = relative(".", file).replace(/\\/g, "/");
    const source = await readFile(file, "utf8");

    /*
      Rule 1. Every `<Logo` opening tag, up to its closing bracket, must mention
      `settings`. Matched across newlines because the props are usually wrapped.
    */
    for (const match of source.matchAll(/<Logo\b[^>]*?\/?>/gs)) {
      if (!/\bsettings\s*=/.test(match[0])) {
        const line = source.slice(0, match.index).split("\n").length;
        problems.push(
          `${rel}:${line}  <Logo> without a \`settings\` prop — it will render the fallback, not the uploaded artwork`,
        );
      }
    }

    // Rule 2. The brand name as a literal, outside the files that own it.
    if (!ALLOWED_LITERAL.includes(rel)) {
      const code = stripComments(source);
      for (const match of code.matchAll(/["'>]\s*The House Boss\s*["'<]/g)) {
        const line = code.slice(0, match.index).split("\n").length;
        problems.push(
          `${rel}:${line}  brand name hardcoded — use <Logo settings={…}> or settings.brandName`,
        );
      }
    }
  }
}

if (problems.length === 0) {
  console.log("✓ logo guard: one logo source, and every <Logo> is given settings");
  process.exit(0);
}

console.error(`\n✗ logo guard: ${problems.length} problem(s)\n`);
for (const problem of problems) console.error(`  ${problem}`);
console.error(
  "\n  The logo has exactly one source: site_settings.logo_key, uploaded in",
);
console.error("  Admin → Settings → Branding. Anything else is a second brand.\n");
process.exit(1);
