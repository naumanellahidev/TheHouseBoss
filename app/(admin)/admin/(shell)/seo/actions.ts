"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { markMaintenanceRun } from "@/lib/queries/settings";
import { inBand } from "@/lib/seo/auto/generate";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * SEO maintenance actions.
 *
 * ── What "refresh" actually means ─────────────────────────────────────────
 *
 * `app/sitemap.ts` and `app/llms.txt/route.ts` are generated from published
 * rows on request, but both carry `export const revalidate = 3600`. So they are
 * never STALE in the sense of being wrong — they are up to an hour behind. That
 * hour is the entire reason this button exists, and it is why the copy on the
 * page says "refresh now" rather than "regenerate": there is no file to rebuild.
 *
 * ── Why nothing is pinged ─────────────────────────────────────────────────
 *
 * Google retired the sitemap ping endpoint in 2023; it now returns 404 and the
 * documentation says to stop calling it. Bing's IndexNow works but requires a
 * key file served from the domain root, which is a separate decision and a
 * separate migration. Rather than fire a request that quietly fails, this
 * refreshes the cache and stamps when it happened. The UI says exactly that.
 */

export type SeoActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function refreshSitemap(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  try {
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath("/robots.txt");

    await markMaintenanceRun("last_sitemap_ping");

    await recordAudit({
      action: "sitemap_refreshed",
      entityType: "site_settings",
      entityId: "1",
      metadata: { paths: ["/sitemap.xml", "/llms.txt", "/robots.txt"] },
    });

    revalidatePath("/admin/seo");
    return {
      ok: true,
      message:
        "Sitemap, llms.txt and robots.txt now rebuild on the next request. Search engines will pick the changes up on their own schedule.",
    };
  } catch (error) {
    console.error("[refreshSitemap]", error);
    return { ok: false, error: "The refresh did not finish. Try again." };
  }
}

/* ── Generation ───────────────────────────────────────────────────────────── */

/**
 * Regenerate metadata for one published record.
 *
 * The path IS the address here — it is what `seo_pages` is keyed on and what
 * the admin sees. Deriving the record back out of it keeps the button on the
 * row it belongs to instead of needing a record id the table does not carry.
 */
export async function generateForPath(path: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { syncListingSeo, syncArticleSeo, syncCitySeo, syncCommunitySeo } =
    await import("@/lib/seo/auto/apply");

  const listing = /^\/listing\/([^/]+)$/.exec(path);
  const community = /^\/communities\/([^/]+)$/.exec(path);
  const marketUpdate = /^\/market-updates\/([^/]+)$/.exec(path);
  const blog = /^\/lake-mary\/blog\/([^/]+)$/.exec(path);
  const city = /^\/([^/]+)$/.exec(path);

  try {
    if (listing) await syncListingSeo(listing[1]);
    else if (community) await syncCommunitySeo(community[1]);
    else if (marketUpdate) await syncArticleSeo(marketUpdate[1]);
    else if (blog) await syncArticleSeo(blog[1]);
    else if (city) await syncCitySeo(city[1]);
    else {
      return {
        ok: false,
        error: `Nothing is generated for ${path} — it is not a listing, article, city or community page.`,
      };
    }
  } catch (error) {
    console.error(`[generateForPath] ${path}`, error);
    return { ok: false, error: "Generation failed. Try again." };
  }

  revalidatePath(path);
  revalidatePath("/admin/seo");
  return { ok: true, message: `Regenerated ${path}.` };
}

/**
 * Fill every gap: generate for published pages that have no row yet.
 *
 * ── Why gaps only, and never a blanket overwrite ──────────────────────────
 *
 * Regenerating rows that already exist would silently replace a hand-written
 * override with a generated one — the admin's own words, discarded by a button
 * labelled "generate". Anything already covered is left alone; the per-row
 * Regenerate button is how a single page is deliberately redone.
 *
 * ── Why it is capped ──────────────────────────────────────────────────────
 *
 * Each record may make one model call at roughly a second and a half. A server
 * action that runs for minutes is one that times out on Vercel with half the
 * work done and no way to tell which half. The cap makes it resumable: the UI
 * says how many are left and the button runs again.
 */
const BATCH = 25;

export async function generateMissingSeo(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { getSeoCoverage } = await import("@/lib/queries/platform");
  const coverage = await getSeoCoverage();
  const targets = coverage.groups.flatMap((g) => g.missing);

  if (targets.length === 0) {
    return {
      ok: true,
      message: "Every published page already has generated metadata.",
    };
  }

  const batch = targets.slice(0, BATCH);

  /*
    Four at a time, not one. Sequentially this loop was 25 model calls at about
    a second and a half each — nearly forty seconds of a server action waiting
    on a socket, which on Vercel is close enough to the timeout to be a real
    risk. See `lib/seo/auto/pool.ts` for why four and not twenty-five.
  */
  const { mapWithConcurrency, SEO_CONCURRENCY } = await import(
    "@/lib/seo/auto/pool"
  );
  const outcomes = await mapWithConcurrency(batch, SEO_CONCURRENCY, (path) =>
    generateForPath(path),
  );
  const done = outcomes.filter((result) => result.ok).length;

  revalidatePath("/admin/seo");
  const left = targets.length - batch.length;
  return {
    ok: true,
    message:
      `Generated ${done} of ${batch.length}.` +
      (left > 0 ? ` ${left} still to do — press it again.` : " Nothing left."),
  };
}

/* ── Overrides ────────────────────────────────────────────────────────────── */

const overrideSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, "A path starts with a slash, e.g. /lake-mary"),
  title: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  canonicalUrl: z.string().trim().max(500).optional().or(z.literal("")),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
});

export async function saveSeoOverride(raw: unknown): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const parsed = overrideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  const v = parsed.data;

  /*
    The 140–158 rule is a CHECK constraint, so a short description is rejected
    by Postgres with a message no one should have to read. Saying it here, in
    the admin's own words and with the actual count, is the difference between
    a correctable mistake and a mysterious failure.
  */
  if (v.description && !inBand(v.description)) {
    return {
      ok: false,
      error: `A description must be 140–158 characters. That one is ${v.description.length}. Leave it blank to have one generated instead.`,
    };
  }

  const db = createServiceClient();
  const { error } = await db.from("seo_pages").upsert(
    {
      path: v.path,
      title: v.title || null,
      description: v.description || null,
      canonical_url: v.canonicalUrl || null,
      noindex: v.noindex,
      nofollow: v.nofollow,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "path" },
  );

  if (error) {
    console.error(`[saveSeoOverride] ${error.message}`);
    return { ok: false, error: "That override could not be saved." };
  }

  await recordAudit({
    action: "seo_updated",
    entityType: "seo_pages",
    entityId: v.path,
    metadata: { manual: true, noindex: v.noindex, nofollow: v.nofollow },
  });

  revalidatePath(v.path);
  revalidatePath("/admin/seo");
  return { ok: true, message: `Saved the override for ${v.path}.` };
}

export async function deleteSeoOverride(path: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { error } = await db.from("seo_pages").delete().eq("path", path);
  if (error) return { ok: false, error: "That override could not be removed." };

  await recordAudit({
    action: "seo_updated",
    entityType: "seo_pages",
    entityId: path,
    metadata: { deleted: true },
  });

  revalidatePath(path);
  revalidatePath("/admin/seo");
  return {
    // Not destructive, and the copy should say so rather than sound like a loss.
    ok: true,
    message: `Removed. ${path} falls back to its generated metadata.`,
  };
}

/* ── Redirects ────────────────────────────────────────────────────────────── */

const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, "The old path starts with a slash."),
  toPath: z.string().trim().min(1).max(500),
  statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
});

export async function createRedirect(raw: unknown): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const parsed = redirectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  const v = parsed.data;

  if (v.fromPath === v.toPath) {
    return { ok: false, error: "That would redirect a URL to itself." };
  }

  const db = createServiceClient();
  const { error } = await db.from("redirects").upsert(
    { from_path: v.fromPath, to_path: v.toPath, status_code: v.statusCode },
    { onConflict: "from_path" },
  );

  if (error) {
    console.error(`[createRedirect] ${error.message}`);
    return { ok: false, error: "That redirect could not be saved." };
  }

  await recordAudit({
    action: "redirect_created",
    entityType: "redirects",
    entityId: v.fromPath,
    metadata: { to: v.toPath, status: v.statusCode },
  });

  revalidatePath(v.fromPath);
  revalidatePath("/admin/seo");
  return { ok: true, message: `${v.fromPath} now redirects to ${v.toPath}.` };
}

export async function deleteRedirect(id: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("redirects")
    .delete()
    .eq("id", id)
    .select("from_path")
    .maybeSingle();

  if (error) return { ok: false, error: "That redirect could not be removed." };

  await recordAudit({
    action: "redirect_deleted",
    entityType: "redirects",
    entityId: id,
    metadata: { from: data?.from_path ?? null },
  });

  if (data?.from_path) revalidatePath(data.from_path);
  revalidatePath("/admin/seo");
  return {
    ok: true,
    /*
      HR11 is why this warns rather than merely confirming. A redirect written
      by the slug trigger is the only thing keeping an already-indexed URL from
      returning 404, and deleting one does not look destructive from in here.
    */
    message: data?.from_path
      ? `Removed. ${data.from_path} will now return 404 if anything still links to it.`
      : "Removed.",
  };
}

/* ── §30, §93. The health audit ───────────────────────────────────────────── */

/**
 * Run the audit and return it.
 *
 * Not cached and not stored. §93 says do not fake progress, and the honest
 * version of that is to compute it when asked: the report is a set of counts
 * over the current rows, it takes well under a second, and a stored report is
 * one that can be stale without saying so.
 */
export async function runAudit() {
  try {
    await requirePermission("manage_seo");
  } catch {
    return null;
  }

  const { runSeoAudit } = await import("@/lib/seo/engine/audit");
  return runSeoAudit();
}

/* ── §32. Approving what the engine proposed ──────────────────────────────── */

export async function setLinkStatus(
  id: string,
  status: "accepted" | "rejected",
): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("seo_internal_links")
    .update({ status })
    .eq("id", id)
    .select("to_path")
    .maybeSingle();

  if (error) return { ok: false, error: "That could not be saved." };

  await recordAudit({
    action: status === "accepted" ? "seo_approved" : "seo_rejected",
    entityType: "seo_internal_links",
    entityId: id,
    metadata: { to: data?.to_path ?? null, status },
  });

  revalidatePath("/admin/seo");
  return {
    ok: true,
    message:
      status === "accepted"
        ? `The link to ${data?.to_path} will now appear on the page.`
        : "Rejected. It will not be suggested again.",
  };
}

/**
 * Keep or drop one generated keyword (§32, §57).
 *
 * Both flags survive regeneration — that is the contract `run.ts` honours — so
 * this is how an operator's judgement becomes permanent rather than being
 * overwritten the next time the listing is saved.
 */
export async function setKeywordFlag(
  id: string,
  flag: "pinned" | "excluded",
  value: boolean,
): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();

  /*
    Pinned and excluded are mutually exclusive. Setting one clears the other
    rather than leaving a row that claims to be both kept and removed — a state
    the engine would have to guess about.

    Written as two explicit objects rather than one built with
    `Object.fromEntries`: that widens to an index signature the generated types
    reject, and the rejection is right — it also throws away the check that
    these are real column names.
  */
  const { error } =
    flag === "pinned"
      ? await db
          .from("seo_keywords")
          .update(value ? { pinned: true, excluded: false } : { pinned: false })
          .eq("id", id)
      : await db
          .from("seo_keywords")
          .update(value ? { excluded: true, pinned: false } : { excluded: false })
          .eq("id", id);

  if (error) return { ok: false, error: "That could not be saved." };

  await recordAudit({
    action: value ? "seo_approved" : "seo_rejected",
    entityType: "seo_keywords",
    entityId: id,
    metadata: { flag, value },
  });

  revalidatePath("/admin/seo");
  return {
    ok: true,
    message:
      flag === "excluded" && value
        ? "Removed. It will not come back when the phrases are worked out again."
        : "Saved.",
  };
}

/* ── §33, §91. Engine settings ────────────────────────────────────────────── */

const engineSettingsSchema = z.object({
  mode: z.enum(["review", "auto"]),
  enableListings: z.boolean(),
  enableArticles: z.boolean(),
  enableCities: z.boolean(),
  enableCommunities: z.boolean(),
  enableGeographic: z.boolean(),
  enableKeywords: z.boolean(),
  enableInternalLinks: z.boolean(),
  enableSchema: z.boolean(),
  enableContinuous: z.boolean(),
  requireVerifiedFeatures: z.boolean(),
  requireGeoRelevance: z.boolean(),
  blockKeywordStuffing: z.boolean(),
  requireReviewForMajor: z.boolean(),
});

export async function saveEngineSettings(raw: unknown): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const parsed = engineSettingsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Those settings are not valid." };
  const v = parsed.data;

  const db = createServiceClient();
  const { error } = await db
    .from("seo_settings")
    .update({
      mode: v.mode,
      enable_listings: v.enableListings,
      enable_articles: v.enableArticles,
      enable_cities: v.enableCities,
      enable_communities: v.enableCommunities,
      enable_geographic: v.enableGeographic,
      enable_keywords: v.enableKeywords,
      enable_internal_links: v.enableInternalLinks,
      enable_schema: v.enableSchema,
      enable_continuous: v.enableContinuous,
      require_verified_features: v.requireVerifiedFeatures,
      require_geo_relevance: v.requireGeoRelevance,
      block_keyword_stuffing: v.blockKeywordStuffing,
      require_review_for_major: v.requireReviewForMajor,
    })
    .eq("id", 1);

  if (error) {
    console.error(`[saveEngineSettings] ${error.message}`);
    return { ok: false, error: "Those settings could not be saved." };
  }

  /*
    Audited, and the mode is named in the metadata. Switching from review to
    auto is the single most consequential setting on this screen — it is the
    moment the system starts changing the site without anyone looking — and
    "who turned that on, and when" needs an answer.
  */
  await recordAudit({
    action: "settings_updated",
    entityType: "seo_settings",
    entityId: "1",
    metadata: { mode: v.mode },
  });

  revalidatePath("/admin/seo");
  return {
    ok: true,
    message:
      v.mode === "auto"
        ? "Saved. New phrases will be applied automatically; suggested links still wait for you."
        : "Saved. Nothing is applied until you approve it.",
  };
}

/* ── §37. Bulk analysis ───────────────────────────────────────────────────── */

/**
 * Queue every published record for analysis (§36, §37, §94).
 *
 * ── Why this enqueues rather than processes ───────────────────────────────
 *
 * It used to loop, capped at 25, and the cap was the honest admission that a
 * server action cannot run for minutes. A queue removes the cap instead of
 * apologising for it: four hundred records are enqueued in one round trip, the
 * worker drains ten at a time, and nothing is lost when a function is killed
 * mid-batch — the rows are still `queued`.
 *
 * One drain is kicked off immediately so a person pressing the button sees
 * movement rather than a number that only changes in fifteen minutes.
 */
export async function bulkAnalyseListings(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { enqueue, drain, jobCounts } = await import("@/lib/seo/engine/queue");
  const { getListingSlugsForStaticParams, getListingBySlug } = await import(
    "@/lib/queries/listings"
  );
  const { getCities, getCommunities } = await import("@/lib/queries/cities");
  const { getArticles } = await import("@/lib/queries/articles");

  const jobs: { kind: "listing" | "city" | "community" | "article"; entityId: string; label: string }[] = [];

  for (const slug of await getListingSlugsForStaticParams()) {
    const listing = await getListingBySlug(slug);
    if (listing) {
      jobs.push({ kind: "listing", entityId: listing.id, label: listing.address });
    }
  }
  for (const city of await getCities()) {
    jobs.push({ kind: "city", entityId: city.id, label: city.name });
  }
  for (const community of await getCommunities()) {
    jobs.push({ kind: "community", entityId: community.id, label: community.name });
  }
  for (const article of await getArticles({ limit: 500 })) {
    jobs.push({ kind: "article", entityId: article.id, label: article.title });
  }

  /*
    Wrapped, so a write failure is reported as one. `enqueue` throws now rather
    than returning 0 — the first version logged and returned 0, and the caller
    could not tell "nothing to do" from "nothing was written", so it cheerfully
    said everything was already done while the queue was empty.
  */
  let queued: number;
  try {
    queued = await enqueue(jobs, "bulk");
  } catch (error) {
    console.error("[bulkAnalyse]", error);
    return { ok: false, error: "The pages could not be queued. Try again." };
  }

  /*
    Drain once, here, so the button does something visible. The rest is the
    scheduled worker's job — which is what makes this safe to press with four
    hundred records waiting.
  */
  const first = await drain();
  const counts = await jobCounts();

  revalidatePath("/admin/seo");

  if (queued === 0 && counts.queued === 0) {
    return { ok: true, message: "Everything is already queued or done." };
  }

  return {
    ok: true,
    message:
      `Queued ${queued} ${queued === 1 ? "page" : "pages"}. ` +
      `${first.processed} done already; ${counts.queued} still waiting — ` +
      "they are picked up automatically every 15 minutes.",
  };
}

/** Drain the queue now, rather than waiting for the schedule (§94). */
export async function drainQueueNow(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { drain, jobCounts } = await import("@/lib/seo/engine/queue");
  const result = await drain();
  const counts = await jobCounts();

  revalidatePath("/admin/seo");
  return {
    ok: true,
    message:
      counts.queued === 0
        ? `Processed ${result.processed}. The queue is empty.`
        : `Processed ${result.processed}. ${counts.queued} still waiting.`,
  };
}

/** Put failed jobs back in the queue with their attempts reset (§94). */
export async function retryFailedJobs(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("seo_jobs")
    .update({ status: "queued", attempts: 0, error: null, started_at: null })
    .eq("status", "failed")
    .select("id");

  if (error) return { ok: false, error: "They could not be retried." };

  revalidatePath("/admin/seo");
  const count = data?.length ?? 0;
  return {
    ok: true,
    message:
      count === 0
        ? "Nothing has failed."
        : `${count} put back in the queue. They will be tried again shortly.`,
  };
}

/**
 * Accept every suggested link at once (§32, §37).
 *
 * ── Why this is safe to offer as one button ───────────────────────────────
 *
 * Each proposal was already verified when it was made: the target had to be a
 * PUBLISHED page that exists, the anchor comes from that page's own name, and
 * the reason is recorded. So "accept all" is not "trust the machine" — it is
 * "apply the checks that already passed", which is a much smaller act of faith.
 *
 * ── Why rejected ones stay rejected ───────────────────────────────────────
 *
 * Scoped to `status = 'proposed'`. A link the operator has already turned down
 * is not swept back in by a later bulk approval, which would quietly reverse a
 * decision they made deliberately.
 */
export async function acceptAllLinks(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("seo_internal_links")
    .update({ status: "accepted" })
    .eq("status", "proposed")
    .select("id");

  if (error) {
    console.error(`[acceptAllLinks] ${error.message}`);
    return { ok: false, error: "They could not be accepted. Try again." };
  }

  const count = data?.length ?? 0;

  await recordAudit({
    action: "seo_approved",
    entityType: "seo_internal_links",
    entityId: "bulk",
    metadata: { accepted: count },
  });

  /*
    Every page that now carries a new link has to be revalidated, not just the
    admin screen. Revalidating the layout is the blunt instrument and the right
    one here: the links are spread across listings, city pages and community
    pages, and enumerating them would cost more than the rebuild.
  */
  revalidatePath("/", "layout");
  revalidatePath("/admin/seo");

  return {
    ok: true,
    message:
      count === 0
        ? "There was nothing waiting."
        : `Added ${count} ${count === 1 ? "link" : "links"}. They appear on their pages now.`,
  };
}
