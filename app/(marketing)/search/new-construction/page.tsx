import Link from "next/link";
import type { Metadata } from "next";
import { HardHat } from "lucide-react";

import { SearchResults } from "@/components/listing/search-results";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { getFacets, searchListings } from "@/lib/queries/listings";
import { EMPTY_FACETS, EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";
import { parseSearchParams } from "@/lib/validation/search-params";

/**
 * `/search/new-construction` — docs/05.
 *
 * The client asked for a new-construction search specifically, so it gets its
 * own indexable URL rather than a query string. The type filter is locked on
 * and hidden from the filter bar; everything else behaves like `/search`.
 *
 * The content block above the results is the point of the page: a buyer walking
 * into a builder's sales office without their own agent is the single most
 * expensive mistake in this category, and this is where that gets said.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildMetadata({
  title: "New Construction Homes in Central Florida",
  description:
    "New-construction homes across Lake Mary, Longwood, Sanford, Casselberry and Orlando — and why you want your own representation before you walk into a builder's sales office.",
  path: "/search/new-construction",
});

export default async function NewConstructionSearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const params = {
    ...parseSearchParams(raw),
    // Locked on. Anything the visitor puts in the URL for `type` is overridden,
    // which is what makes this URL mean one thing forever.
    type: ["new_construction" as const],
  };

  const [result, facets] = await Promise.all([
    safeQuery(() => searchListings(params), EMPTY_RESULT, "searchListings(new)"),
    safeQuery(() => getFacets(), EMPTY_FACETS, "getFacets"),
  ]);

  const crumbs = [
    { href: "/search", label: "Home Search" },
    { href: "/search/new-construction", label: "New Construction" },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">New construction in Central Florida</h1>
          <p className="max-w-[62ch] text-lead text-foreground-muted">
            Builder inventory and pre-construction homes across Seminole and
            Orange County.
          </p>
        </Container>
      </Section>

      {/* The content block docs/05 requires above the grid. */}
      <Section className="py-8">
        <Container>
          <aside className="flex flex-col gap-4 rounded-lg border-l-4 border-l-accent bg-accent-wash p-5 md:p-6">
            <h2 className="flex items-center gap-2.5 text-h3">
              <HardHat className="size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
              Register me before your first site visit
            </h2>
            <div className="flex max-w-[68ch] flex-col gap-3 text-body leading-relaxed text-foreground-muted">
              <p>
                The agent at a builder&rsquo;s sales office works for the
                builder. They are pleasant, they are knowledgeable, and they are
                not representing you. Most builders will only pay a buyer&rsquo;s
                agent if that agent is registered <strong>the first time you
                walk in</strong> — visit once alone and you can lose the right to
                your own representation on that community entirely, at no saving
                to you.
              </p>
              <p>
                I am also a Certified Residential Building Contractor, which
                changes what a buyer&rsquo;s agent can do on a new build: read
                the contract&rsquo;s allowances and change-order terms, tell you
                which upgrades hold value and which do not, and walk the house at
                framing and at pre-drywall while problems are still cheap to fix.
              </p>
            </div>
            <Button asChild variant="accent" className="self-start">
              <Link href="/new-construction-representation">
                How new-construction representation works
              </Link>
            </Button>
          </aside>
        </Container>
      </Section>

      <Section className="pt-0">
        <Container>
          <SearchResults
            result={result}
            facets={facets}
            params={params}
            basePath="/search/new-construction"
            lockedType="new_construction"
          />
        </Container>
      </Section>
    </>
  );
}
