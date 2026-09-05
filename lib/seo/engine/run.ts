import "server-only";

import { recordAudit } from "@/lib/auth/audit";
import { ENGINE_VERSION, listingKeywords } from "@/lib/seo/engine/keywords";
import { validateKeywords, verifiedFeaturesOf } from "@/lib/seo/engine/validate";
import { persistListingGeo, resolveListingGeo } from "@/lib/seo/geo/relevance";
import { createServiceClient } from "@/lib/supabase/service";
import type { Listing } from "@/types/domain";

/**
 * One SEO engine run, recorded (brief §26, §32, §34, §35).
 *
 * ── What a "run" is ───────────────────────────────────────────────────────
 *
 * Everything the engine did for one record, in one transaction of thought:
 * resolve its geography, compose its keywords, validate them, store what
 * survived, and write a row saying what changed and why. §34 requires the row;
 * without it "the AI rewrote my copy" has no answer.
 *
 * ── Review versus auto (§32) ──────────────────────────────────────────────
 *
 * `mode` decides whether the output is applied or parked. In `review` the run
 * completes with `approved_at` null and the keywords are still written — they
 * are visible in the admin, and the PUBLIC read is what gates them. That is
 * why `seo_keywords` has an `excluded` column and the public policy filters on
 * it: a proposal that is stored but not exposed is reviewable; a proposal held
 * only in a jsonb blob is not.
 *
 * Internal links are stricter, because a link is a change to the page rather
 * than to its metadata: `seo_internal_links` starts at `proposed` and the
 * public policy admits only `accepted`, in both modes.
 *
 * ── Why the run row is written before the work ────────────────────────────
 *
 * A crash mid-generation should leave evidence. A row created at the end
 * records only successes, which makes "it silently did nothing" indistinguishable
 * from "it was never asked".
 */

export const PROMPT_VERSION = "listing-seo/2026-09-05";

export type RunOutcome = {
  runId: string;
  keywordsStored: number;
  keywordsRejected: { keyword: string; reason: string }[];
  geoPlaces: number;
  mode: "review" | "auto";
};

type Settings = {
  mode: "review" | "auto";
  enableListings: boolean;
  enableGeographic: boolean;
  enableKeywords: boolean;
  requireGeoRelevance: boolean;
  requireVerifiedFeatures: boolean;
  blockKeywordStuffing: boolean;
};

/**
 * Read the engine settings, falling back to the safe position.
 *
 * The fallback is not "everything on". If the settings row cannot be read, the
 * engine should behave as though every safety rule is enabled and the mode is
 * review — a failure to read configuration must never be the reason a system
 * starts writing unreviewed copy.
 */
export async function getSeoSettings(): Promise<Settings> {
  const safe: Settings = {
    mode: "review",
    enableListings: true,
    enableGeographic: true,
    enableKeywords: true,
    requireGeoRelevance: true,
    requireVerifiedFeatures: true,
    blockKeywordStuffing: true,
  };

  try {
    const db = createServiceClient();
    const { data } = await db.from("seo_settings").select("*").eq("id", 1).maybeSingle();
    if (!data) return safe;

    return {
      mode: data.mode as "review" | "auto",
      enableListings: data.enable_listings,
      enableGeographic: data.enable_geographic,
      enableKeywords: data.enable_keywords,
      requireGeoRelevance: data.require_geo_relevance,
      requireVerifiedFeatures: data.require_verified_features,
      blockKeywordStuffing: data.block_keyword_stuffing,
    };
  } catch {
    return safe;
  }
}

/**
 * Run the engine for one listing.
 *
 * Returns what happened. Never throws for a content reason — a listing with no
 * geography produces an empty run and a recorded explanation, not an exception
 * that fails the publish that called it.
 */
export async function runListingSeo(
  listing: Listing,
  trigger: "publish" | "manual" | "bulk" | "content_change" | "backfill",
): Promise<RunOutcome | null> {
  const settings = await getSeoSettings();
  if (!settings.enableListings) return null;

  const db = createServiceClient();

  // The run row first, so a crash leaves a trace. See the note above.
  const { data: run, error: runError } = await db
    .from("seo_generation_runs")
    .insert({
      listing_id: listing.id,
      trigger,
      status: "processing",
      engine_version: ENGINE_VERSION,
      prompt_version: PROMPT_VERSION,
      // No model: this run is deterministic. Recording one would misattribute
      // composed output to a model that was never called.
      model: null,
    })
    .select("id")
    .single();

  if (runError || !run) {
    console.error(`[seo-engine] could not open a run: ${runError?.message}`);
    return null;
  }

  try {
    const before = await snapshot(db, listing.id);

    /* ── Geography ─────────────────────────────────────────────────────── */

    const geo = settings.enableGeographic
      ? await resolveListingGeo({
          citySlug: listing.city.slug,
          communitySlug: listing.community?.slug ?? null,
        })
      : [];

    if (settings.enableGeographic) await persistListingGeo(listing.id, geo);

    /* ── Keywords ──────────────────────────────────────────────────────── */

    let stored = 0;
    let rejected: { keyword: string; reason: string }[] = [];

    if (settings.enableKeywords) {
      const composed = listingKeywords(listing, geo);
      const result = validateKeywords(composed, {
        geo,
        verifiedFeatures: verifiedFeaturesOf(listing),
        settings: {
          requireGeoRelevance: settings.requireGeoRelevance,
          requireVerifiedFeatures: settings.requireVerifiedFeatures,
          blockKeywordStuffing: settings.blockKeywordStuffing,
        },
      });
      rejected = result.rejected;

      /*
        Replace the generated set, keep the human one.

        Keywords a person pinned or excluded survive a regeneration untouched —
        the same contract `persistListingGeo` honours for geography. An engine
        that discards an operator's decision the next time a price changes is an
        engine they stop using.
      */
      const { data: keep } = await db
        .from("seo_keywords")
        .select("id, keyword")
        .eq("listing_id", listing.id)
        .or("pinned.eq.true,excluded.eq.true");

      const keepIds = (keep ?? []).map((r) => r.id);
      let del = db.from("seo_keywords").delete().eq("listing_id", listing.id);
      if (keepIds.length > 0) del = del.not("id", "in", `(${keepIds.join(",")})`);
      await del;

      /*
        Plain INSERT, not upsert, and the collisions are filtered out first.

        The unique index is on `(listing_id, lower(keyword))` — case-insensitive
        on purpose, because "Homes For Sale" and "homes for sale" are one
        keyword. PostgREST cannot target an expression index by column list, so
        `onConflict: "listing_id,keyword"` failed with "there is no unique or
        exclusion constraint matching the ON CONFLICT specification" and every
        run stored nothing. It reported success, because the error was logged
        and `stored` stayed 0 — which is how six listings produced no keywords
        while the runs all completed.

        Everything not pinned or excluded was just deleted, so the only possible
        collision is with a row a person chose to keep. Dropping those from the
        insert is not merely avoiding an error: it is the correct outcome, since
        the human row should win.
      */
      const held = new Set((keep ?? []).map((r) => r.keyword.toLowerCase()));
      const toInsert = result.accepted.filter(
        (k) => !held.has(k.keyword.toLowerCase()),
      );

      if (toInsert.length > 0) {
        const { error } = await db.from("seo_keywords").insert(
          toInsert.map((k) => ({
            listing_id: listing.id,
            keyword: k.keyword,
            kind: k.kind,
            intent: k.intent,
            geo_entity_id: k.geoEntityId,
            evidence: k.evidence,
            score: k.score,
            run_id: run.id,
          })),
        );

        if (error) {
          /*
            Rethrown, not logged and swallowed. A failed write here means the
            run produced nothing, and a run that records `completed` while
            storing nothing is exactly the silent failure above. The catch
            below marks it `failed` with the message.
          */
          throw new Error(`storing keywords: ${error.message}`);
        }
        stored = toInsert.length;
      }
    }

    const after = await snapshot(db, listing.id);

    await db
      .from("seo_generation_runs")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        before_data: before,
        after_data: after,
        changes: {
          keywordsStored: stored,
          keywordsRejected: rejected,
          geoPlaces: geo.length,
        },
        /*
          §32. In auto mode the run is approved by the system as it completes;
          in review mode it stays unapproved and appears in the review queue.
          `approved_by` is left null either way — it names a person, and
          recording "the machine" as a person is how an audit trail stops being
          one.
        */
        approved_at: settings.mode === "auto" ? new Date().toISOString() : null,
      })
      .eq("id", run.id);

    await recordAudit({
      action: settings.mode === "auto" ? "seo_auto_applied" : "seo_generated",
      entityType: "listings",
      entityId: listing.id,
      metadata: {
        runId: run.id,
        keywordsStored: stored,
        keywordsRejected: rejected.length,
        geoPlaces: geo.length,
        trigger,
      },
    });

    return {
      runId: run.id,
      keywordsStored: stored,
      keywordsRejected: rejected,
      geoPlaces: geo.length,
      mode: settings.mode,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .from("seo_generation_runs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error: message,
      })
      .eq("id", run.id);

    console.error(`[seo-engine] run ${run.id} failed:`, error);
    return null;
  }
}

/**
 * What the engine's output looks like right now, for the before/after pair.
 *
 * Deliberately small: the keyword phrases and their kinds, not every column.
 * §34 wants a diff a person can read, and a snapshot containing timestamps and
 * ids produces a diff where every row appears changed on every run.
 */
async function snapshot(
  db: ReturnType<typeof createServiceClient>,
  listingId: string,
): Promise<{ keywords: { keyword: string; kind: string; intent: string }[] }> {
  const { data } = await db
    .from("seo_keywords")
    .select("keyword, kind, intent")
    .eq("listing_id", listingId)
    .order("score", { ascending: false });

  /*
    Cast at the boundary, not `any` throughout. The enum columns come back as
    the generated union type, and the snapshot is a jsonb document whose shape
    is this function's contract rather than the database's.
  */
  return {
    keywords: (data ?? []).map((row) => ({
      keyword: row.keyword,
      kind: String(row.kind),
      intent: String(row.intent),
    })),
  };
}
