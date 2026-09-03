import { NextResponse } from "next/server";

import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Deployment health check.
 *
 * Exists because of the failure mode named in docs/17 § 2: the realistic outage
 * here is not Vercel going down, it is **Supabase being unreachable or paused
 * while Vercel happily serves a 200 with an empty page**. A plain status check
 * on `/` sees that as healthy. This does not.
 *
 * Public and unauthenticated — UptimeRobot polls it anonymously every five
 * minutes — so it returns the minimum that is useful and nothing that is not.
 * No table names beyond one, no row contents, no environment values, no error
 * strings from Postgres. `ok` plus a duration is the whole contract.
 *
 * Uses the cookie-free public client, so this route exercises exactly the path
 * an anonymous visitor takes, through RLS, rather than a privileged shortcut
 * that would still succeed if the public policies were broken.
 *
 * The five-minute polling also keeps the free-tier project from being paused
 * after 7 days of inactivity, which is a second reason to configure the monitor
 * before launch rather than after. The keepalive cron covers the same risk;
 * neither is a reason to drop the other, because a cron that silently stops
 * running is precisely the thing nobody notices.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();

  try {
    const db = createSupabasePublicClient();

    // Head-only count: no rows cross the wire, but it is a real query through
    // a real policy, so it fails when the database or RLS is broken.
    const { error } = await db
      .from("cities")
      .select("id", { count: "exact", head: true });

    if (error) throw new Error(error.message);

    return NextResponse.json(
      {
        ok: true,
        database: "reachable",
        ms: Date.now() - startedAt,
        deployment: process.env.VERCEL_ENV || "local",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    // Logged in full for Vercel's runtime logs; the response stays opaque.
    console.error("[health] database unreachable:", error);

    return NextResponse.json(
      {
        ok: false,
        database: "unreachable",
        ms: Date.now() - startedAt,
        deployment: process.env.VERCEL_ENV || "local",
      },
      // 503, not 500: this is "dependency down, try again", and it is what
      // makes an uptime monitor alert rather than record a slow success.
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
