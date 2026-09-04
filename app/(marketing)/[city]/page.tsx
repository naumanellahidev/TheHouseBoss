import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityHub } from "@/components/site/city-hub";
import { getSeoOverride } from "@/lib/queries/seo";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticles } from "@/lib/queries/articles";
import { getCityBySlug, getCitySlugsForStaticParams, getCommunities } from "@/lib/queries/cities";
import { searchListings } from "@/lib/queries/listings";
import { EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";

/**
 * `/[city]` — the seven non-flagship city hubs.
 *
 * `generateStaticParams` EXCLUDES lake-mary: it has its own literal route with
 * sub-routes, and emitting it here would create two routes resolving to the
 * same URL (docs/01).
 *
 * No `loading.tsx` for this route. It calls `notFound()`, and a loading file
 * makes the segment stream, which flushes a 200 before the body runs — see the
 * note in app/(marketing)/listing/[slug]/page.tsx.
 */

export const revalidate = 3600;

export async function generateStaticParams() {
  try {
    const slugs = await getCitySlugsForStaticParams();
    return slugs.map((city) => ({ city }));
  } catch {
    return [];
  }
}

/** Prefers the stored value, unless it is too short to serve as a description. */
function longer(stored: string | null, generated: string): string {
  return stored && stored.length >= 140 ? stored : generated;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = await getCityBySlug(slug).catch(() => null);

  if (!city) {
    return { title: "City not found", robots: { index: false, follow: true } };
  }

  const override = await getSeoOverride(`/${city.slug}`);

  return buildMetadata({
    override,
    title: city.metaTitle || `${city.name}, FL Real Estate & Neighbourhood Guide`,
    // A stored description shorter than the 140-character floor is worse than
    // the generated one: search engines truncate long, but they pad short with
    // whatever text they find. The longer of the two wins.
    description: longer(
      city.metaDesc,
      `Homes for sale, neighbourhoods and a local guide to ${city.name} in ${city.county} County, Florida — from a Realtor who is also a licensed residential building contractor.`,
    ),
    // null: this route generates its own card in opengraph-image.tsx.
    image: null,
    path: `/${city.slug}`,
  });
}

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;

  const city = await safeQuery(() => getCityBySlug(slug), null, "getCityBySlug");
  if (!city) notFound();

  const [result, communities, articles] = await Promise.all([
    safeQuery(
      () => searchListings({ city: [slug], sort: "newest", page: 1 }),
      EMPTY_RESULT,
      "searchListings(cityHub)",
    ),
    safeQuery(() => getCommunities(slug), [], "getCommunities"),
    safeQuery(() => getArticles({ citySlug: slug, limit: 3 }), [], "getArticles"),
  ]);

  return (
    <CityHub
      city={city}
      listings={result.listings.slice(0, 3)}
      communities={communities}
      articles={articles}
      isFlagship={false}
    />
  );
}
