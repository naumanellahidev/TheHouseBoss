import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Supabase keepalive.
 *
 * A free-tier project is PAUSED after 7 days with no database activity, and a
 * paused project takes the whole site down (PROGRESS.md, Known risks). One
 * trivial query a day prevents it.
 *
 * The query is deliberately the cheapest one that still counts as activity: a
 * head-only count against a tiny table through the RLS-respecting client, so it
 * exercises the same path a visitor does rather than a privileged shortcut.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  try {
    const db = await createSupabaseServerClient();
    const { count, error } = await db
      .from("cities")
      .select("id", { count: "exact", head: true });

    if (error) throw new Error(error.message);

    return NextResponse.json({ ok: true, cities: count ?? 0 });
  } catch (error) {
    // A failure here is the early warning that the project is already paused or
    // unreachable, so it is logged loudly rather than swallowed.
    console.error("[cron:keepalive] database unreachable:", error);
    return NextResponse.json({ ok: false, error: "database unreachable" }, { status: 500 });
  }
}
