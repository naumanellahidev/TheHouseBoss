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
    title: `${city.name}, FL Homes for Sale`,
    description:
      city.metaDesc ||
      `Browse homes for sale in ${city.name}, ${city.county} County, Florida. Filter by price, bedrooms, property type and new construction, with a licensed contractor's read on every property.`,
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
