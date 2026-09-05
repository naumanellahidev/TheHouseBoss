import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron";
import { drain, jobCounts } from "@/lib/seo/engine/queue";

/**
 * The SEO queue worker (brief §36).
 *
 * ── This is the background worker ─────────────────────────────────────────
 *
 * §36 says do not pretend a background worker exists if one has not been
 * implemented. This is the implementation, and it is deliberately the least
 * exotic one available: a scheduled route that takes a batch off the queue,
 * processes it, and returns. No external worker, no durable execution service,
 * no dependency that is not already deployed.
 *
 * The consequence is stated rather than hidden: queued work is picked up on the
 * NEXT run, not instantly. The admin shows queued/processing/completed/failed
 * counts so an operator can see that, instead of watching a progress bar that
 * is animating on a timer.
 *
 * ── Why it also runs on demand ────────────────────────────────────────────
 *
 * `authorizeCron` accepts the Vercel cron header or the shared secret, so the
 * admin can call this route to drain immediately after enqueuing rather than
 * waiting for the schedule. That is what makes the queue usable for one person
 * pressing a button, as well as for four hundred records overnight.
 *
 * ── maxDuration ───────────────────────────────────────────────────────────
 *
 * 60s, matching the other cron routes. The batch is ten jobs at roughly a
 * second each, which leaves a wide margin — and anything not reached is still
 * `queued`, which is the entire point of the queue over a long loop.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const startedAt = Date.now();

  try {
    const result = await drain();
    const counts = await jobCounts();

    return NextResponse.json({
      ok: true,
      processed: result.processed,
      failed: result.failed,
      remaining: counts.queued,
      counts,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    /*
      A worker that throws must still report. The jobs it had claimed are left
      `processing` and `requeue_stuck_seo_jobs` returns them on the next run —
      so a crash costs one cycle, not the work.
    */
    console.error("[cron/seo-queue]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "The queue run failed.",
        ms: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
