#!/usr/bin/env node
/**
 * Post-build bundle guard — CLAUDE.md hard rule 20.
 *
 * Asserts the service-role client never reaches the browser. It is checked
 * three ways because each catches a different mistake:
 *
 *   1. the literal env-var name, in case a key is ever read outside
 *      lib/supabase/service.ts
 *   2. that module's own runtime guard message, which is present in the bundle
 *      if and only if the module itself was included — this is what actually
 *      catches an accidental import chain
 *   3. anything that looks like a service-role JWT
 *
 * It exists because check 2 fired for real: `formatBytes` lived in a component
 * that imported `lib/queries/media`, which imports the service client, so every
 * client component reaching for that formatter pulled it in. The page crashed
 * at runtime rather than leaking, but only because that guard was there.
 *
 * Run: npm run check:bundle   (after npm run build)
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = ".next/static";

const NEEDLES = [
  {
    pattern: "SUPABASE_SERVICE_ROLE_KEY",
    why: "the service-role env-var name is in a client bundle",
  },
  {
    pattern: "service-role key must never reach the client",
    why: "lib/supabase/service.ts itself was bundled for the browser — trace the import chain from a 'use client' file",
  },
  {
    pattern: '"role":"service_role"',
    why: "a service-role JWT payload is in a client bundle",
  },
];

const hits = [];

async function walk(dir) {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    console.error(`✗ ${DIR} not found — run \`npm run build\` first.`);
    process.exit(1);
  }

  for (const entry of entries) {
    const path = join(dir, entry.name).replaceAll("\\", "/");
    if (entry.isDirectory()) {
      await walk(path);
      continue;
    }
    if (!/\.(js|mjs|json|css)$/.test(entry.name)) continue;

    const source = await readFile(path, "utf8");
    for (const needle of NEEDLES) {
      if (source.includes(needle.pattern)) hits.push({ path, ...needle });
    }
  }
}

await walk(DIR);

if (hits.length > 0) {
  console.error("✗ server-only code reached the client bundle:\n");
  for (const hit of hits) console.error(`  ${hit.path}\n    ${hit.why}`);
  console.error("\n  CLAUDE.md hard rule 20.");
  process.exit(1);
}

console.log("✓ no service-role code in the client bundle");
