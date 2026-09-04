import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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
 * The signed-in user, or null. Uses getUser() rather than getSession() —
 * getSession() returns whatever is in the cookie without verifying it, which is
 * not safe to make an authorisation decision on.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Authorisation gate for every admin server action and admin page.
 *
 * Layer 2 of 3 (middleware → this → RLS). Throws rather than returning a
 * boolean so a forgotten `if` cannot silently grant access.
 */
export async function requireAdmin() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") throw new Error("FORBIDDEN");

  return { user, profile };
}

/** Non-throwing variant, for rendering a 403 page instead of an error boundary. */
export async function getAdminProfile() {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}
