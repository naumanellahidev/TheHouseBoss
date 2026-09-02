import type { Metadata } from "next";

import { CityHomesPage } from "@/components/listing/city-homes-page";
import { buildMetadata } from "@/lib/seo/metadata";

/**
 * `/lake-mary/homes-for-sale` — the highest-value URL on the site.
 *
 * A literal route rather than a match on `[city]`, because Lake Mary is the
 * flagship city and gains sub-routes the other cities do not have (a blog and a
 * communities index, both Phase 4). The page body is the shared implementation,
 * so the two can never drift apart.
 */

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Lake Mary, FL Homes for Sale",
  description:
    "Homes for sale in Lake Mary, Florida, from a Realtor who lives here and is also a licensed residential contractor. Filter by price, bedrooms, new construction, VA-eligible and assumable listings.",
  path: "/lake-mary/homes-for-sale",
});

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <CityHomesPage citySlug="lake-mary" searchParams={await searchParams} />;
}
