#!/usr/bin/env node
/**
 * Keeps zod out of the public site's client JavaScript.
 *
 * zod is 375 kB raw / 78 kB gzipped and cannot be tree-shaken out of a module
 * that builds a schema at top level. Two public client components once
 * imported a single CONSTANT each from such modules (`SORTS`, and the review
 * minimum length) and so shipped all of zod to every visitor, where Lighthouse
 * measured it 100% unused. Next's link prefetching then spread the cost to
 * pages that never used either component.
 *
 * This follows the import graph from every `"use client"` file outside the
 * admin and fails if any runtime import path reaches `zod` or
 * `@hookform/resolvers/zod`. Type-only imports are ignored — they are erased.
 * The admin is exempt: its forms genuinely validate on the client, and it is
 * not what customers load.
 *
 * Run: npm run check:client-zod
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = process.cwd();
const SCAN = ["app", "components", "lib"];
const EXEMPT = [/[\\/]\(admin\)[\\/]/, /[\\/]components[\\/]admin[\\/]/];
const FORBIDDEN = /^(zod|zod\/.*|@hookform\/resolvers\/zod)$/;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith("@/")) base = join(ROOT, spec.slice(2));
  else if (spec.startsWith(".")) base = resolve(dirname(from), spec);
  else return null; // a package — only the forbidden ones matter
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    if (existsSync(base + ext) && statSync(base + ext).isFile()) return base + ext;
  }
  return null;
}

/** Runtime import specifiers — `import type` and `export type` are skipped. */
function runtimeImports(file) {
  const src = readFileSync(file, "utf8");
  const specs = [];
  const re =
    /^\s*(?:import|export)\s+(type\s+)?(?:[^'"]*?\s+from\s+)?["']([^"']+)["']/gm;
  for (const m of src.matchAll(re)) if (!m[1]) specs.push(m[2]);
  // Dynamic import() is deliberately not followed: it is lazy by definition,
  // and it is the sanctioned way to use zod from a public component.
  return specs;
}

const clientFiles = SCAN.flatMap((d) => walk(join(ROOT, d))).filter(
  (f) =>
    !EXEMPT.some((re) => re.test(f)) &&
    /^\s*["']use client["']/m.test(readFileSync(f, "utf8").slice(0, 400)),
);

const problems = [];
for (const entry of clientFiles) {
  const seen = new Set();
  const stack = [[entry, [relative(ROOT, entry)]]];
  while (stack.length) {
    const [file, trail] = stack.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const spec of runtimeImports(file)) {
      if (FORBIDDEN.test(spec)) {
        problems.push([...trail, spec].join("\n      → "));
        continue;
      }
      const next = resolveImport(file, spec);
      if (next) stack.push([next, [...trail, relative(ROOT, next)]]);
    }
  }
}

console.log(`checked ${clientFiles.length} public client component(s) for a runtime path to zod`);

if (problems.length) {
  console.error(
    `\n✗ ${problems.length} path(s) ship zod to visitors:\n\n` +
      problems.map((p) => `    ${p}`).join("\n\n") +
      "\n\n  Import constants from a zod-free module (see lib/validation/search-constants.ts),\n" +
      "  or load the schema with a dynamic import() at the moment it is needed.\n",
  );
  process.exit(1);
}
console.log("✓ no public client component reaches zod");
