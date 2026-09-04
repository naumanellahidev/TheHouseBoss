import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CityHub } from "@/components/site/city-hub";
import { getSeoOverride } from "@/lib/queries/seo";
import { buildMetadata } from "@/lib/seo/metadata";
import { getArticles } from "@/lib/queries/articles";
import { getCityBySlug, getCommunities } from "@/lib/queries/cities";
import { searchListings } from "@/lib/queries/listings";
import { EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";

/**
 * `/lake-mary` — the flagship city hub.
 *
 * The client asked for this one by name: "a landing page for the city of Lake
 * Mary to write blogs and articles about the city." It is a literal route
 * rather than a match on `[city]` because it has sub-routes the others do not
 * (a blog and a communities index), and it shares the hub implementation so the
 * two can never drift apart.
 */

export const revalidate = 3600;

/*
  `generateMetadata`, not a static `metadata` object.

  This route is hand-written rather than matched by `[city]`, and it was the one
  city page the generated `seo_pages` override could not reach — the backfill
  wrote a row for /lake-mary that nothing read. The literals below stay as the
  fallback; the override wins when one exists. The route is still statically
  rendered: the lookup uses the cookie-free public client.
*/
export async function generateMetadata(): Promise<Metadata> {
  const override = await getSeoOverride("/lake-mary");

  return buildMetadata({
    override,
    title: "Lake Mary, FL Real Estate | Homes, Communities & Guide",
    description:
      "Lake Mary homes for sale, its communities, and a guide to living here — written by a Realtor who lives in Lake Mary and is also a licensed residential contractor.",
    path: "/lake-mary",
  });
}

export default async function LakeMaryPage() {
  const city = await safeQuery(
    () => getCityBySlug("lake-mary"),
    null,
    "getCityBySlug(lake-mary)",
  );
  if (!city) notFound();

  const [result, communities, articles] = await Promise.all([
    safeQuery(
      () => searchListings({ city: ["lake-mary"], sort: "newest", page: 1 }),
      EMPTY_RESULT,
      "searchListings(lakeMary)",
    ),
    safeQuery(() => getCommunities("lake-mary"), [], "getCommunities"),
    safeQuery(() => getArticles({ citySlug: "lake-mary", limit: 3 }), [], "getArticles"),
  ]);

  return (
    <CityHub
      city={city}
      listings={result.listings.slice(0, 3)}
      communities={communities}
      articles={articles}
      isFlagship
    />
  );
}
