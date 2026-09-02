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
          } catch {
            // Called from a Server Component, where cookies are read-only.
            // middleware.ts refreshes the session, so this is safe to ignore.
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
