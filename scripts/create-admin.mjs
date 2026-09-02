/**
 * Creates or promotes the single admin account.
 *
 * There is no self-serve signup (docs/06 § 1) — sign-in is magic-link only and
 * `shouldCreateUser: false`, so the account has to exist before the first sign
 * in. This is the one-time step that makes that true.
 *
 *   node --env-file=.env.local scripts/create-admin.mjs krisi@example.com
 *
 * Idempotent: run it again on an existing address and it only re-checks the
 * role. Safe to run against production.
 */
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2]?.trim().toLowerCase();

if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error("Usage: node --env-file=.env.local scripts/create-admin.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "✗ NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.\n" +
      "  Run with: node --env-file=.env.local scripts/create-admin.mjs <email>",
  );
  process.exit(1);
}

const db = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// listUsers is paginated; one page of 200 is far more than this project needs.
const { data: existing, error: listError } = await db.auth.admin.listUsers({
  page: 1,
  perPage: 200,
});
if (listError) {
  console.error(`✗ could not list users: ${listError.message}`);
  process.exit(1);
}

let user = existing.users.find((u) => u.email?.toLowerCase() === email);

if (user) {
  console.log(`• ${email} already exists (${user.id})`);
} else {
  // email_confirm so the first magic link is not preceded by a confirmation
  // email the client did not ask for.
  const { data, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) {
    console.error(`✗ could not create the user: ${error.message}`);
    process.exit(1);
  }
  user = data.user;
  console.log(`✓ created ${email} (${user.id})`);
}

const { error: roleError } = await db
  .from("profiles")
  .upsert({ id: user.id, role: "admin" }, { onConflict: "id" });

if (roleError) {
  console.error(`✗ could not set the admin role: ${roleError.message}`);
  process.exit(1);
}

const { data: profile } = await db
  .from("profiles")
  .select("id, role, full_name")
  .eq("id", user.id)
  .single();

console.log(`✓ ${email} is now role=${profile?.role}`);
console.log(`\n  Sign in at /admin/login — a magic link is emailed to this address.`);
