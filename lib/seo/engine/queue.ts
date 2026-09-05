import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * The SEO job queue (brief §36, §94).
 *
 * ── Enqueue here, drain in the cron ───────────────────────────────────────
 *
 * A server action enqueues and returns immediately; `app/api/cron/seo/route.ts`
 * drains a batch on each run. §36 is explicit that a background worker must not
 * be pretended into existence, so the worker is the scheduled route that this
 * deployment already has, and the admin shows the real counts rather than a
 * progress bar animating on a timer.
 *
 * ── Why the batch is small ────────────────────────────────────────────────
 *
 * The configured model provider permits exactly one request in flight — the
 * measurement is in `lib/seo/auto/pool.ts` — so a batch is bounded by the
 * function's execution budget, not by the database. Ten jobs at roughly a
 * second each leaves ample headroom, and anything left is simply picked up on
 * the next run. Draining slowly and finishing is better than draining fast and
 * being killed halfway.
 */

const DRAIN_BATCH = 10;

export type JobCounts = {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
};

type Kind = "listing" | "article" | "city" | "community";

/**
 * Add work to the queue.
 *
 * ── Why this is not an upsert ─────────────────────────────────────────────
 *
 * The uniqueness rule is a PARTIAL index — `(kind, entity_id) WHERE status IN
 * ('queued','processing')` — because a record may legitimately have many
 * completed jobs and only ever one outstanding. PostgREST cannot target a
 * partial index by column list, so `onConflict: "kind,entity_id"` fails with
 * "there is no unique or exclusion constraint matching the ON CONFLICT
 * specification". It did, on the first run, and enqueued nothing while the
 * caller reported "everything is already queued or done".
 *
 * That is the second time an upsert against an index PostgREST cannot name has
 * silently produced zero rows in this codebase. So: read what is already
 * outstanding, filter, plain insert. The index still enforces the rule against
 * a concurrent press; this just avoids relying on ON CONFLICT to do it.
 *
 * Returns the number enqueued, or throws. A caller cannot tell "nothing to do"
 * from "the write failed" if both return 0.
 */
export async function enqueue(
  jobs: { kind: Kind; entityId: string; label: string }[],
  trigger: "manual" | "bulk" | "content_change" | "backfill" = "bulk",
): Promise<number> {
  if (jobs.length === 0) return 0;

  const db = createServiceClient();

  const { data: outstanding, error: readError } = await db
    .from("seo_jobs")
    .select("kind, entity_id")
    .in("status", ["queued", "processing"]);

  if (readError) throw new Error(`reading the queue: ${readError.message}`);

  const pending = new Set(
    (outstanding ?? []).map((row) => `${row.kind}:${row.entity_id}`),
  );

  const fresh = jobs.filter((job) => !pending.has(`${job.kind}:${job.entityId}`));
  if (fresh.length === 0) return 0;

  const { data, error } = await db
    .from("seo_jobs")
    .insert(
      fresh.map((job) => ({
        kind: job.kind,
        entity_id: job.entityId,
        label: job.label,
        trigger,
        status: "queued" as const,
      })),
    )
    .select("id");

  if (error) throw new Error(`enqueue: ${error.message}`);
  return data?.length ?? 0;
}

/** What the admin shows. Four counts, each a real query. */
export async function jobCounts(): Promise<JobCounts> {
  const db = createServiceClient();
  const counts: JobCounts = { queued: 0, processing: 0, completed: 0, failed: 0 };

  for (const status of Object.keys(counts) as (keyof JobCounts)[]) {
    const { count } = await db
      .from("seo_jobs")
      .select("id", { count: "exact", head: true })
      .eq("status", status);
    counts[status] = count ?? 0;
  }

  return counts;
}

/**
 * Take one batch and process it. Called by the cron route.
 *
 * Claiming is one UPDATE per job with `status = 'queued'` in the WHERE clause,
 * so two workers running at once cannot take the same row: the second update
 * matches nothing and that worker moves on. A SELECT-then-UPDATE would let both
 * read the same row before either wrote.
 */
export async function drain(): Promise<{ processed: number; failed: number }> {
  const db = createServiceClient();

  /*
    Anything a dead worker was holding comes back first.

    The error is read rather than thrown on: a queue that cannot reclaim is
    still a queue that can drain, and failing the whole run because a
    housekeeping call did not work would turn a small problem into a stopped
    system.
  */
  const { error: requeueError } = await db.rpc("requeue_stuck_seo_jobs");
  if (requeueError) {
    console.error(`[seo-queue] requeue: ${requeueError.message}`);
  }

  const { data: candidates } = await db
    .from("seo_jobs")
    .select("id, kind, entity_id, label, attempts, max_attempts, trigger")
    .eq("status", "queued")
    .order("queued_at")
    .limit(DRAIN_BATCH);

  let processed = 0;
  let failed = 0;

  for (const job of candidates ?? []) {
    const { data: claimed } = await db
      .from("seo_jobs")
      .update({
        status: "processing",
        started_at: new Date().toISOString(),
        attempts: job.attempts + 1,
      })
      .eq("id", job.id)
      .eq("status", "queued")
      .select("id")
      .maybeSingle();

    // Somebody else took it between the read and the claim. Not an error.
    if (!claimed) continue;

    try {
      const runId = await process(job.kind as Kind, job.entity_id, String(job.trigger));

      await db
        .from("seo_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
          run_id: runId,
          error: null,
        })
        .eq("id", job.id);

      processed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const exhausted = job.attempts + 1 >= job.max_attempts;

      /*
        A job with attempts left goes back to `queued` rather than `failed`.
        §94 asks for failed jobs to be retryable, and the honest way to do that
        is to retry automatically until the attempts are spent, then stop and
        leave the reason visible.
      */
      await db
        .from("seo_jobs")
        .update({
          status: exhausted ? "failed" : "queued",
          started_at: null,
          finished_at: exhausted ? new Date().toISOString() : null,
          error: message,
        })
        .eq("id", job.id);

      if (exhausted) failed += 1;
      console.error(`[seo-queue] ${job.kind} ${job.label}: ${message}`);
    }
  }

  return { processed, failed };
}

/** Dispatch one job to the engine. Throws on failure; `drain` records it. */
async function process(
  kind: Kind,
  entityId: string,
  trigger: string,
): Promise<string | null> {
  const { runListingSeo, runPlaceSeo } = await import("@/lib/seo/engine/run");
  const { articleKeywords, cityKeywords, communityKeywords } = await import(
    "@/lib/seo/engine/keywords"
  );
  const t = trigger as "publish" | "manual" | "bulk" | "content_change" | "backfill";

  if (kind === "listing") {
    const { getAdminListingById } = await import("@/lib/queries/admin");
    const { getListingBySlug } = await import("@/lib/queries/listings");
    const admin = await getAdminListingById(entityId);
    if (!admin) throw new Error("The listing no longer exists.");
    const listing = await getListingBySlug(admin.slug);
    if (!listing) throw new Error("The listing is not published.");
    const outcome = await runListingSeo(listing, t);
    return outcome?.runId ?? null;
  }

  if (kind === "city") {
    const { getCities } = await import("@/lib/queries/cities");
    const city = (await getCities()).find((c) => c.id === entityId);
    if (!city) throw new Error("The city no longer exists or is unpublished.");
    const outcome = await runPlaceSeo(
      { kind: "city", id: city.id, citySlug: city.slug },
      (geo) => cityKeywords({ name: city.name, county: city.county }, geo),
      t,
    );
    return outcome?.runId ?? null;
  }

  if (kind === "community") {
    const { getCommunities } = await import("@/lib/queries/cities");
    const community = (await getCommunities()).find((c) => c.id === entityId);
    if (!community) throw new Error("The community no longer exists or is unpublished.");
    const outcome = await runPlaceSeo(
      {
        kind: "community",
        id: community.id,
        citySlug: community.city.slug,
        communitySlug: community.slug,
      },
      (geo) =>
        communityKeywords({ name: community.name, cityName: community.city.name }, geo),
      t,
    );
    return outcome?.runId ?? null;
  }

  const { getArticles } = await import("@/lib/queries/articles");
  const article = (await getArticles({ limit: 500 })).find((a) => a.id === entityId);
  if (!article) throw new Error("The article no longer exists or is unpublished.");
  const outcome = await runPlaceSeo(
    { kind: "article", id: article.id, citySlug: article.city?.slug ?? null },
    (geo) =>
      articleKeywords(
        {
          title: article.title,
          kind: article.kind,
          tags: article.tags,
          cityName: article.city?.name ?? null,
        },
        geo,
      ),
    t,
  );
  return outcome?.runId ?? null;
}
