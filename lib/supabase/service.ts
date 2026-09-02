import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

/**
 * SERVICE-ROLE CLIENT — BYPASSES ROW LEVEL SECURITY ENTIRELY.
 *
 * CLAUDE.md hard rule 20. This module is the ONLY place
 * `SUPABASE_SERVICE_ROLE_KEY` may be read. It must never be imported from a
 * client component, and the key must never be exposed through a `NEXT_PUBLIC_*`
 * variable or written to a log line.
 *
 * Use it only for:
 *   - cron routes (purge-sold-photos, orphan-media, keepalive)
 *   - admin server actions that have already called requireAdmin()
 *
 * Everything a visitor can reach uses `lib/supabase/server.ts`, which respects
 * RLS. If you are reaching for this client on a public page, the query belongs
 * somewhere else.
 */

// Runtime guard: if this module is ever pulled into a browser bundle, fail loud
// at import time rather than silently shipping the key.
if (typeof window !== "undefined") {
  throw new Error(
    "lib/supabase/service.ts was imported in a browser bundle. " +
      "The service-role key must never reach the client.",
  );
}

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createServiceClient() {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "createServiceClient(): NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  cached = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { "x-application-name": "the-house-boss/service" } },
  });

  return cached;
}
