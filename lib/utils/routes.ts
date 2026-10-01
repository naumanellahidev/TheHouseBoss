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
  // A market update is a market update wherever it is about. The section is
  // what a reader goes there for, and the figures are dated on the page.
  if (article.kind === "market_update") return `/market-updates/${article.slug}`;

  /*
    Anything else attached to a city lives under that city.

    This used to be a special case for Lake Mary and a fall-through to
    `/market-updates/` for everywhere else — so a blog post about Sanford
    published at an address announcing it was a market update, inside the
    section a reader goes to for numbers. Lake Mary had a home for its writing
    because it is the flagship; nowhere else did.

    `/lake-mary/blog/{slug}` is unchanged and still served by its own static
    route: those URLs are published and permanent (CLAUDE.md § 3 rule 11).
  */
  if (article.city?.slug) return `/${article.city.slug}/blog/${article.slug}`;

  /*
    No city, no city URL.

    An article about the process rather than a place — a guide to VA appraisals,
    say — has nowhere better to go, and inventing a segment for it would mean a
    fourth URL shape for a case the audit already asks the author to fix by
    attaching a city.
  */
  return `/market-updates/${article.slug}`;
}

/** Every public path an entity is reachable at. Used by the SEO writer. */
export const listingHref = (slug: string) => `/listing/${slug}`;
export const cityHref = (slug: string) => `/${slug}`;
export const communityHref = (slug: string) => `/communities/${slug}`;
