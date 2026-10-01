import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ArticleView } from "@/components/site/article-view";
import { JsonLd } from "@/components/site/json-ld";
import { articleJsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { getSeoOverride } from "@/lib/queries/seo";
import {
  articleMetaDescription,
  autoArticleDescription,
  autoArticleTitle,
} from "@/lib/seo/auto/generate";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticleBySlug, getArticlesForStaticParams } from "@/lib/queries/articles";
import { allCities } from "@/lib/site-config";
import { keyUrl } from "@/lib/storage/url";

/**
 * A blog post or guide about a city.
 *
 * ── Why this route exists ─────────────────────────────────────────────────
 *
 * `articleHref` used to send everything that was not a market update and not
 * about Lake Mary to `/market-updates/{slug}`. So a piece about Sanford
 * published at an address that announces it is a market update, inside the
 * section a reader goes to for figures. Lake Mary had a proper home for its
 * writing because it is the flagship; nowhere else did.
 *
 * This is that route, generalised. Lake Mary keeps its own file — a static
 * segment wins over a dynamic one in the router, and `/lake-mary/blog/{slug}`
 * is already published and permanent (CLAUDE.md § 3 rule 11).
 *
 * ── What it refuses ───────────────────────────────────────────────────────
 *
 * Three things, each a 404 rather than a redirect, because none of them is a
 * URL that was ever published:
 *
 *   - a city outside the service area, which would be a page claiming to serve
 *     somewhere she does not;
 *   - a market update, which lives under `/market-updates` and must not also
 *     answer here — the same article at two addresses competes with itself;
 *   - an article whose city is not the city in the URL, which would let any
 *     piece be reached from any city and dilute every one of them.
 *
 * No `loading.tsx`: this route calls `notFound()`.
 */

export const revalidate = 3600;

/**
 * Prerender every published city article at its own city.
 *
 * The pair has to come from the article itself — a slug alone cannot say which
 * city segment it belongs under, and generating the cross product of cities and
 * slugs would prerender a 404 for every combination that is not real.
 */
export async function generateStaticParams() {
  try {
    const articles = await getArticlesForStaticParams();
    return articles
      .filter(
        (article) =>
          article.kind !== "market_update" &&
          article.citySlug !== null &&
          article.citySlug !== "lake-mary" &&
          allCities.some((city) => city.slug === article.citySlug),
      )
      .map((article) => ({ city: article.citySlug as string, slug: article.slug }));
  } catch {
    return [];
  }
}

/** The article, only if it genuinely belongs at this address. */
async function load(citySlug: string, slug: string) {
  if (citySlug === "lake-mary") return null;
  if (!allCities.some((city) => city.slug === citySlug)) return null;

  const article = await getArticleBySlug(slug).catch(() => null);
  if (!article) return null;
  if (article.kind === "market_update") return null;
  if (article.city?.slug !== citySlug) return null;

  return article;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  const article = await load(city, slug);

  if (!article) {
    return { title: "Article not found", robots: { index: false, follow: true } };
  }

  const path = `/${city}/blog/${article.slug}`;
  const override = await getSeoOverride(path);

  return buildMetadata({
    override,
    title: article.metaTitle || autoArticleTitle(article),
    // Her text when it is publishable, the generator otherwise — the one
    // precedence, applied the same way on every article route.
    description: articleMetaDescription(article),
    path,
    image: article.coverKey ? keyUrl(article.coverKey, 1600) : null,
    type: "article" as const,
    publishedTime: article.publishedAt ?? undefined,
    modifiedTime: article.updatedAt,
  });
}

export default async function CityBlogPostPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  const article = await load(city, slug);
  if (!article) notFound();

  const cityName = article.city?.name ?? city;
  const path = `/${city}/blog/${article.slug}`;

  /*
    The middle crumb points at `/articles/{city}`, not at `/{city}/blog`.

    There is one index per city and it is the Articles page — building a second
    one under the city would be the same list at a second address, which is the
    duplicate this route is careful to avoid in the first place.
  */
  const crumbs = [
    { href: `/${city}`, label: cityName },
    { href: `/articles/${city}`, label: "Articles" },
    { href: path, label: article.title },
  ];

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: article.title,
            // The same string the meta description carries. Two generators would
            // let the structured data and the meta tag disagree about what the
            // article is about, and the structured data is the one an assistant
            // trusts.
            description: autoArticleDescription(article),
            path,
            image: article.coverKey ? keyUrl(article.coverKey, 1600) : undefined,
            publishedAt: article.publishedAt,
            modifiedAt: article.updatedAt,
            wordCount: article.bodyText
              ? article.bodyText.trim().split(/\s+/).filter(Boolean).length
              : undefined,
            section: cityName,
          }),
          /*
            §21, §22. FAQPage ONLY when the page renders those questions.
            `ArticleView` reads the same `article.faq` array, so the markup
            cannot describe something the reader does not see.
          */
          ...(article.faq.length > 0 ? [faqJsonLd(article.faq)] : []),
          breadcrumbJsonLd(crumbs),
        ]}
      />
      <ArticleView article={article} crumbs={crumbs} />
    </>
  );
}
