/**
 * Resolves a working Postgres connection to the Supabase project.
 *
 * Supabase's direct host (`db.<ref>.supabase.co`) is IPv6-only. On a machine
 * with no IPv6 route it is simply unreachable, which is the situation here — so
 * everything goes through the IPv4 pooler in SESSION mode (port 5432).
 * Transaction mode (6543) cannot run the DDL these migrations contain.
 *
 * The project's region is not derivable from the credentials, so the first call
 * probes the known pooler hosts and caches the winner in .db-host (git-ignored).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import pg from "pg";

const CACHE = ".db-host";

/**
 * Credentials come from the environment. They used to be literals in this file,
 * which meant the database password was committed to the repository — run these
 * scripts with:
 *
 *   node --env-file=.env.local scripts/<script>.mjs
 *
 * `.env.local` is git-ignored; `.env.example` documents both variables.
 */
export const PROJECT_REF = (() => {
  const explicit = process.env.SUPABASE_PROJECT_REF;
  if (explicit) return explicit;

  // Otherwise derive it from the public URL: https://<ref>.supabase.co
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const match = url?.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/i);
  if (match) return match[1];

  throw new Error(
    "Cannot determine the Supabase project ref.\n" +
      "  Set SUPABASE_PROJECT_REF or NEXT_PUBLIC_SUPABASE_URL, and run with\n" +
      "  node --env-file=.env.local scripts/<script>.mjs",
  );
})();

export const PASSWORD = (() => {
  const password = process.env.SUPABASE_DB_PASSWORD;
  if (password) return password;

  throw new Error(
    "SUPABASE_DB_PASSWORD is not set.\n" +
      "  Find it in the Supabase dashboard under Project Settings -> Database,\n" +
      "  put it in .env.local, and run with\n" +
      "  node --env-file=.env.local scripts/<script>.mjs",
  );
})();

const REGIONS = [
  "aws-0-us-east-1",
  "aws-1-us-east-1",
  "aws-0-us-east-2",
  "aws-1-us-east-2",
  "aws-0-us-west-1",
  "aws-0-us-west-2",
  "aws-0-eu-central-1",
  "aws-0-eu-west-2",
  "aws-0-ap-south-1",
  "aws-0-ap-southeast-1",
];

export function urlFor(host, port = 5432) {
  const user = encodeURIComponent(`postgres.${PROJECT_REF}`);
  const pass = encodeURIComponent(PASSWORD);
  return `postgresql://${user}:${pass}@${host}:${port}/postgres`;
}

export function clientConfig(host, port = 5432) {
  return {
    host,
    port,
    user: `postgres.${PROJECT_REF}`,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12_000,
    // The pooler in session mode is fine with long-running DDL.
    statement_timeout: 120_000,
  };
}

async function tryHost(host) {
  const client = new pg.Client(clientConfig(host));
  try {
    await client.connect();
    const { rows } = await client.query("select current_database() as db, version() as v");
    await client.end();
    return rows[0];
  } catch (error) {
    try {
      await client.end();
    } catch {
      /* already closed */
    }
    return { error: error.message };
  }
}

export async function resolveHost({ quiet = false } = {}) {
  if (existsSync(CACHE)) {
    const cached = readFileSync(CACHE, "utf8").trim();
    if (cached) return cached;
  }

  for (const region of REGIONS) {
    const host = `${region}.pooler.supabase.com`;
    if (!quiet) process.stdout.write(`  probing ${host} ... `);
    const result = await tryHost(host);
    if (!result.error) {
      if (!quiet) console.log(`connected (${result.db})`);
      writeFileSync(CACHE, host);
      return host;
    }
    // "Tenant or user not found" means the host is up but the project is not
    // in this region — keep going. Anything else is a network problem.
    if (!quiet) console.log(result.error.slice(0, 60));
  }

  throw new Error(
    "Could not reach the project through any known pooler host.\n" +
      "  Find the exact connection string in the Supabase dashboard under\n" +
      "  Project Settings → Database → Connection string → Session pooler,\n" +
      `  then write just the hostname into ${CACHE}.`,
  );
}

export async function connect() {
  const host = await resolveHost({ quiet: true });
  const client = new pg.Client(clientConfig(host));
  await client.connect();
  return client;
}
