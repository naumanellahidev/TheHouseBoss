import type { ArticleCard } from "@/types/domain";

/**
 * Where an article lives.
 *
 * Moved out of `components/site/article-card.tsx` because the publish action
 * and the SEO backfill both need it, and neither should import a React
 * component to learn a URL shape. This is the one definition — the card
 * re-exports it so nothing had to change at the call sites.
 *
 * The parameter is deliberately structural rather than `Article`: the card has
 * an `ArticleCard`, the publish action has a full `Article`, and both carry the
 * three fields this decision actually depends on.
 */
export function articleHref(article: {
  kind: ArticleCard["kind"];
  slug: string;
  city?: { slug: string } | null;
}): string {
  if (article.kind === "market_update") return `/market-updates/${article.slug}`;
  if (article.city?.slug === "lake-mary") return `/lake-mary/blog/${article.slug}`;
  return `/market-updates/${article.slug}`;
}

/** Every public path an entity is reachable at. Used by the SEO writer. */
export const listingHref = (slug: string) => `/listing/${slug}`;
export const cityHref = (slug: string) => `/${slug}`;
export const communityHref = (slug: string) => `/communities/${slug}`;
