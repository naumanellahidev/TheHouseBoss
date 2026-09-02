/** Probes for a reachable pooler host and prints what it found. */
import { connect, resolveHost } from "./db-connect.mjs";

console.log("Resolving Supabase pooler host...\n");
const host = await resolveHost();
console.log(`\n✓ using ${host}`);

const client = await connect();
const { rows } = await client.query(
  "select current_database() db, current_user usr, version() ver",
);
console.log(`  database      : ${rows[0].db}`);
console.log(`  user          : ${rows[0].usr}`);
console.log(`  server        : ${rows[0].ver.split(",")[0]}`);

const { rows: t } = await client.query(
  "select count(*)::int n from information_schema.tables where table_schema='public'",
);
console.log(`  public tables : ${t[0].n}`);
await client.end();
