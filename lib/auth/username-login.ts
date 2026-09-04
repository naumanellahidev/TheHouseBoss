import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/auth/audit";

/**
 * Username + password sign-in on top of Supabase Auth.
 *
 * Supabase authenticates on email. The brief asks the administrator to type a
 * username. This resolves one to the other **on the server** and then hands off
 * to `signInWithPassword` — so the credential is still verified by Supabase
 * Auth against its own hashed store.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 *   - It does not store a password. Not hashed, not encrypted, not anywhere.
 *     `profiles` holds a username and nothing secret.
 *   - It does not implement a password comparison. Rolling your own is how
 *     timing-unsafe comparisons and weak hashes get shipped.
 *   - It does not expose the username → email map to the browser. That lookup
 *     runs with the service role, server-side, and returns nothing to the
 *     client but success or a single generic failure.
 *
 * THREE ATTACKS THIS IS BUILT AGAINST
 *
 *   1. Account enumeration. "No such username" and "wrong password" return the
 *      SAME message. A distinguishable response turns the login form into a
 *      free list of valid usernames.
 *
 *   2. Timing-based enumeration. An unknown username would otherwise fail in
 *      ~5ms while a real one costs a bcrypt verify. Every failure is held to a
 *      floor, so the two are indistinguishable from outside.
 *
 *   3. Brute force. Rate-limited per username AND per IP: per-username alone
 *      lets one attacker spray many accounts; per-IP alone lets a botnet grind
 *      one account.
 */

/** Same string for every failure. Never say which half was wrong. */
const GENERIC_FAILURE = "That username and password do not match.";

const MAX_ATTEMPTS = 8;
const WINDOW_MS = 15 * 60 * 1000;

/**
 * Every failed path is padded to this. Chosen above a realistic bcrypt verify
 * so the "no such user" path is never the fast one.
 */
const MIN_FAILURE_MS = 700;

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string; retryAfter?: number };

async function holdFloor(startedAt: number): Promise<void> {
  const elapsed = Date.now() - startedAt;
  if (elapsed < MIN_FAILURE_MS) {
    await new Promise((r) => setTimeout(r, MIN_FAILURE_MS - elapsed));
  }
}

export async function signInWithUsername(
  rawUsername: string,
  password: string,
  ip: string,
): Promise<LoginResult> {
  const startedAt = Date.now();
  const username = rawUsername.trim().toLowerCase();

  if (!username || !password) {
    await holdFloor(startedAt);
    return { ok: false, error: GENERIC_FAILURE };
  }

  // Both keys, for the reason in the header comment.
  const byUser = rateLimit(`login:u:${username}`, MAX_ATTEMPTS, WINDOW_MS);
  const byIp = rateLimit(`login:ip:${ip}`, MAX_ATTEMPTS * 3, WINDOW_MS);

  if (!byUser.ok || !byIp.ok) {
    const retryAfter = Math.max(byUser.retryAfter, byIp.retryAfter);
    await recordAudit({
      action: "user_login",
      metadata: { outcome: "rate_limited", username, ip },
    });
    return {
      ok: false,
      error: `Too many attempts. Try again in ${Math.ceil(retryAfter / 60)} minutes.`,
      retryAfter,
    };
  }

  /*
    Resolve username -> auth email with the service role.

    `profiles` does not hold the email; `auth.users` does, and that table is not
    reachable through PostgREST. So: profile lookup for the id, then the Admin
    API for the address.
  */
  const service = createServiceClient();

  const { data: profile } = await service
    .from("profiles")
    .select("id, status")
    .eq("username", username)
    .maybeSingle();

  if (!profile || profile.status !== "active") {
    // Indistinguishable from a wrong password, by design.
    await holdFloor(startedAt);
    await recordAudit({
      action: "user_login",
      metadata: { outcome: "unknown_or_suspended", username, ip },
    });
    return { ok: false, error: GENERIC_FAILURE };
  }

  const { data: authUser } = await service.auth.admin.getUserById(profile.id);
  const email = authUser?.user?.email;

  if (!email) {
    await holdFloor(startedAt);
    console.error(`[login] profile ${profile.id} has no auth email`);
    return { ok: false, error: GENERIC_FAILURE };
  }

  /*
    The actual verification, by Supabase Auth, against its own hashed store.

    The SESSION client is used here, not the service client: it is the one that
    writes the auth cookies the rest of the app reads. Signing in on the service
    client would verify the password and leave the browser signed out.
  */
  const db = await createSupabaseServerClient();
  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    await holdFloor(startedAt);
    await recordAudit({
      action: "user_login",
      userId: profile.id,
      metadata: { outcome: "bad_password", username, ip },
    });
    return { ok: false, error: GENERIC_FAILURE };
  }

  // Success is not padded — only failures need to look alike.
  await service
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profile.id);

  await recordAudit({
    action: "user_login",
    userId: profile.id,
    metadata: { outcome: "success", username, ip },
  });

  return { ok: true };
}
