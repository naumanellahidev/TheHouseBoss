#!/usr/bin/env node
/**
 * Static migration checker.
 *
 * This does NOT replace applying the migrations — only a real Postgres can do
 * that. It catches the class of error that is easy to introduce and expensive
 * to discover on a live database: a forward reference. A table referenced
 * before it is created, a trigger attached to a table that does not exist yet,
 * a policy calling a function defined in a later file.
 *
 * Run: npm run check:migrations
 */
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const DIR = "supabase/migrations";

/** Objects Postgres or Supabase provides; never created by us. */
const BUILT_IN = new Set([
  "auth.users",
  "storage.objects",
  "storage.buckets",
  "auth.uid",
  "now",
  "gen_random_uuid",
]);

const files = (await readdir(DIR)).filter((f) => f.endsWith(".sql")).sort();

if (files.length === 0) {
  console.error(`✗ no .sql files in ${DIR}`);
  process.exit(1);
}

const created = new Set([...BUILT_IN]);
const problems = [];
let statements = 0;

/** Strips -- comments and single-quoted strings so they cannot match. */
function strip(sql) {
  return sql
    .replace(/--[^\n]*/g, " ")
    .replace(/\$\$[\s\S]*?\$\$/g, " $$BODY$$ ")
    .replace(/'(?:[^']|'')*'/g, "''");
}

function note(file, message) {
  problems.push(`${file}: ${message}`);
}

for (const file of files) {
  const raw = await readFile(join(DIR, file), "utf8");
  const sql = strip(raw);

  statements += (sql.match(/;/g) ?? []).length;

  // ── things this file creates ───────────────────────────────────────────
  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?(table|view|materialized\s+view)\s+(?:if\s+not\s+exists\s+)?([a-z0-9_."]+)/gi,
  )) {
    created.add(m[2].replace(/"/g, "").toLowerCase());
  }
  for (const m of sql.matchAll(
    /create\s+(?:or\s+replace\s+)?function\s+([a-z0-9_."]+)/gi,
  )) {
    const name = m[1].replace(/"/g, "").toLowerCase();
    created.add(name);
    created.add(name.replace(/^public\./, ""));
  }

  // ── things this file depends on ────────────────────────────────────────
  const deps = new Set();

  for (const m of sql.matchAll(/references\s+([a-z0-9_."]+)\s*\(/gi)) {
    deps.add(m[1].replace(/"/g, "").toLowerCase());
  }
  for (const m of sql.matchAll(
    /(?:create\s+(?:unique\s+)?index[^;]*?\s+on|create\s+trigger[^;]*?\s+on|create\s+policy[^;]*?\s+on|alter\s+table)\s+([a-z0-9_."]+)/gi,
  )) {
    deps.add(m[1].replace(/"/g, "").toLowerCase());
  }
  for (const m of sql.matchAll(/\bfrom\s+([a-z][a-z0-9_.]*)/gi)) {
    const t = m[1].toLowerCase();
    // skip SQL keywords that can follow FROM in an expression
    if (!["extract", "timestamp", "interval", "public"].includes(t)) deps.add(t);
  }
  for (const m of sql.matchAll(/\bjoin\s+([a-z][a-z0-9_.]*)/gi)) {
    deps.add(m[1].toLowerCase());
  }
  // function calls we define ourselves
  for (const m of sql.matchAll(/\b(public\.)?(is_admin|storage_usage|tiptap_to_text)\s*\(/gi)) {
    deps.add(`${m[1] ?? ""}${m[2]}`.toLowerCase());
  }

  for (const dep of deps) {
    const bare = dep.replace(/^public\./, "");
    const known =
      created.has(dep) ||
      created.has(bare) ||
      created.has(`public.${bare}`) ||
      // CTE / alias names and function set-returning calls
      ["nodes", "seed_photo", "v", "c", "l", "sp", "excluded"].includes(bare);
    if (!known) {
      note(file, `references "${dep}" before anything creates it`);
    }
  }

  // ── file hygiene ───────────────────────────────────────────────────────
  // A file may legitimately end with a comment block, so compare against the
  // comment-stripped text rather than the raw file.
  const lastCode = sql.replace(/\s+/g, " ").trimEnd();
  if (lastCode.length > 0 && !lastCode.endsWith(";")) {
    note(file, "last statement is not terminated (missing semicolon?)");
  }
  const open = (sql.match(/\(/g) ?? []).length;
  const close = (sql.match(/\)/g) ?? []).length;
  if (open !== close) {
    note(file, `unbalanced parentheses: ${open} open vs ${close} close`);
  }
}

// ── ordering invariant we care about specifically ─────────────────────────
const rlsFile = files.find((f) => /rls/.test(f));
const profilesFile = files.find((f) => /profiles/.test(f));
if (rlsFile && profilesFile && profilesFile > rlsFile) {
  problems.push(
    `${rlsFile} runs before ${profilesFile}, but every policy calls is_admin()`,
  );
}

console.log(
  `checked ${files.length} migration(s), ~${statements} statements\n` +
    `  created: ${[...created].filter((c) => !BUILT_IN.has(c)).length} objects`,
);

if (problems.length) {
  console.error(`\n✗ ${problems.length} problem(s):\n`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(
    "\n  This is a static check. Passing it does not mean the migrations apply —\n" +
      "  only `supabase db push` against a real database proves that.\n",
  );
  process.exit(1);
}

console.log(
  "\n✓ no forward references, balanced statements, correct file order\n" +
    "  NOTE: this is static analysis only. `supabase db push` is still the\n" +
    "  real test — see supabase/README.md.",
);
