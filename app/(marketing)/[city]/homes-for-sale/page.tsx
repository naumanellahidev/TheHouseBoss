import type { Metadata } from "next";

import { CityHomesPage } from "@/components/listing/city-homes-page";
import { buildMetadata } from "@/lib/seo/metadata";
import { getCityBySlug, getCitySlugsForStaticParams } from "@/lib/queries/cities";

/**
 * `/[city]/homes-for-sale`.
 *
 * `generateStaticParams` EXCLUDES lake-mary: it has its own literal route with
 * sub-routes, and emitting it here would create two routes resolving to the
 * same URL (docs/01, "Why [city] is dynamic but lake-mary is not").
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

  return buildMetadata({
    /*
      "Homes for Sale in Longwood, FL", not "Longwood, FL Homes for Sale".

      The city hub at /longwood is a guide and this is its search results, and
      several seeded city rows carry a `meta_title` of "<City>, FL Homes for
      Sale" — so the two routes were emitting an identical title. `check-seo`
      catches that as a duplicate, and duplicate titles are one of the few
      things that genuinely cost rankings.

      Fixed here rather than by overriding the author's `meta_title`, because
      this route has no author-supplied title to respect and the hub does. Front
      -loading the intent also reads better in a result: someone searching
      "homes for sale longwood" sees their phrase first.
    */
    title: `Homes for Sale in ${city.name}, FL`,
    description:
      // Length-gated, not truthiness: a short `meta_desc` used to win here and
      // then get padded by search engines with whatever text they found.
      city.metaDesc && city.metaDesc.length >= 140
        ? city.metaDesc
        : `Browse homes for sale in ${city.name}, ${city.county} County, Florida. Filter by price, bedrooms, property type and new construction, with a licensed contractor's read on every property.`,
    path: `/${city.slug}/homes-for-sale`,
  });
}

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { city } = await params;
  return <CityHomesPage citySlug={city} searchParams={await searchParams} />;
}
