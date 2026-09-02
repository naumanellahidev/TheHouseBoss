"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

/**
 * Browser client. Anon key only — it ships in the bundle, so assume it is
 * public. Everything it can do is bounded by RLS, which is why the policies in
 * `010_rls.sql` are the real security boundary and why `scripts/test-rls.ts`
 * exercises exactly this key.
 *
 * Used for auth (magic-link sign-in, sign-out) and nothing else today; all data
 * reads happen on the server.
 */
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  return client;
}
