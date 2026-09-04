#!/usr/bin/env node
/**
 * Give an admin a username and password.
 *
 *   npm run admin:credentials -- --email you@example.com --username krisi
 *   npm run admin:credentials -- --email you@example.com --username krisi --password 'a long passphrase'
 *   npm run admin:credentials -- --email you@example.com --role super_admin
 *
 * The password is set through the Supabase Auth Admin API, which hashes it in
 * `auth.users`. It is NEVER written to `profiles` or any other application
 * table — `profiles` gains a username and nothing secret.
 *
 * With no --password the script generates one, prints it once, and does not
 * store it anywhere. Printing once is deliberate: a password that can be
 * retrieved later is a password that leaks later.
 */
import { randomBytes } from "node:crypto";

import { createClient } from "@supabase/supabase-js";

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};

const email = arg("email");
const username = arg("username");
const role = arg("role");
let password = arg("password");

if (!email) {
  console.error(
    "✗ --email is required.\n" +
      "  npm run admin:credentials -- --email you@example.com --username krisi",
  );
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const ROLES = ["super_admin", "admin", "editor", "content_manager", "viewer"];
if (role && !ROLES.includes(role)) {
  console.error(`✗ --role must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}

/**
 * A generated passphrase, not a random string of symbols.
 *
 * 4 words from a 32-byte seed is far easier to type on a phone than
 * `xK9#mQ2$` and, at this length, harder to guess. The admin is expected to put
 * it straight into a password manager either way.
 */
function generatePassword() {
  return `${randomBytes(24).toString("base64url")}`;
}

const db = createClient(url, key, { auth: { persistSession: false } });

// The Admin API has no getUserByEmail, so page through and match.
let target = null;
for (let page = 1; page <= 10 && !target; page += 1) {
  const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
  if (error) {
    console.error(`✗ listUsers: ${error.message}`);
    process.exit(1);
  }
  target = (data?.users ?? []).find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if ((data?.users ?? []).length < 200) break;
}

if (!target) {
  console.error(
    `✗ No auth user with email ${email}.\n` +
      `  Create one first:  npm run admin:create -- ${email}`,
  );
  process.exit(1);
}

if (!password) {
  password = generatePassword();
  console.log(`\n  Generated password (shown once, not stored):\n\n    ${password}\n`);
}

if (password.length < 12) {
  console.error("✗ Password must be at least 12 characters.");
  process.exit(1);
}

const { error: authError } = await db.auth.admin.updateUserById(target.id, {
  password,
});
if (authError) {
  console.error(`✗ setting password: ${authError.message}`);
  process.exit(1);
}
console.log("  ✓ password set in Supabase Auth");

const patch = {};
if (username) patch.username = username.trim().toLowerCase();
if (role) patch.role = role;

if (Object.keys(patch).length > 0) {
  const { error } = await db.from("profiles").update(patch).eq("id", target.id);
  if (error) {
    // A duplicate username is the realistic failure and deserves a real message.
    console.error(
      error.message.includes("duplicate")
        ? `✗ the username "${patch.username}" is already taken`
        : `✗ updating profile: ${error.message}`,
    );
    process.exit(1);
  }
  if (patch.username) console.log(`  ✓ username set to "${patch.username}"`);
  if (patch.role) console.log(`  ✓ role set to "${patch.role}"`);
}

const { data: profile } = await db
  .from("profiles")
  .select("username, role, status")
  .eq("id", target.id)
  .maybeSingle();

console.log(
  `\n✓ ${email} can now sign in at /admin/login as ` +
    `"${profile?.username ?? "(no username set)"}" with role "${profile?.role}".`,
);
