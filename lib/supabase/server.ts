import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

import type { Database } from "@/types/database";

/**
 * Server-side Supabase client for React Server Components, server actions and
 * route handlers.
 *
 * Uses the anon key and the caller's session cookie, so **RLS applies**. This
 * is the default client — reach for `service.ts` only when a cron job or an
 * already-authorised admin action genuinely needs to bypass policy.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch (error) {
            /*
              A Server Component cannot write cookies, and that case is
              genuinely fine — the proxy refreshes the session on the next
              request.

              But this catch used to be silent, and a silent catch here hides
              the one failure that matters: a Server Action that signs a user in
              and cannot persist the session. That looked like a successful
              login that simply did not work, with `outcome: success` in the
              audit log and no cookie in the browser. Logging costs nothing and
              turns a twenty-minute mystery into one line.
            */
            console.warn(
              `[supabase] could not write auth cookies (${cookiesToSet
                .map((c) => c.name)
                .join(", ")}):`,
              error instanceof Error ? error.message : error,
            );
          }
        },
      },
    },
  );
}

/**
 * The verified identity of the caller, or null. ONE verification per request.
 *
 * ── Why getClaims() and not getUser() ────────────────────────────────────
 * `getUser()` is a network round trip to Supabase Auth on every call. The
 * admin was making three of them per click — the proxy, the shell layout, and
 * `getAdminIdentity()` — which is most of why switching tabs felt slow.
 *
 * This project signs its JWTs with an asymmetric ES256 key (the JWKS endpoint
 * publishes it). `getClaims()` verifies the token's signature locally against
 * that public key, which auth-js caches module-wide for ten minutes, so on a
 * warm function it costs no network at all. It is still a real verification —
 * unlike `getSession()`, a forged or tampered cookie fails here.
 *
 * The trade-off, stated plainly: a revoked session is honoured until its access
 * token expires (at most an hour, `jwt_expiry`), because nothing asks the Auth
 * server. That is Supabase's recommended pattern for server-side checks, and it
 * is bounded twice over: every query still runs under RLS with this same token,
 * and the profile lookup below refuses a deleted or suspended account at once.
 *
 * ── Why cache() ──────────────────────────────────────────────────────────
 * React's `cache` memoises per request. The layout, the page and every helper
 * that asks "who is this?" during one render now share a single answer instead
 * of each verifying and querying separately.
 */
export const getVerifiedUser = cache(
  async (): Promise<{ id: string; email: string | null } | null> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || !data?.claims?.sub) return null;
    return {
      id: data.claims.sub,
      email: typeof data.claims.email === "string" ? data.claims.email : null,
    };
  },
);

/** The signed-in user, or null. Verified — see `getVerifiedUser`. */
export async function getCurrentUser() {
  return getVerifiedUser();
}

/**
 * Authorisation gate for every admin server action and admin page.
 *
 * Layer 2 of 3 (proxy → this → RLS). Throws rather than returning a boolean so
 * a forgotten `if` cannot silently grant access. Memoised per request: a page
 * and its layout both calling this cost one profile query, not two.
 */
const loadAdmin = cache(async () => {
  const user = await getVerifiedUser();
  if (!user) return { error: "UNAUTHENTICATED" as const };

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, status")
    .eq("id", user.id)
    .single();

  /*
    The roles that administer the site, and the SAME set as `is_admin()` in
    Postgres. Migration 014 widened the role list from three to five, and this
    check did not follow — a `super_admin` was refused by the dashboard while
    RLS happily allowed their queries. The two must be read together: if this
    list and `is_admin()` ever disagree again, the symptom is exactly that
    mismatch.

    A suspended account is refused whatever its role, matching the SQL.
  */
  const ADMIN_ROLES = ["super_admin", "admin"] as const;

  if (
    !profile ||
    !(ADMIN_ROLES as readonly string[]).includes(profile.role) ||
    (profile.status ?? "active") !== "active"
  ) {
    return { error: "FORBIDDEN" as const };
  }

  return { user, profile };
});

export async function requireAdmin() {
  const result = await loadAdmin();
  if ("error" in result) throw new Error(result.error);
  return result;
}

/** Non-throwing variant, for rendering a 403 page instead of an error boundary. */
export async function getAdminProfile() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
