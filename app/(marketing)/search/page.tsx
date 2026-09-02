import type { Metadata } from "next";

import { SearchResults } from "@/components/listing/search-results";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFacets, searchListings } from "@/lib/queries/listings";
import { EMPTY_FACETS, EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";
import { canonicalFor, parseSearchParams } from "@/lib/validation/search-params";

/**
 * `/search` — docs/05.
 *
 * Every filter lives in the URL, parsed by the one tolerant schema in
 * `lib/validation/search-params.ts`. A hand-edited or stale link degrades to
 * sensible results rather than throwing.
 *
 * Canonical policy (docs/08 § 5): the bare URL is canonical and indexable;
 * a single-city or single-type view points at its pretty URL; every other
 * filter permutation is `noindex, follow` so it cannot dilute the index.
 */

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const params = parseSearchParams(await searchParams);
  const canonical = canonicalFor(params);

  return buildMetadata({
    title:
      "Central Florida Homes for Sale | Lake Mary, Longwood, Sanford, Casselberry & Orlando",
    description:
      "Search homes for sale across Lake Mary, Longwood, Sanford, Casselberry and Orlando. Filter by price, beds, property type, new construction, VA-eligible and assumable listings.",
    path: canonical.path,
    noindex: !canonical.index,
  });
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = parseSearchParams(await searchParams);

  const [result, facets] = await Promise.all([
    safeQuery(() => searchListings(params), EMPTY_RESULT, "searchListings"),
    safeQuery(() => getFacets(), EMPTY_FACETS, "getFacets"),
  ]);

  const crumbs = [{ href: "/search", label: "Home Search" }];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Central Florida homes for sale</h1>
          <p className="max-w-[60ch] text-lead text-foreground-muted">
            Every listing I represent, in one place. Filter it down, then share
            the link — the address bar holds the whole search.
          </p>
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <SearchResults
            result={result}
            facets={facets}
            params={params}
            basePath="/search"
          />
        </Container>
      </Section>
    </>
  );
}
