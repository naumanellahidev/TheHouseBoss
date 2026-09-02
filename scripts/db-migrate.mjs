/**
 * Applies any migration file not yet recorded in
 * `supabase_migrations.schema_migrations` — the same table the Supabase CLI
 * uses, so the two stay interchangeable.
 *
 * Exists because `supabase db push` needs Docker for its shadow database and
 * Docker is not installed on this machine (PROGRESS.md, 2026-09-01). Everything
 * goes through the IPv4 session pooler resolved by scripts/db-connect.mjs.
 *
 * Each file runs inside its own transaction: a failure leaves the database
 * exactly as it was, rather than half-applied.
 *
 *   node scripts/db-migrate.mjs           apply pending
 *   node scripts/db-migrate.mjs --dry-run list pending, change nothing
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { connect } from "./db-connect.mjs";

const DIR = "supabase/migrations";
const dryRun = process.argv.includes("--dry-run");

const files = readdirSync(DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = await connect();

try {
  await client.query("create schema if not exists supabase_migrations");
  await client.query(
    `create table if not exists supabase_migrations.schema_migrations (
       version text primary key,
       statements text[],
       name text
     )`,
  );

  const { rows } = await client.query(
    "select version from supabase_migrations.schema_migrations",
  );
  const applied = new Set(rows.map((r) => r.version));

  const pending = files.filter((f) => !applied.has(f.split("_")[0]));

  if (pending.length === 0) {
    console.log(`✓ up to date — ${files.length} migration(s), none pending`);
    process.exit(0);
  }

  console.log(`${pending.length} pending migration(s):`);
  for (const f of pending) console.log(`  ${f}`);
  if (dryRun) process.exit(0);

  for (const file of pending) {
    const version = file.split("_")[0];
    const name = file.replace(/^\d+_/, "").replace(/\.sql$/, "");
    const sql = readFileSync(join(DIR, file), "utf8");

    process.stdout.write(`\napplying ${file} ... `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query(
        `insert into supabase_migrations.schema_migrations (version, name, statements)
         values ($1, $2, $3) on conflict (version) do nothing`,
        [version, name, [sql]],
      );
      await client.query("commit");
      console.log("ok");
    } catch (error) {
      await client.query("rollback");
      console.log("FAILED");
      console.error(`\n${error.message}\n`);
      if (error.position) console.error(`  at character ${error.position}`);
      process.exit(1);
    }
  }

  console.log("\n✓ all pending migrations applied");
} finally {
  await client.end();
}
