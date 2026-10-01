import { OG_SIZE, ogResponse, ogTrim } from "@/lib/seo/og";
import { getArticleBySlug } from "@/lib/queries/articles";
import { allCities } from "@/lib/site-config";

export const alt = "Article from The House Boss";
export const size = OG_SIZE;
export const contentType = "image/png";

/**
 * The share card for a city blog post.
 *
 * The eyebrow is the city, which is the whole reason this route exists: a card
 * for a piece about Sanford that says anything else is a card that looks like it
 * belongs to a different article.
 *
 * The city name comes from the article when it is loaded and from the
 * compile-time list when it is not — a card is generated for a missing article
 * too, and falling back to the slug would put "winter-springs" on it.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  const article = await getArticleBySlug(slug).catch(() => null);
  const named = allCities.find((entry) => entry.slug === city)?.name ?? "Central Florida";

  if (!article) {
    return ogResponse({ eyebrow: named, title: `Writing about ${named}` });
  }

  return ogResponse({
    eyebrow: article.city?.name ?? named,
    title: ogTrim(article.title, 70),
    subtitle: article.excerpt ? ogTrim(article.excerpt, 110) : undefined,
    facts: article.readingMin ? `${article.readingMin} min read` : undefined,
  });
}
