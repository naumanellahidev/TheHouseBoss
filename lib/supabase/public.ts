import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * The PUBLIC read client. Anon key, and deliberately no cookies.
 *
 * Why this exists as a third client:
 *
 * `lib/supabase/server.ts` reads the session cookie, which is correct for
 * anything that depends on who is asking. But calling `cookies()` opts a route
 * out of static rendering entirely — Next.js reports
 * "Page changed from static to dynamic at runtime, reason: cookies" — so a
 * listing page built with `generateStaticParams` fails at request time and is
 * re-rendered on every visit.
 *
 * A public page must not vary by session anyway. Reading it as the anonymous
 * role is both more correct and what makes `revalidate` work, which is what the
 * Phase 3 Lighthouse target depends on.
 *
 * RLS still applies in full: this key is the one that ships in the browser
 * bundle, and `scripts/test-rls.ts` exercises exactly it. Unpublished rows are
 * invisible here by policy, not by a `where` clause.
 */

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createSupabasePublicClient() {
  if (cached) return cached;

  cached = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "x-application-name": "the-house-boss/public" } },
    },
  );

  return cached;
}
