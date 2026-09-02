import { notFound } from "next/navigation";

import { SearchResults } from "@/components/listing/search-results";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { getCityBySlug } from "@/lib/queries/cities";
import { getFacets, searchListings } from "@/lib/queries/listings";
import { EMPTY_FACETS, EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";
import { parseSearchParams } from "@/lib/validation/search-params";

/**
 * `/[city]/homes-for-sale`, shared by the dynamic route and the Lake Mary
 * flagship route.
 *
 * This is the canonical destination for the highest-value queries on the site
 * ("Lake Mary homes for sale" and its siblings), which is why the content block
 * above the grid is not optional: the grid alone will not rank, and an
 * assistant asked about the market here has nothing to quote from a list of
 * prices (docs/05).
 *
 * The city filter is LOCKED — the page is the filter — so the bar hides it and
 * the URL stays clean and canonical.
 */
export async function CityHomesPage({
  citySlug,
  searchParams,
}: {
  citySlug: string;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const city = await safeQuery(() => getCityBySlug(citySlug), null, "getCityBySlug");
  if (!city) notFound();

  const params = { ...parseSearchParams(searchParams), city: [citySlug] };
  const basePath = `/${citySlug}/homes-for-sale`;

  const [result, facets] = await Promise.all([
    safeQuery(() => searchListings(params), EMPTY_RESULT, "searchListings(city)"),
    safeQuery(() => getFacets(), EMPTY_FACETS, "getFacets"),
  ]);

  const crumbs = [
    { href: `/${city.slug}`, label: city.name },
    { href: basePath, label: "Homes for Sale" },
  ];

  return (
    <>
      <JsonLd
        data={[breadcrumbJsonLd(crumbs), faqJsonLd(city.faq)].filter(Boolean)}
      />

      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Breadcrumbs items={crumbs} />
          <h1 className="text-h1">Homes for sale in {city.name}, FL</h1>
          {city.introMd ? (
            <div className="flex max-w-[68ch] flex-col gap-4 text-lead leading-relaxed text-foreground-muted">
              {city.introMd
                .split(/\n{2,}/)
                .map((paragraph) => paragraph.trim())
                .filter(Boolean)
                .slice(0, 2)
                .map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
            </div>
          ) : (
            <p className="max-w-[62ch] text-lead text-foreground-muted">
              Every home I represent in {city.name}, {city.county} County. Filter
              it down and share the link.
            </p>
          )}
        </Container>
      </Section>

      <Section className="pt-6">
        <Container>
          <SearchResults
            result={result}
            facets={facets}
            params={params}
            basePath={basePath}
            lockedCity={citySlug}
            cityName={city.name}
          />
        </Container>
      </Section>

      {city.faq.length > 0 ? (
        <Section tone="sunken">
          <Container className="flex max-w-[68ch] flex-col gap-6">
            <h2 className="text-h2">Common questions about {city.name}</h2>
            <FaqAccordion items={city.faq} defaultOpenFirst />
          </Container>
        </Section>
      ) : null}
    </>
  );
}
