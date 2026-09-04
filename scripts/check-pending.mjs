#!/usr/bin/env node
/**
 * Launch guard: fails if any client-supplied value is still a placeholder.
 *
 * `lib/site-config.ts` marks unknown values as PENDING so the site renders
 * cleanly during the build. None may survive to production.
 *
 * ── Why this reads the database ───────────────────────────────────────────
 *
 * `site_settings` is a runtime OVERRIDE of `site-config.ts`, and the whole
 * point of the admin's Contact and Branding panels is that the client fills
 * these in herself without a developer. Once she has, the config file still
 * says PENDING — correctly, because PENDING there means "no build-time value",
 * and the runtime value is what every page actually renders.
 *
 * So a purely static read of the file reports a launch blocker for something
 * that was resolved weeks earlier. This checks the file, then asks the database
 * which of those the client has since supplied, and only fails on what is
 * genuinely still missing at BOTH layers.
 *
 * Without a service key (CI, a fresh clone) it degrades to the old behaviour
 * and says so, rather than passing on an assumption it could not verify.
 *
 * Run: npm run check:pending   (a Phase 7 launch-checklist item)
 */
import { readFile } from "node:fs/promises";

const FILE = "lib/site-config.ts";
const source = await readFile(FILE, "utf8");

/**
 * Which `site_settings` column satisfies which PENDING line.
 *
 * Keyed by the config property name as it appears in the file. A PENDING line
 * with no entry here can only be satisfied by editing the file, which is
 * correct for anything that is not runtime-editable.
 */
const SATISFIED_BY = {
  phone: "phone",
  phoneHref: "phone",
  email: "email",
  street: "address_street",
  locality: "address_locality",
  region: "address_region",
  postalCode: "address_postal",
  googleBusiness: "profiles_json.googleBusiness",
  realtorDotCom: "profiles_json.realtorDotCom",
  zillow: "profiles_json.zillow",
  facebook: "profiles_json.facebook",
  instagram: "profiles_json.instagram",
  linkedin: "profiles_json.linkedin",
  youtube: "profiles_json.youtube",
};

async function runtimeValues() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  try {
    const response = await fetch(
      `${url}/rest/v1/site_settings?id=eq.1&select=phone,email,address_street,address_locality,address_region,address_postal,profiles_json`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const [row] = await response.json();
    return row ?? null;
  } catch (error) {
    console.log(`  (settings unreadable: ${error.message})`);
    return null;
  }
}

/** `profiles_json.zillow` -> row.profiles_json?.zillow */
const read = (row, path) =>
  path.split(".").reduce((value, part) => value?.[part], row);

const pending = source
  .split("\n")
  .map((line, i) => ({ line: i + 1, text: line.trim() }))
  .filter(
    ({ text }) =>
      text.includes("PENDING") &&
      // Comment forms, including the `/* ── PENDING: ... */` section headers,
      // which this guard has been counting as findings since it was written.
      !text.startsWith("*") &&
      !text.startsWith("/*") &&
      !text.startsWith("//") &&
      !text.startsWith("export const PENDING") &&
      !text.includes("isPending") &&
      !text.includes("value === PENDING"),
  );

const row = await runtimeValues();

if (row === null && pending.length > 0) {
  console.log("  (no service key — the database half of this check was skipped)");
}

const unresolved = [];
const resolved = [];

for (const item of pending) {
  // `phone: PENDING, // e.g. ...` -> "phone"
  const property = item.text.match(/^([A-Za-z][A-Za-z0-9_]*)\s*:/)?.[1];
  const column = property ? SATISFIED_BY[property] : undefined;
  const value = row && column ? read(row, column) : undefined;

  if (typeof value === "string" && value.trim().length > 0) {
    resolved.push({ ...item, property, column });
  } else {
    unresolved.push(item);
  }
}

if (resolved.length > 0) {
  console.log(
    `  ${resolved.length} value(s) supplied by the client in Settings, not in the file:`,
  );
  for (const r of resolved) console.log(`    ${r.property} ← site_settings.${r.column}`);
}

if (unresolved.length === 0) {
  console.log("✓ pending guard: every client value is supplied");
  process.exit(0);
}

console.error(
  `\n✗ pending guard: ${unresolved.length} value(s) still awaiting the client\n`,
);
for (const p of unresolved) console.error(`  ${FILE}:${p.line}  ${p.text}`);
console.error(
  "\n  Supply them in Admin → Settings, or edit lib/site-config.ts. They are",
);
console.error("  tracked in PROGRESS.md under 'Blocked on client content'.\n");
process.exit(1);
