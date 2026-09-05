"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/auth/audit";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Account and security (brief §47–§51, §106, §107).
 *
 * ── The rule that shapes this file ────────────────────────────────────────
 *
 * §49: changing a password MUST invalidate every other active session, and
 * §107 is explicit that this has to be enforced by the auth layer rather than
 * simulated in the browser. Clearing `localStorage` on the machine doing the
 * changing is not revocation — the laptop still holding a valid refresh token
 * is precisely the device you are trying to lock out, and it never runs that
 * code.
 *
 * So the revocation goes through `signOut({ scope: "global" })` on the session
 * client, which invalidates every refresh token the user holds, server-side. A
 * stolen session then survives only as long as its access token — minutes — and
 * cannot be renewed.
 *
 * ── Why the current password is re-checked ────────────────────────────────
 *
 * Supabase will change a password for any authenticated session without asking
 * for the old one. That turns a borrowed unlocked laptop into a permanent
 * account takeover: the attacker sets a new password and, thanks to §49,
 * evicts the real owner from every one of their devices. Re-authenticating
 * first is what makes the eviction safe to perform.
 */

export type AccountResult =
  | { ok: true; message: string; signedOut?: boolean }
  | { ok: false; error: string; field?: "current" | "next" | "confirm" | "username" | "email" };

/* ── Password ─────────────────────────────────────────────────────────────── */

const passwordSchema = z
  .object({
    current: z.string().min(1, "Enter your current password."),
    next: z
      .string()
      /*
        Length over composition rules. NIST SP 800-63B withdrew the
        uppercase/digit/symbol requirements because they push people towards
        `Password1!` — predictable to an attacker and hard for a person. Twelve
        characters with no composition rule is the stronger trade.
      */
      .min(12, "Use at least 12 characters. A short phrase is easier to remember than a jumble.")
      .max(128),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, {
    message: "The two new passwords do not match.",
    path: ["confirm"],
  })
  .refine((v) => v.next !== v.current, {
    message: "That is already your password.",
    path: ["next"],
  });

export async function changePassword(raw: unknown): Promise<AccountResult> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = passwordSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return {
      ok: false,
      error: issue?.message ?? "Check the fields.",
      field: issue?.path[0] as AccountResult extends { field?: infer F } ? F : never,
    };
  }

  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  /*
    Re-authenticate against the CURRENT password before changing anything.

    `signInWithPassword` on the server client would also rotate this session's
    cookies as a side effect, which is noise we do not want mid-operation — so
    the check runs on a throwaway client that has no cookie store to write to.
  */
  const { createClient } = await import("@supabase/supabase-js");
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { error: authError } = await probe.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.current,
  });

  if (authError) {
    /*
      Audited on failure as well as success. A run of these against one account
      is the signature of someone sitting at an unlocked machine guessing, and
      it is invisible unless it is recorded.
    */
    await recordAudit({
      action: "password_change_failed",
      entityType: "profiles",
      entityId: identity.id,
      metadata: { reason: "current password did not match" },
    });
    return { ok: false, error: "That is not your current password.", field: "current" };
  }

  /*
    Revoke FIRST, then change the password.

    Order matters and the obvious order is wrong. `admin.auth.admin.signOut()`
    takes a JWT, not a user id — passing an id fails with "invalid JWT", which
    is exactly what this code did until it was tested: the call errored on
    every run while other devices were still evicted, because GoTrue revokes
    sessions as a side effect of a password change. The revocation appeared to
    work and was in fact an accident of implementation, which is not something
    to rest a security property on.

    `db.auth.signOut({ scope: "global" })` is the documented route. It uses
    THIS session's still-valid token to revoke every refresh token the user
    holds, so it has to run while that token is still good — that is, before
    the password update. The service-role update afterwards needs no session at
    all, so it is unaffected by having just signed everyone out.

    If the update then fails, the user is signed out everywhere and their old
    password still works. Inconvenient, and safe; the reverse order fails the
    other way.
  */
  const { error: revokeError } = await db.auth.signOut({ scope: "global" });

  if (revokeError) {
    console.error(`[changePassword] revoke failed: ${revokeError.message}`);
    await recordAudit({
      action: "password_change_failed",
      entityType: "profiles",
      entityId: identity.id,
      metadata: { reason: "sessions could not be revoked", detail: revokeError.message },
    });
    return {
      ok: false,
      error:
        "Your other devices could not be signed out, so the password was left unchanged. Try again.",
    };
  }

  const admin = createServiceClient();

  const { error: updateError } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.next,
  });

  if (updateError) {
    console.error(`[changePassword] ${updateError.message}`);
    await recordAudit({
      action: "password_change_failed",
      entityType: "profiles",
      entityId: identity.id,
      metadata: { reason: "update failed after revocation", sessionsRevoked: true },
    });
    return {
      ok: false,
      error:
        "Every device was signed out, but the new password could not be saved. Sign in with your existing password and try again.",
    };
  }

  await recordAudit({
    action: "password_changed",
    entityType: "profiles",
    entityId: identity.id,
    metadata: { sessionsRevoked: true, scope: "global" },
  });

  /*
    No second `signOut()` here. The global revocation above already took this
    session with it; calling it again would attempt to use a token that is
    already dead and log an error for an operation that has fully succeeded.
  */
  return {
    ok: true,
    signedOut: true,
    message:
      "Password changed. Every device has been signed out, including this one — sign in again with your new password.",
  };
}

/* ── Sign out everywhere, without changing the password ───────────────────── */

/**
 * §50. The button for "I left myself signed in somewhere".
 *
 * Same mechanism as the password path, minus the password change. It exists
 * separately because the two needs are different: a lost phone does not mean
 * the password is compromised, and forcing a password change to evict a device
 * makes people put it off.
 */
export async function signOutEverywhere(): Promise<AccountResult> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };

  // Same correction as above: the session client with a global scope, not the
  // admin client with a user id.
  const { error } = await db.auth.signOut({ scope: "global" });

  if (error) {
    console.error(`[signOutEverywhere] ${error.message}`);
    return { ok: false, error: "The other sessions could not be signed out. Try again." };
  }

  await recordAudit({
    action: "session_revoked",
    entityType: "profiles",
    entityId: identity.id,
    metadata: { scope: "global", reason: "signed out everywhere by the account owner" },
  });

  // As above: the global scope already ended this session.
  return {
    ok: true,
    signedOut: true,
    message: "Signed out on every device. Sign in again to continue.",
  };
}

/* ── Username ─────────────────────────────────────────────────────────────── */

const usernameSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "At least 3 characters.")
    .max(32, "At most 32 characters.")
    /*
      The same shape the sign-in form accepts. A username with a space or an
      `@` in it is one the login page cannot tell from an email address.
    */
    .regex(
      /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/,
      "Letters, numbers, dots, hyphens and underscores. It must start and end with a letter or a number.",
    ),
  password: z.string().min(1, "Confirm with your password."),
});

export async function changeUsername(raw: unknown): Promise<AccountResult> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the username.",
      field: "username",
    };
  }

  if (parsed.data.username === identity.username) {
    return { ok: false, error: "That is already your username.", field: "username" };
  }

  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  // A username change moves the credential someone signs in with, so it is
  // confirmed with a password the same way a password change is.
  const { createClient } = await import("@supabase/supabase-js");
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: authError } = await probe.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (authError) {
    return { ok: false, error: "That is not your password." };
  }

  const admin = createServiceClient();
  const { error } = await admin
    .from("profiles")
    .update({ username: parsed.data.username })
    .eq("id", user.id);

  if (error) {
    /*
      23505 is unique_violation. Reported as "taken" rather than surfacing the
      Postgres message — and it is safe to be specific here, because the person
      is already authenticated as this account and learning that a username
      exists tells them nothing they could not learn by trying to sign in.
    */
    if (error.code === "23505") {
      return { ok: false, error: "That username is already taken.", field: "username" };
    }
    console.error(`[changeUsername] ${error.message}`);
    return { ok: false, error: "The username could not be changed. Try again." };
  }

  await recordAudit({
    action: "username_changed",
    entityType: "profiles",
    entityId: identity.id,
    metadata: { from: identity.username, to: parsed.data.username },
  });

  revalidatePath("/admin/settings");
  return {
    ok: true,
    message: `You now sign in as ${parsed.data.username}. Your password has not changed.`,
  };
}

/* ── Email ────────────────────────────────────────────────────────────────── */

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Confirm with your password."),
});

/**
 * §47. Changing the sign-in email.
 *
 * Supabase sends a confirmation to the NEW address and does not move the
 * account until that link is followed, which is the behaviour we want: a typo
 * would otherwise lock the account out of its own recovery route. The copy
 * below says so, because "saved" on a screen while nothing has changed yet is
 * how people end up unable to sign in.
 */
export async function changeEmail(raw: unknown): Promise<AccountResult> {
  const identity = await getAdminIdentity();
  if (!identity) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the address.",
      field: "email",
    };
  }

  const db = await createSupabaseServerClient();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (parsed.data.email === user.email) {
    return { ok: false, error: "That is already your email address.", field: "email" };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const probe = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const { error: authError } = await probe.auth.signInWithPassword({
    email: user.email,
    password: parsed.data.password,
  });
  if (authError) return { ok: false, error: "That is not your password." };

  const { error } = await db.auth.updateUser({ email: parsed.data.email });

  if (error) {
    console.error(`[changeEmail] ${error.message}`);
    return { ok: false, error: "The address could not be changed. Try again." };
  }

  await recordAudit({
    action: "email_changed",
    entityType: "profiles",
    entityId: identity.id,
    // The addresses themselves are not logged. An audit log is readable by
    // every admin, and one admin's personal address is not another's business.
    metadata: { confirmationSent: true },
  });

  return {
    ok: true,
    message:
      "Check the new address for a confirmation link. Your sign-in email does not change until you follow it.",
  };
}
