#!/usr/bin/env node
/**
 * RLS verification — CLAUDE.md hard rule 21, docs/13-qa-checklists.md § 2.
 *
 * Runs with the ANON KEY ONLY, which is the key that ships in the browser
 * bundle. Anyone can extract it and point a Supabase client at the project, so
 * "the UI does not allow it" proves nothing. This does.
 *
 * ── How RLS actually fails a write, and why that matters here ──────────────
 * An INSERT blocked by policy returns an ERROR (42501). An UPDATE or DELETE
 * blocked by policy does NOT: the rows are simply not visible to the statement,
 * so it succeeds and affects zero rows. Asserting on `error` alone would pass
 * even with RLS wide open. Every mutation below therefore uses `.select()` and
 * asserts the returned row set is EMPTY.
 *
 * ── Safety ─────────────────────────────────────────────────────────────────
 * Mutations are scoped with `.eq()` to a single known row — never `.neq()`,
 * which matches everything. If RLS were broken, the blast radius is one seed
 * row and `npm run db:seed` restores it.
 *
 * Run: npm run test:rls
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
  );
  process.exit(1);
}

const anon = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ALL_TABLES = [
  "profiles",
  "cities",
  "communities",
  "listings",
  "articles",
  "reviews",
  "leads",
  "saved_searches",
  "media",
  "redirects",
  "sync_log",
] as const;

/** The only two tables anon may INSERT into. */
const INTAKE = new Set(["leads", "saved_searches"]);

/** Tables anon may SELECT from at all. */
const READABLE = new Set([
  "cities",
  "communities",
  "listings",
  "articles",
  "reviews",
  "redirects",
]);

/** A harmless text column on each readable table, for the update probe. */
const PROBE_COLUMN: Record<string, string> = {
  cities: "meta_title",
  communities: "meta_title",
  listings: "meta_title",
  articles: "meta_title",
  reviews: "author_role",
  redirects: "to_path",
};

const NOWHERE = "00000000-0000-0000-0000-000000000000";

let failures = 0;
let checks = 0;
const notes: string[] = [];

const ok = (label: string) => {
  checks++;
  console.log(`  ✓ ${label}`);
};
const fail = (label: string, detail = "") => {
  checks++;
  failures++;
  console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
};
const skip = (label: string) => {
  console.log(`  · ${label}`);
};

async function main() {
  // ── 1. INSERT ────────────────────────────────────────────────────────────
  console.log("\n1. anon must not be able to INSERT\n");

  for (const table of ALL_TABLES) {
    const { error } = await anon.from(table).insert({} as never);
    const blockedByPolicy =
      error?.code === "42501" || /row-level security/i.test(error?.message ?? "");

    if (INTAKE.has(table)) {
      if (blockedByPolicy) {
        fail(`${table}: INSERT blocked by policy — the public form cannot submit`);
      } else {
        ok(`${table}: INSERT reaches validation (intake table, as intended)`);
      }
    } else if (error) {
      ok(`${table}: INSERT rejected`);
    } else {
      fail(`${table}: ANON INSERTED A ROW`);
    }
  }

  // ── 2. UPDATE / DELETE ───────────────────────────────────────────────────
  console.log("\n2. anon must not be able to UPDATE or DELETE\n");
  console.log(
    "  (a blocked UPDATE/DELETE returns zero rows, not an error — so these\n" +
      "   assert on the returned row set, not on `error`)\n",
  );

  for (const table of ALL_TABLES) {
    if (!READABLE.has(table)) {
      // anon cannot see a row here, so it cannot name one. A write probe would
      // return [] whether RLS blocks it or simply matches nothing — the SELECT
      // test in section 3 is what proves these tables are sealed.
      skip(`${table}: no visible row to probe — covered by the SELECT test`);
      continue;
    }

    const { data: target } = await anon.from(table).select("id").limit(1);
    const id = target?.[0]?.id ?? NOWHERE;
    if (id === NOWHERE) {
      skip(`${table}: no rows present to probe`);
      continue;
    }

    const column = PROBE_COLUMN[table];
    const { data: updated, error: updError } = await anon
      .from(table)
      .update({ [column]: "__RLS_PROBE__" } as never)
      .eq("id", id)
      .select("id");

    if (updError || (updated?.length ?? 0) === 0) {
      ok(`${table}: UPDATE affected 0 rows`);
    } else {
      fail(`${table}: ANON UPDATED ${updated!.length} ROW(S)`, `id ${id}`);
      notes.push(`${table}.${column} was modified — run \`npm run db:seed\``);
    }

    const { data: deleted, error: delError } = await anon
      .from(table)
      .delete()
      .eq("id", id)
      .select("id");

    if (delError || (deleted?.length ?? 0) === 0) {
      ok(`${table}: DELETE affected 0 rows`);
    } else {
      fail(`${table}: ANON DELETED ${deleted!.length} ROW(S)`, `id ${id}`);
      notes.push(`${table} lost a row — run \`npm run db:seed\``);
    }
  }

  // ── 3. reads that must be blocked ────────────────────────────────────────
  console.log("\n3. anon must not be able to read private rows\n");

  for (const table of ALL_TABLES) {
    if (READABLE.has(table)) continue;
    const { data } = await anon.from(table).select("*").limit(5);
    const rows = data?.length ?? 0;
    if (rows === 0) ok(`${table}: SELECT returns nothing`);
    else fail(`${table}: ANON READ ${rows} ROW(S)`);
  }

  for (const [table, column, value] of [
    ["listings", "published", false],
    ["cities", "published", false],
    ["communities", "published", false],
    ["reviews", "published", false],
  ] as const) {
    const { data } = await anon.from(table).select("id").eq(column, value).limit(5);
    if ((data?.length ?? 0) === 0) ok(`${table}: unpublished rows are invisible`);
    else fail(`${table}: ANON READ ${data!.length} UNPUBLISHED ROW(S)`);
  }

  {
    const { data } = await anon
      .from("articles")
      .select("id")
      .neq("status", "published")
      .limit(5);
    if ((data?.length ?? 0) === 0) ok("articles: draft rows are invisible");
    else fail(`articles: ANON READ ${data!.length} DRAFT ROW(S)`);
  }

  // ── 4. reads that must work ─────────────────────────────────────────────
  console.log("\n4. anon must still be able to read published content\n");

  for (const table of ["cities", "listings"] as const) {
    const { data, error } = await anon.from(table).select("id").limit(1);
    if (error) fail(`${table}: SELECT errored`, error.message);
    else if ((data?.length ?? 0) > 0) ok(`${table}: published rows are readable`);
    else fail(`${table}: no rows readable — seed missing, or policy too strict`);
  }

  for (const view of ["listing_facets", "listing_card"] as const) {
    const { error } = await anon.from(view).select("*").limit(1);
    if (error) fail(`${view}: SELECT errored`, error.message);
    else ok(`${view}: readable`);
  }

  // ── 5. storage ──────────────────────────────────────────────────────────
  console.log("\n5. storage bucket\n");

  const { data: files, error: listError } = await anon.storage
    .from("media")
    .list("", { limit: 1 });
  if (listError) fail("media bucket: public read failed", listError.message);
  else ok(`media bucket: public read works (${files?.length ?? 0} objects)`);

  const { error: uploadError } = await anon.storage
    .from("media")
    .upload(`__rls_probe__/${Date.now()}.webp`, new Blob([new Uint8Array([1])]), {
      contentType: "image/webp",
    });
  if (uploadError) ok("media bucket: anon upload rejected");
  else fail("media bucket: ANON UPLOADED AN OBJECT");

  // ── result ──────────────────────────────────────────────────────────────
  console.log(
    `\n${failures === 0 ? "✓" : "✗"} ${checks - failures}/${checks} checks passed`,
  );
  for (const n of notes) console.error(`  ! ${n}`);

  if (failures > 0) {
    console.error(
      "\n  RLS is not correct. This is a launch blocker — fix the policies in\n" +
        "  supabase/migrations/*_rls.sql and re-run.\n",
    );
    process.exit(1);
  }
  console.log("  RLS holds against the anon key.\n");
}

main().catch((e) => {
  console.error("✗ test-rls crashed:", e);
  process.exit(1);
});
