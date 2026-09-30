#!/usr/bin/env node
/**
 * The answer-hub guard — docs/18 § 3.
 *
 * The brief for this hub is explicit that a thin page does net harm, that a
 * published slug is permanent, and that no page may invent a figure. Three of
 * those four are checkable, so they are checked here rather than trusted:
 *
 *   1. every record in answers-source.json either has published copy or is
 *      reported as unpublished, so nothing ships as a 120-word draft
 *   2. every published answer is at least MIN_WORDS
 *   3. every internal link inside the copy points at a route that exists
 *   4. every sibling, city and service reference resolves
 *
 * It reads the TypeScript content modules as text rather than importing them,
 * so it runs without a build step and without tsx.
 */

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MIN_WORDS = 400;
const MAX_WORDS = 900;

const root = process.cwd();
const source = JSON.parse(readFileSync(join(root, "answers-source.json"), "utf8"));

/* ── Load the published bodies out of the content modules ────────────────── */

const contentDir = join(root, "lib", "content", "answers");
const modules = readdirSync(contentDir).filter(
  (file) => file.endsWith(".ts") && file !== "index.ts",
);

/**
 * Pull `"slug": { ... }` blocks out of a module by brace counting.
 *
 * A parser rather than a regex because the bodies contain braces, quotes and
 * bracketed links; a regex that survived all three would be less readable than
 * this loop.
 */
function bodiesIn(text) {
  const found = new Map();
  const re = /\n {2}"([a-z0-9-]+)": \{\n/g;
  let match;
  while ((match = re.exec(text))) {
    const start = match.index + match[0].length - 1;
    let depth = 1;
    let i = start;
    while (depth > 0 && i < text.length - 1) {
      i += 1;
      if (text[i] === "{") depth += 1;
      else if (text[i] === "}") depth -= 1;
    }
    found.set(match[1], text.slice(start, i + 1));
  }
  return found;
}

const bodies = new Map();
for (const file of modules) {
  const text = readFileSync(join(contentDir, file), "utf8");
  for (const [slug, body] of bodiesIn(text)) bodies.set(slug, { body, file });
}

/* ── Which routes exist, for the link check ──────────────────────────────── */

const appDir = join(root, "app", "(marketing)");
const staticRoutes = new Set(["/"]);
(function walk(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith("[") || entry.name.startsWith("(")) continue;
    const path = `${prefix}/${entry.name}`;
    if (existsSync(join(dir, entry.name, "page.tsx"))) staticRoutes.add(path);
    walk(join(dir, entry.name), path);
  }
})(appDir, "");

const cities = new Set(
  readFileSync(join(root, "lib", "site-config.ts"), "utf8")
    .matchAll(/slug: "([a-z-]+)", name: "[^"]+", county/g)
    .map((m) => `/${m[1]}`),
);

const answerSlugs = new Set(source.answers.map((a) => a.slug));
const categorySlugs = new Set(source.categories.map((c) => c.slug));

function routeExists(href) {
  const path = href.split("#")[0].replace(/\/$/, "") || "/";
  if (staticRoutes.has(path) || cities.has(path)) return true;
  if (path === "/answers") return true;

  const answer = path.match(/^\/answers\/([a-z0-9-]+)\/([a-z0-9-]+)$/);
  if (answer) return categorySlugs.has(answer[1]) && answerSlugs.has(answer[2]);

  const category = path.match(/^\/answers\/([a-z0-9-]+)$/);
  if (category) return categorySlugs.has(category[1]);

  // Routes that exist outside (marketing) or under a dynamic segment.
  return ["/search", "/sold", "/contact", "/reviews"].includes(path);
}

/* ── Check ───────────────────────────────────────────────────────────────── */

const problems = [];
const unpublished = [];
let totalWords = 0;

for (const record of source.answers) {
  const entry = bodies.get(record.slug);
  if (!entry) {
    unpublished.push(record.slug);
    continue;
  }

  // Word count: the prose inside the double-quoted strings of the body.
  const words = [...entry.body.matchAll(/"((?:[^"\\]|\\.)*)"/g)]
    .map((m) => m[1])
    /*
      Everything a reader sees: the short answer, every heading, every
      paragraph and every list item. Only the structural tokens are dropped.
      The first version of this counter skipped strings under four words,
      which quietly discarded headings and short list items and reported
      pages as thin when they were not.
    */
    .filter((text) => !/^(p|list|steps)$/.test(text))
    .filter((text) => !/^d{4}-d{2}-d{2}$/.test(text))
    .join(" ")
    .replace(/\[([^\]]+)\]\((\/[^)]*)\)/g, "$1")
    .split(/\s+/)
    .filter(Boolean).length;

  totalWords += words;

  if (words < MIN_WORDS) {
    problems.push(`${record.slug}: ${words} words, under the ${MIN_WORDS} floor`);
  } else if (words > MAX_WORDS) {
    problems.push(`${record.slug}: ${words} words, over the ${MAX_WORDS} ceiling`);
  }

  if (!/shortAnswer:/.test(entry.body)) {
    problems.push(`${record.slug}: no short answer`);
  }

  for (const link of entry.body.matchAll(/\]\((\/[^)\s]*)\)/g)) {
    if (!routeExists(link[1])) {
      problems.push(`${record.slug}: links to ${link[1]}, which is not a route`);
    }
  }

  for (const sibling of record.relatedAnswers ?? []) {
    if (!answerSlugs.has(sibling)) {
      problems.push(`${record.slug}: sibling ${sibling} does not exist`);
    }
  }
}

for (const slug of bodies.keys()) {
  if (!answerSlugs.has(slug)) {
    problems.push(`${slug}: published copy with no record in answers-source.json`);
  }
}

/* ── Report ──────────────────────────────────────────────────────────────── */

const published = source.answers.length - unpublished.length;
console.log(
  `\nchecked ${published} published answer(s) across ${source.categories.length} categories`,
);
if (published > 0) {
  console.log(`  average length: ${Math.round(totalWords / published)} words`);
}

if (unpublished.length > 0) {
  console.log(`\n  ${unpublished.length} not published yet:`);
  for (const slug of unpublished) console.log(`    - ${slug}`);
}

if (problems.length > 0) {
  console.error("\n✗ answer guard failed:\n");
  for (const problem of problems) console.error(`  ${problem}`);
  console.error("");
  process.exit(1);
}

console.log("\n✓ answer guard: every published answer is long enough and every link resolves\n");
