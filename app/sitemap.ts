import type { MetadataRoute } from "next";

import {
  ANSWERS,
  ANSWER_CATEGORIES,
  answersInCategory,
} from "@/lib/content/answers";
import { getArticles } from "@/lib/queries/articles";
import { getCities, getCommunities } from "@/lib/queries/cities";
import { getListingSlugsForStaticParams, getSoldListings } from "@/lib/queries/listings";
import { allCities, siteConfig } from "@/lib/site-config";

/**
 * The sitemap — docs/08 § 5, database-driven.
 *
 * Everything published, nothing that is not. It reads through the anon client,
 * so a draft is invisible here by RLS rather than by a `where` clause someone
 * has to remember — the same reason the public pages read that way.
 *
 * Deliberately absent: `/search` with any filter applied, and the three legal
 * pages. Filtered search URLs are `noindex, follow` by the canonical policy and
 * listing them would contradict that; the legal pages are `noindex` for the
 * same reason. A sitemap that lists pages we tell crawlers not to index is a
 * signal that the site does not know its own mind.
 *
 * Regenerates on every request in production behind Vercel's cache, so a
 * listing published in the admin appears without a deploy.
 */

export const revalidate = 3600;

const base = siteConfig.url.replace(/\/+$/, "");
const url = (path: string) => `${base}${path.startsWith("/") ? path : `/${path}`}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  /** Static routes, with the priorities from docs/08 § 5. */
  const staticEntries: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "weekly", priority: 1, lastModified: now },
    { url: url("/search"), changeFrequency: "daily", priority: 0.9, lastModified: now },
    {
      url: url("/search/new-construction"),
      changeFrequency: "daily",
      priority: 0.8,
      lastModified: now,
    },
    { url: url("/sold"), changeFrequency: "weekly", priority: 0.6, lastModified: now },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.8, lastModified: now },
    { url: url("/contact"), changeFrequency: "yearly", priority: 0.6, lastModified: now },
    { url: url("/reviews"), changeFrequency: "monthly", priority: 0.6, lastModified: now },
    { url: url("/guides"), changeFrequency: "monthly", priority: 0.8, lastModified: now },
    {
      url: url("/guides/va-home-buyer"),
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: url("/assumable-mortgage-homes"),
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: url("/hire-contractor"),
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: url("/sell-your-central-florida-home"),
      changeFrequency: "monthly",
      priority: 0.9,
      lastModified: now,
    },
    {
      url: url("/market-updates"),
      changeFrequency: "weekly",
      priority: 0.7,
      lastModified: now,
    },
    /*
      The writing hub and one page per city.

      From `allCities` rather than from the database, which is what the routes
      themselves do: the pages are prerendered for every city in the service area
      whether or not anything has been written about it yet, so a sitemap built
      from published articles would omit pages that exist and answer a real query
      ("has she written about Oviedo?").
    */
    { url: url("/articles"), changeFrequency: "weekly", priority: 0.8, lastModified: now },
    ...allCities.map((city) => ({
      url: url(`/articles/${city.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      lastModified: now,
    })),
  ];

  // Every dynamic section degrades to nothing rather than failing the whole
  // sitemap: a database hiccup should cost one section, not the file.
  const [cities, communities, articles, listingSlugs, sold] = await Promise.all([
    getCities().catch(() => []),
    getCommunities().catch(() => []),
    getArticles({ limit: 500 }).catch(() => []),
    getListingSlugsForStaticParams().catch(() => [] as string[]),
    getSoldListings(undefined, 500).catch(() => []),
  ]);

  const cityEntries: MetadataRoute.Sitemap = cities.flatMap((city) => [
    {
      url: url(`/${city.slug}`),
      changeFrequency: "weekly" as const,
      priority: city.isFlagship ? 0.9 : 0.7,
      lastModified: now,
    },
    {
      url: url(`/${city.slug}/homes-for-sale`),
      changeFrequency: "daily" as const,
      priority: city.isFlagship ? 0.95 : 0.8,
      lastModified: now,
    },
    ...(city.isFlagship
      ? [
          {
            url: url(`/${city.slug}/communities`),
            changeFrequency: "monthly" as const,
            priority: 0.7,
            lastModified: now,
          },
          {
            url: url(`/${city.slug}/blog`),
            changeFrequency: "weekly" as const,
            priority: 0.7,
            lastModified: now,
          },
        ]
      : []),
  ]);

  const communityEntries: MetadataRoute.Sitemap = communities.map((community) => ({
    url: url(`/communities/${community.slug}`),
    changeFrequency: "monthly",
    priority: 0.7,
    lastModified: now,
  }));

  const articleEntries: MetadataRoute.Sitemap = articles.map((article) => ({
    url: url(
      article.kind === "market_update"
        ? `/market-updates/${article.slug}`
        : article.city?.slug === "lake-mary"
          ? `/lake-mary/blog/${article.slug}`
          : `/market-updates/${article.slug}`,
    ),
    changeFrequency: "yearly",
    priority: 0.6,
    lastModified: article.publishedAt ? new Date(article.publishedAt) : now,
  }));

  /**
   * Listing slugs come from the published set only. Sold listings are included
   * on purpose — their pages are permanent (HR10/HR11) and they are the
   * evidence behind every claim about track record.
   */
  const soldSlugs = new Set(sold.map((listing) => listing.slug));
  const listingEntries: MetadataRoute.Sitemap = listingSlugs.map((slug) => ({
    url: url(`/listing/${slug}`),
    changeFrequency: soldSlugs.has(slug) ? "yearly" : "weekly",
    priority: soldSlugs.has(slug) ? 0.4 : 0.8,
    lastModified: now,
  }));

  /*
    The answer hub (docs/18 § 6). Content is in the repository rather than the
    database, so these need no query and cannot fail: the hub, the categories
    that have published answers, and every answer, with its own review date as
    lastModified rather than the build time.
  */
  const answerEntries: MetadataRoute.Sitemap = [
    { url: url("/answers"), changeFrequency: "weekly", priority: 0.8, lastModified: now },
    ...ANSWER_CATEGORIES.filter(
      (category) => answersInCategory(category.slug).length > 0,
    ).map((category) => ({
      url: url(`/answers/${category.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.6,
      lastModified: now,
    })),
    ...ANSWERS.map((answer) => ({
      url: url(`/answers/${answer.category}/${answer.slug}`),
      changeFrequency: "yearly" as const,
      priority: 0.7,
      lastModified: new Date(answer.body.updated),
    })),
  ];

  return [
    ...staticEntries,
    ...answerEntries,
    ...cityEntries,
    ...communityEntries,
    ...articleEntries,
    ...listingEntries,
  ];
}
