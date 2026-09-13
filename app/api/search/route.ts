import { NextResponse } from "next/server";

import { searchListings } from "@/lib/queries/listings";
import { parseSearchParams, toSearchQuery } from "@/lib/validation/search-params";

/**
 * Search, as JSON — the home page's inline results.
 *
 * The hero's form is still a plain `<form method="get" action="/search">`, so
 * without JavaScript a search goes to the search page exactly as before. With
 * JavaScript the home page intercepts it and asks this route instead, which is
 * what lets the results appear under the hero rather than on another page.
 *
 * The SAME parser the search page uses (`parseSearchParams`), so a query cannot
 * mean one thing here and another there, and the same `searchListings`, which
 * reads through RLS — an unpublished listing is invisible to this route by
 * policy, not by a `where` clause.
 *
 * Six results, because this is a preview: the full set, with its filters and
 * pagination, is `/search`.
 */

export const dynamic = "force-dynamic";

const PREVIEW_SIZE = 6;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = parseSearchParams(Object.fromEntries(url.searchParams));

  try {
    const result = await searchListings(params);

    return NextResponse.json(
      {
        listings: result.listings.slice(0, PREVIEW_SIZE),
        total: result.total,
        /** Canonicalised, so "see all" lands on the URL the search page parses. */
        query: toSearchQuery(params),
      },
      {
        headers: {
          // Short and shared: results change when she publishes, not per visitor.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      },
    );
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json(
      { error: "Search is unavailable right now." },
      { status: 500 },
    );
  }
}
