"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { deleteImages } from "@/lib/images/store";
import { recordAudit } from "@/lib/auth/audit";
import { getAdminArticleById, getAdminCommunityById } from "@/lib/queries/admin";
import { requireAdmin, createSupabaseServerClient } from "@/lib/supabase/server";
import { articleSchema, type ArticleInput } from "@/lib/validation/article";
import {
  citySchema,
  communitySchema,
  reviewSchema,
  type CityInput,
  type CommunityInput,
  type ReviewInput,
} from "@/lib/validation/place";
import { slugify } from "@/lib/utils";
import type { Json } from "@/types/database";

/**
 * Mutations for the Phase 4 content entities: articles, cities, communities
 * and reviews.
 *
 * One file rather than four `actions.ts` siblings, because all four share the
 * same guard, the same result shape and — importantly — the same revalidation
 * map. A city page shows its articles, an article page shows its city, and a
 * community page shows both; splitting them across four files is how one of
 * those paths gets forgotten.
 *
 * The contract is unchanged from Phase 2: requireAdmin() first, re-validate
 * with the SAME zod schema the form used, write, revalidate every affected
 * public route, and return `{ ok, error? }` rather than throwing.
 */

export type ContentResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

const AUTH_ERROR = "Your session has expired. Sign in again.";

async function guard(): Promise<string | null> {
  try {
    await requireAdmin();
    return null;
  } catch {
    return AUTH_ERROR;
  }
}

function friendly(message: string, kind: string): string {
  if (message.includes("duplicate key") || message.includes("_slug_key")) {
    return "That web address is already used. Change the slug.";
  }
  if (message.includes("faq_is_array") || message.includes("stats_is_object")) {
    return "The questions or statistics were malformed. Reload and try again.";
  }
  console.error(`[${kind}] ${message}`);
  return "That could not be saved. Try again.";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fieldErrors(error: z.ZodError<any>): Record<string, string[]> {
  return z.flattenError(error).fieldErrors as Record<string, string[]>;
}

/* ── Articles ───────────────────────────────────────────────────────────── */

/**
 * Where an article appears on the public site.
 *
 * A market update also lives under /market-updates; a blog post attached to
 * Lake Mary also lives under /lake-mary/blog. Both indexes and both city pages
 * have to be invalidated, or a freshly published article is invisible until the
 * next natural revalidation.
 */
function revalidateArticle(
  slug: string,
  kind: string,
  citySlugs: (string | null)[],
) {
  revalidatePath("/");
  revalidatePath("/market-updates");
  if (kind === "market_update") revalidatePath(`/market-updates/${slug}`);

  for (const city of new Set(citySlugs.filter(Boolean))) {
    revalidatePath(`/${city}`);
    if (city === "lake-mary") {
      revalidatePath("/lake-mary/blog");
      revalidatePath(`/lake-mary/blog/${slug}`);
    }
  }

  revalidatePath("/admin/articles");
  revalidatePath("/admin");
}

function articleRow(input: ArticleInput) {
  return {
    slug: input.slug,
    title: input.title,
    excerpt: input.excerpt ?? null,
    // The DB trigger flattens this into body_text and recomputes reading_min;
    // neither is written from here.
    //
    // The cast is the row boundary: zod validated the SHAPE (a doc with a
    // content array) rather than enumerating every Tiptap node, and the column
    // is plain jsonb. Narrowing further here would mean a second definition of
    // the editor's capabilities that drifts the moment an extension is added.
    body_json: input.bodyJson as unknown as Json,
    kind: input.kind,
    city_id: input.cityId ?? null,
    community_id: input.communityId ?? null,
    tags: input.tags ?? [],
    cover_key: input.coverKey ?? null,
    cover_alt: input.coverAlt ?? null,
    meta_title: input.metaTitle ?? null,
    meta_desc: input.metaDesc ?? null,
    status: input.status,
  };
}

export async function createArticle(
  raw: unknown,
): Promise<ContentResult<{ id: string; slug: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const { user } = await requireAdmin();
  const db = await createSupabaseServerClient();

  const { data, error } = await db
    .from("articles")
    .insert({ ...articleRow(parsed.data), author_id: user.id })
    .select("id, slug, kind, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "createArticle") };

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities;
  revalidateArticle(data.slug, data.kind, [city?.slug ?? null]);

  return { ok: true, data: { id: data.id, slug: data.slug } };
}

export async function saveArticle(
  id: string,
  raw: unknown,
): Promise<ContentResult<{ slug: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = articleSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();

  const { data: before } = await db
    .from("articles")
    .select("slug, kind, cities(slug)")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await db
    .from("articles")
    .update(articleRow(parsed.data))
    .eq("id", id)
    .select("slug, kind, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "saveArticle") };

  const beforeCity = Array.isArray(before?.cities) ? before.cities[0] : before?.cities;
  const afterCity = Array.isArray(data.cities) ? data.cities[0] : data.cities;

  if (before?.slug && before.slug !== data.slug) {
    revalidateArticle(before.slug, before.kind, [beforeCity?.slug ?? null]);
  }
  revalidateArticle(data.slug, data.kind, [
    beforeCity?.slug ?? null,
    afterCity?.slug ?? null,
  ]);

  return { ok: true, data: { slug: data.slug } };
}

export async function deleteArticle(
  id: string,
  confirmation: string,
): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const article = await getAdminArticleById(id);
  if (!article) return { ok: false, error: "That article could not be found." };

  if (confirmation.trim().toLowerCase() !== String(article.title).trim().toLowerCase()) {
    return { ok: false, error: "The title you typed does not match." };
  }

  // Storage first, then the row (docs/07 § 7). The orphan cron reclaims
  // anything storage refused, and article body images are swept the same way.
  const db = await createSupabaseServerClient();
  const { data: media } = await db.from("media").select("key").eq("entity_id", id);
  await deleteImages((media ?? []).map((m) => m.key as string));

  const { error } = await db.from("articles").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message, "deleteArticle") };

  // Title and slug, not just the id: the row is gone by the time anyone reads
  // this, so the entry has to identify what was deleted on its own.
  await recordAudit({
    action: "article_deleted",
    entityType: "article",
    entityId: id,
    metadata: { slug: String(article.slug), title: String(article.title) },
  });

  const city = Array.isArray(article.cities) ? article.cities[0] : article.cities;
  revalidateArticle(
    String(article.slug),
    String(article.kind),
    [(city as { slug?: string } | null)?.slug ?? null],
  );
  return { ok: true };
}

/** Slug from the title, unique across articles. */
export async function suggestArticleSlug(
  title: string,
  exceptId?: string,
): Promise<string> {
  const base = slugify(title) || "article";
  const db = await createSupabaseServerClient();

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let q = db.from("articles").select("id").eq("slug", candidate).limit(1);
    if (exceptId) q = q.neq("id", exceptId);

    const { data } = await q;
    if ((data ?? []).length === 0) return candidate;
  }

  return `${base}-${Date.now().toString(36)}`;
}

/* ── Cities ─────────────────────────────────────────────────────────────── */

function cityRow(input: CityInput) {
  return {
    name: input.name,
    slug: input.slug,
    county: input.county,
    in_search: input.inSearch,
    hero_key: input.heroKey ?? null,
    hero_alt: input.heroAlt ?? null,
    intro_md: input.introMd ?? null,
    body_md: input.bodyMd ?? null,
    // Undefined keys are stripped so the stored object holds only real figures
    // — a null median price would render as a zero somewhere eventually.
    stats_json: Object.fromEntries(
      Object.entries(input.stats).filter(([, v]) => v != null && v !== ""),
    ),
    faq_json: input.faq,
    meta_title: input.metaTitle ?? null,
    meta_desc: input.metaDesc ?? null,
    published: input.published,
  };
}

export async function saveCity(id: string, raw: unknown): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = citySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();
  const { data: before } = await db.from("cities").select("slug").eq("id", id).maybeSingle();

  const { data, error } = await db
    .from("cities")
    .update(cityRow(parsed.data))
    .eq("id", id)
    .select("slug")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "saveCity") };

  for (const slug of new Set([before?.slug, data.slug].filter(Boolean))) {
    revalidatePath(`/${slug}`);
    revalidatePath(`/${slug}/homes-for-sale`);
  }
  revalidatePath("/");
  revalidatePath("/search");
  revalidatePath("/admin/cities");
  return { ok: true };
}

/* ── Communities ────────────────────────────────────────────────────────── */

function communityRow(input: CommunityInput) {
  return {
    name: input.name,
    slug: input.slug,
    city_id: input.cityId,
    hero_key: input.heroKey ?? null,
    hero_alt: input.heroAlt ?? null,
    intro_md: input.introMd ?? null,
    body_md: input.bodyMd ?? null,
    hoa_info: input.hoaInfo ?? null,
    amenities: input.amenities,
    price_range:
      input.priceMin != null || input.priceMax != null
        ? { min: input.priceMin ?? null, max: input.priceMax ?? null }
        : null,
    faq_json: input.faq,
    meta_title: input.metaTitle ?? null,
    meta_desc: input.metaDesc ?? null,
    published: input.published,
  };
}

function revalidateCommunity(slug: string, citySlugs: (string | null)[]) {
  revalidatePath(`/communities/${slug}`);
  for (const city of new Set(citySlugs.filter(Boolean))) {
    revalidatePath(`/${city}`);
    if (city === "lake-mary") revalidatePath("/lake-mary/communities");
  }
  revalidatePath("/admin/communities");
}

export async function createCommunity(
  raw: unknown,
): Promise<ContentResult<{ id: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = communitySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("communities")
    .insert(communityRow(parsed.data))
    .select("id, slug, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "createCommunity") };

  const city = Array.isArray(data.cities) ? data.cities[0] : data.cities;
  revalidateCommunity(data.slug, [city?.slug ?? null]);
  return { ok: true, data: { id: data.id } };
}

export async function saveCommunity(id: string, raw: unknown): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = communitySchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();
  const { data: before } = await db
    .from("communities")
    .select("slug, cities(slug)")
    .eq("id", id)
    .maybeSingle();

  const { data, error } = await db
    .from("communities")
    .update(communityRow(parsed.data))
    .eq("id", id)
    .select("slug, cities(slug)")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "saveCommunity") };

  const beforeCity = Array.isArray(before?.cities) ? before.cities[0] : before?.cities;
  const afterCity = Array.isArray(data.cities) ? data.cities[0] : data.cities;

  if (before?.slug && before.slug !== data.slug) {
    revalidatePath(`/communities/${before.slug}`);
  }
  revalidateCommunity(data.slug, [beforeCity?.slug ?? null, afterCity?.slug ?? null]);
  return { ok: true };
}

export async function deleteCommunity(
  id: string,
  confirmation: string,
): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const community = await getAdminCommunityById(id);
  if (!community) return { ok: false, error: "That community could not be found." };

  if (confirmation.trim().toLowerCase() !== community.name.trim().toLowerCase()) {
    return { ok: false, error: "The name you typed does not match." };
  }

  const db = await createSupabaseServerClient();

  // A community with listings attached must not be deleted out from under them
  // — `listings.community_id` is ON DELETE SET NULL, so the listings would
  // silently lose their community rather than the delete being refused.
  const { count } = await db
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("community_id", id);

  if ((count ?? 0) > 0) {
    return {
      ok: false,
      error: `${count} ${count === 1 ? "listing is" : "listings are"} still filed under this community. Move them first.`,
    };
  }

  const { data: media } = await db.from("media").select("key").eq("entity_id", id);
  await deleteImages((media ?? []).map((m) => m.key as string));

  const { error } = await db.from("communities").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message, "deleteCommunity") };

  revalidateCommunity(community.slug, [community.city.slug]);
  return { ok: true };
}

/* ── Reviews ────────────────────────────────────────────────────────────── */

function reviewRow(input: ReviewInput) {
  return {
    author_name: input.authorName,
    author_role: input.authorRole ?? null,
    rating: input.rating ?? null,
    body: input.body,
    source: input.source ?? null,
    source_url: input.sourceUrl ?? null,
    reviewed_at: input.reviewedAt ?? null,
    published: input.published,
    sort_order: input.sortOrder,
  };
}

function revalidateReviews() {
  revalidatePath("/reviews");
  revalidatePath("/");
  revalidatePath("/admin/reviews");
}

export async function createReview(raw: unknown): Promise<ContentResult<{ id: string }>> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("reviews")
    .insert(reviewRow(parsed.data))
    .select("id")
    .single();

  if (error) return { ok: false, error: friendly(error.message, "createReview") };

  revalidateReviews();
  return { ok: true, data: { id: data.id } };
}

export async function saveReview(id: string, raw: unknown): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = reviewSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Some fields still need attention.",
      fieldErrors: fieldErrors(parsed.error),
    };
  }

  const db = await createSupabaseServerClient();
  const { error } = await db.from("reviews").update(reviewRow(parsed.data)).eq("id", id);

  if (error) return { ok: false, error: friendly(error.message, "saveReview") };

  revalidateReviews();
  return { ok: true };
}

export async function deleteReview(
  id: string,
  confirmation: string,
): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const db = await createSupabaseServerClient();
  const { data: review } = await db
    .from("reviews")
    .select("author_name")
    .eq("id", id)
    .maybeSingle();

  if (!review) return { ok: false, error: "That review could not be found." };

  if (
    confirmation.trim().toLowerCase() !==
    String(review.author_name).trim().toLowerCase()
  ) {
    return { ok: false, error: "The name you typed does not match." };
  }

  const { error } = await db.from("reviews").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error.message, "deleteReview") };

  revalidateReviews();
  return { ok: true };
}

/** Optimistic publish toggle, matching the listings table's behaviour. */
export async function setReviewPublished(raw: unknown): Promise<ContentResult> {
  const authError = await guard();
  if (authError) return { ok: false, error: authError };

  const parsed = z
    .object({ id: z.string().uuid(), value: z.boolean() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That review could not be found." };

  const db = await createSupabaseServerClient();
  const { error } = await db
    .from("reviews")
    .update({ published: parsed.data.value })
    .eq("id", parsed.data.id);

  if (error) return { ok: false, error: friendly(error.message, "setReviewPublished") };

  revalidateReviews();
  return { ok: true };
}
