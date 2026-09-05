import { createSupabasePublicClient } from "@/lib/supabase/public";
import { toArticle, toArticleCard, toReview } from "@/lib/queries/mappers";
import type { Article, ArticleCard, ArticleKind, Review } from "@/types/domain";

/**
 * Article and review reads. RLS keeps drafts invisible here — there is
 * deliberately no `status` filter in these queries, because relying on one
 * would mean a forgotten `.eq()` could leak a draft.
 */

const CARD_COLUMNS =
  "id, slug, title, excerpt, kind, cover_key, cover_alt, city_id, tags, published_at, reading_min, cities(id, slug, name)";

const FULL_COLUMNS = `${CARD_COLUMNS}, body_json, body_text, community_id, meta_title, meta_desc, og_key, faq_json, updated_at, communities(id, slug, name)`;

export async function getArticles(opts: {
  kind?: ArticleKind;
  citySlug?: string;
  limit?: number;
} = {}): Promise<ArticleCard[]> {
  const db = createSupabasePublicClient();
  let q = db
    .from("articles")
    .select(CARD_COLUMNS)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(opts.limit ?? 24);

  if (opts.kind) q = q.eq("kind", opts.kind);

  const { data, error } = await q;
  if (error) throw new Error(`getArticles: ${error.message}`);

  const mapped = (data ?? []).map(toArticleCard);
  return opts.citySlug
    ? mapped.filter((a) => a.city?.slug === opts.citySlug)
    : mapped;
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("articles")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getArticleBySlug(${slug}): ${error.message}`);
  return data ? toArticle(data) : null;
}

export async function getArticleSlugsForStaticParams(
  kind?: ArticleKind,
): Promise<string[]> {
  const db = createSupabasePublicClient();
  let q = db.from("articles").select("slug").limit(1000);
  if (kind) q = q.eq("kind", kind);

  const { data, error } = await q;
  if (error) throw new Error(`getArticleSlugsForStaticParams: ${error.message}`);
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export async function getReviews(limit = 24): Promise<Review[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("reviews")
    .select(
      "id, author_name, author_role, rating, body, source, source_url, reviewed_at",
    )
    .order("sort_order", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`getReviews: ${error.message}`);
  return (data ?? []).map(toReview);
}
