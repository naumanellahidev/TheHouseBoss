import "server-only";

import { recordAudit } from "@/lib/auth/audit";
import {
  autoArticleDescription,
  autoArticleTitle,
  autoCityDescription,
  autoCommunityDescription,
  autoListingDescription,
  autoListingTitle,
  inBand,
  trimTitle,
} from "@/lib/seo/auto/generate";
import { polishDescription } from "@/lib/seo/auto/ollama";
import { createServiceClient } from "@/lib/supabase/service";
import type { Article, City, Community, Listing } from "@/types/domain";

/**
 * Generate and persist SEO for a record.
 *
 * Called from the publish actions. Never from a render — a page must never wait
 * on a model, and `seo_pages` is the cache that makes sure it never does.
 *
 * ── Why this cannot fail a publish ────────────────────────────────────────
 *
 * Every step degrades. The deterministic generator always produces something
 * valid; the model can only replace it with something equally valid; and the
 * upsert is wrapped so that a database problem writing SEO does not roll back
 * the publish that triggered it. A listing going live is the operation that
 * matters — its meta description is not worth blocking it for.
 *
 * ── Why the admin's own text is preferred ─────────────────────────────────
 *
 * A hand-written description that is already in band wins over anything
 * generated. Generation exists so nobody HAS to write one, not so that nobody
 * MAY. What changed is that a short hand-written value no longer silently
 * disappears at render — it is replaced deliberately here, and the audit log
 * records that it was.
 */

type Result = { description: string; title: string; usedModel: boolean };

async function upsert(
  path: string,
  title: string,
  description: string,
): Promise<void> {
  /*
    Refuse to send something the database will reject.

    `seo_pages` has `check (char_length(description) between 140 and 158)`, so
    an out-of-band value is a failed write and a logged error — and the page
    then silently keeps whatever it had. Catching it here means the generator
    bug is reported as a generator bug, at the path that produced it, instead of
    as a Postgres constraint violation. This fired for five of eight cities
    before `BRAND_TAILS` was added to the padder.
  */
  if (!inBand(description)) {
    console.error(
      `[seo] refusing to write ${path}: description is ${description.trim().length} chars, outside 140-158`,
    );
    return;
  }

  try {
    const db = createServiceClient();
    const { error } = await db
      .from("seo_pages")
      .upsert(
        { path, title, description, updated_at: new Date().toISOString() },
        { onConflict: "path" },
      );

    if (error) {
      // The CHECK constraint on seo_pages is the last line of defence: it
      // physically cannot store a description outside 140–158. If we land here
      // the generator produced something out of band, which is a bug worth
      // seeing rather than a condition to handle.
      console.error(`[seo] could not persist ${path}: ${error.message}`);
    }
  } catch (error) {
    console.error(`[seo] upsert threw for ${path}:`, error);
  }
}

/** Prefer the admin's text when it is usable; otherwise generate. */
async function resolve(
  existing: string | null,
  fallback: string,
  source: string,
  kind: "listing" | "article" | "city" | "community",
): Promise<{ text: string; usedModel: boolean }> {
  if (inBand(existing)) return { text: existing!.trim(), usedModel: false };
  return polishDescription({ fallback, source, kind });
}

export async function ensureListingSeo(listing: Listing): Promise<Result> {
  const fallback = autoListingDescription(listing);
  const title = trimTitle(listing.metaTitle || autoListingTitle(listing));

  const source = [
    `${listing.address}, ${listing.city.name}, Florida`,
    listing.beds ? `${listing.beds} bedrooms` : "",
    listing.baths ? `${listing.baths} bathrooms` : "",
    listing.sqft ? `${listing.sqft} square feet` : "",
    listing.yearBuilt ? `built ${listing.yearBuilt}` : "",
    listing.description ?? "",
  ]
    .filter(Boolean)
    .join(". ");

  const { text, usedModel } = await resolve(
    listing.metaDesc,
    fallback,
    source,
    "listing",
  );

  await upsert(`/listing/${listing.slug}`, title, text);
  return { description: text, title, usedModel };
}

export async function ensureArticleSeo(
  article: Article,
  path: string,
): Promise<Result> {
  const fallback = autoArticleDescription(article);
  const title = trimTitle(article.metaTitle || autoArticleTitle(article));
  const source = `${article.title}. ${(article.bodyText ?? "").slice(0, 600)}`;

  const { text, usedModel } = await resolve(
    article.metaDesc,
    fallback,
    source,
    "article",
  );

  await upsert(path, title, text);
  return { description: text, title, usedModel };
}

export async function ensureCitySeo(city: City): Promise<Result> {
  const fallback = autoCityDescription(city);
  const title = trimTitle(city.metaTitle || `${city.name}, FL Homes for Sale`);
  const source = `${city.name}, ${city.county} County, Florida. ${(city.introMd ?? "").slice(0, 600)}`;

  const { text, usedModel } = await resolve(city.metaDesc, fallback, source, "city");
  await upsert(`/${city.slug}`, title, text);
  return { description: text, title, usedModel };
}

export async function ensureCommunitySeo(community: Community): Promise<Result> {
  const fallback = autoCommunityDescription(community);
  const title = trimTitle(
    community.metaTitle || `${community.name} Homes for Sale`,
  );
  const source = `${community.name}. ${(community.introMd ?? "").slice(0, 600)}`;

  const { text, usedModel } = await resolve(
    community.metaDesc,
    fallback,
    source,
    "community",
  );
  await upsert(`/communities/${community.slug}`, title, text);
  return { description: text, title, usedModel };
}

/**
 * Fire-and-forget wrapper for a publish action.
 *
 * The publish has already succeeded by the time this runs, so the only correct
 * behaviour on failure is to log it. Awaited rather than detached because a
 * serverless function can be frozen the moment its response is returned, and a
 * detached promise there simply never completes.
 */
export async function ensureSeoQuietly(
  work: () => Promise<Result>,
  label: string,
): Promise<void> {
  try {
    const result = await work();
    await recordAudit({
      action: "seo_updated",
      entityType: "seo_pages",
      entityId: label,
      metadata: {
        usedModel: result.usedModel,
        length: result.description.length,
      },
    });
  } catch (error) {
    console.error(`[seo] generation failed for ${label}:`, error);
  }
}

/* ── Entry points for the publish actions ─────────────────────────────────── */

/**
 * Regenerate SEO for a listing identified by slug.
 *
 * Takes a slug rather than a `Listing` because that is what every publish
 * action already has in hand after its write, and re-reading is what makes the
 * generated copy reflect what was actually SAVED rather than what was
 * submitted — the two differ whenever a trigger or a default touches the row.
 *
 * Silent on a miss. An unpublished listing is invisible to the public read, and
 * an unpublished listing has no SEO worth generating.
 */
export async function syncListingSeo(slug: string): Promise<void> {
  const { getListingBySlug } = await import("@/lib/queries/listings");
  await ensureSeoQuietly(async () => {
    const listing = await getListingBySlug(slug);
    if (!listing) throw new Error(`no published listing at ${slug}`);

    /*
      The engine runs before the copy is written, because the copy depends on
      its geography (brief §6, §27). A listing that moved city must not keep the
      old city's relevance rows for even one generation — that is exactly how a
      false location claim reaches a page.

      Its own try/catch. An engine that is not yet configured, or a graph that
      has not been seeded, should cost the listing its keywords — not its
      metadata, and certainly not the publish that called this.
    */
    try {
      const { runListingSeo } = await import("@/lib/seo/engine/run");
      await runListingSeo(listing, "publish");
    } catch (error) {
      console.error(`[seo-engine] could not run for ${slug}:`, error);
    }

    return ensureListingSeo(listing);
  }, `/listing/${slug}`);
}

export async function syncArticleSeo(slug: string): Promise<void> {
  const { getArticleBySlug } = await import("@/lib/queries/articles");
  const { articleHref } = await import("@/lib/utils/routes");
  await ensureSeoQuietly(async () => {
    const article = await getArticleBySlug(slug);
    if (!article) throw new Error(`no published article at ${slug}`);
    return ensureArticleSeo(article, articleHref(article));
  }, `article:${slug}`);
}

export async function syncCitySeo(slug: string): Promise<void> {
  const { getCityBySlug } = await import("@/lib/queries/cities");
  await ensureSeoQuietly(async () => {
    const city = await getCityBySlug(slug);
    if (!city) throw new Error(`no published city at ${slug}`);
    return ensureCitySeo(city);
  }, `/${slug}`);
}

export async function syncCommunitySeo(slug: string): Promise<void> {
  const { getCommunityBySlug } = await import("@/lib/queries/cities");
  await ensureSeoQuietly(async () => {
    const community = await getCommunityBySlug(slug);
    if (!community) throw new Error(`no published community at ${slug}`);
    return ensureCommunitySeo(community);
  }, `/communities/${slug}`);
}
