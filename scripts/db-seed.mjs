/**
 * Applies supabase/seed.sql through the pooler.
 *
 * `psql` is not installed on this machine, and the Supabase CLI only runs the
 * seed as part of `db reset`, which is destructive. The seed is written to be
 * idempotent (`on conflict do nothing`), so re-running it is safe.
 */
import { readFileSync } from "node:fs";
import { connect } from "./db-connect.mjs";

const sql = readFileSync("supabase/seed.sql", "utf8");
const client = await connect();

try {
  await client.query("begin");
  await client.query(sql);
  await client.query("commit");
  console.log("✓ seed applied");
} catch (error) {
  await client.query("rollback");
  console.error("✗ seed failed, rolled back:\n ", error.message);
  if (error.detail) console.error("  detail:", error.detail);
  if (error.where) console.error("  where:", error.where);
  process.exitCode = 1;
} finally {
  await client.end();
}
