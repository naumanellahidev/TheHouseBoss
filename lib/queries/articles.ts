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

/**
 * Slug, kind and city for every published article.
 *
 * `getArticleSlugsForStaticParams` returns slugs alone, which is enough for a
 * route whose city is in the path already (`/lake-mary/blog/[slug]`) and not
 * enough for `/[city]/blog/[slug]`: a slug cannot say which city segment it
 * belongs under, and prerendering the cross product of cities and slugs would
 * generate a 404 for every pair that is not real.
 *
 * Reads through the anon client, so an unpublished article is invisible by RLS
 * rather than by a `where` clause somebody has to remember.
 */
export async function getArticlesForStaticParams(): Promise<
  { slug: string; kind: ArticleKind; citySlug: string | null }[]
> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("articles")
    .select("slug, kind, city_id, cities(id, slug)")
    .limit(1000);

  if (error) throw new Error(`getArticlesForStaticParams: ${error.message}`);

  /*
    Cast once, like the mappers do.

    The generated types model an embedded to-one relation as a union that
    includes a `SelectQueryError`, so reading `row.cities.slug` off it does not
    compile even though the query is correct — `lib/queries/mappers.ts` takes the
    same loose row shape for the same reason.
  */
  const rows = (data ?? []) as unknown as {
    slug: string;
    kind: ArticleKind;
    cities: { slug: string } | null;
  }[];

  return rows.map((row) => ({
    slug: row.slug,
    kind: row.kind,
    citySlug: row.cities?.slug ?? null,
  }));
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
