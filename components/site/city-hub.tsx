import Link from "next/link";
import { ArrowRight, MapPinned } from "lucide-react";

import { ArticleGrid } from "@/components/site/article-card";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { Markdown } from "@/components/site/markdown";
import { StatTiles } from "@/components/site/stat-tiles";
import { ListingGrid } from "@/components/listing/listing-grid";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, faqJsonLd, placeJsonLd } from "@/lib/seo/jsonld";
import { formatDate } from "@/lib/utils/date";
import { formatNumber, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { ArticleCard, City, Community, ListingCard } from "@/types/domain";

/**
 * The city hub — docs/05, all nine sections.
 *
 * The client called this out specifically for Lake Mary: "a landing page for
 * the city of Lake Mary to write blogs and articles about the city." It is the
 * most important content page on the site, and the same component serves the
 * other seven cities one level lighter — they get no blog and no communities
 * index unless they actually have communities.
 *
 * Every section hides itself when it has nothing to say. A city page with an
 * empty "Communities" heading looks abandoned; a shorter page does not.
 */
export function CityHub({
  city,
  listings,
  communities,
  articles,
  isFlagship,
}: {
  city: City;
  listings: ListingCard[];
  communities: Community[];
  articles: ArticleCard[];
  isFlagship: boolean;
}) {
  const crumbs = [{ href: `/${city.slug}`, label: city.name }];

  const stats = [
    city.stats.medianPrice != null
      ? { label: "Median price", value: formatPrice(city.stats.medianPrice) }
      : null,
    city.stats.medianPricePerSqft != null
      ? { label: "Per sq ft", value: formatPrice(city.stats.medianPricePerSqft) }
      : null,
    city.stats.avgDaysOnMarket != null
      ? { label: "Days on market", value: String(city.stats.avgDaysOnMarket) }
      : null,
    city.stats.population != null
      ? { label: "Population", value: formatNumber(city.stats.population) }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <>
      <JsonLd
        data={[
          placeJsonLd(city),
          faqJsonLd(city.faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      {/* 1. Hero */}
      <section className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert">
        {city.heroKey ? (
          <>
            <div className="absolute inset-0 -z-10">
              <PropertyImage
                photo={{
                  kind: "stored",
                  key: city.heroKey,
                  w: 1920,
                  h: 900,
                  alt: city.heroAlt ?? "",
                }}
                size={800}
                sizes={IMAGE_SIZES.fullBleed}
                priority
                aspect="none"
                wrapperClassName="h-full w-full"
                className="h-full w-full object-cover"
              />
            </div>
            {/* Never raw text over a photograph (design-system skill). */}
            <div aria-hidden="true" className="absolute inset-0 -z-10 photo-scrim" />
          </>
        ) : (
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-royal-800),var(--color-royal-950))]"
          />
        )}

        <Container className="flex flex-col gap-5 py-16 md:py-24 lg:py-28">
          <Breadcrumbs items={crumbs} invert />
          <p className="text-overline font-semibold tracking-[0.12em] text-azure-400 uppercase">
            {city.county} County, Florida
          </p>
          <h1 className="max-w-[22ch] text-h1 text-foreground-invert">
            {city.name} real estate
          </h1>
          <p className="max-w-[58ch] text-lead text-foreground-invert-muted">
            Homes, communities and a neighbourhood guide from a Realtor who is
            also a licensed residential contractor.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent" size="lg">
              <Link href={`/${city.slug}/homes-for-sale`}>
                See homes for sale
              </Link>
            </Button>
            <Button asChild variant="invert" size="lg">
              <Link href="/contact">Ask a question</Link>
            </Button>
          </div>
        </Container>
      </section>

      {/* 2. Intro + 3. Market stats */}
      {city.introMd || stats.length > 0 ? (
        <Section>
          <Container className="flex flex-col gap-10">
            {city.introMd ? (
              <Markdown lead>{city.introMd}</Markdown>
            ) : null}

            {stats.length > 0 ? (
              <div className="flex flex-col gap-4">
                <h2 className="text-h3">The {city.name} market</h2>
                {/* A statistic is never shown without the date it was true. */}
                <StatTiles
                  stats={stats}
                  asOf={city.stats.asOf ? formatDate(city.stats.asOf) : undefined}
                />
              </div>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {/* 4. Homes for sale */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeader
              overline="For sale"
              title={`Homes for sale in ${city.name}`}
            />
            <Button asChild variant="outline">
              <Link href={`/${city.slug}/homes-for-sale`}>
                See all
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </div>

          {listings.length > 0 ? (
            <ListingGrid listings={listings} />
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface p-6 text-body text-foreground-muted">
              Nothing of mine is on the market in {city.name} right now. That
              changes often —{" "}
              <Link
                href="/contact"
                className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
              >
                tell me what you are looking for
              </Link>{" "}
              and I will let you know first.
            </p>
          )}
        </Container>
      </Section>

      {/* 5. Communities */}
      {communities.length > 0 ? (
        <Section>
          <Container className="flex flex-col gap-6">
            <SectionHeader
              overline="Neighbourhoods"
              title={`Communities in ${city.name}`}
              lead="The named neighbourhoods people actually search for, each with its own page."
            />

            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {communities.map((community) => (
                <li key={community.id}>
                  <Link
                    href={`/communities/${community.slug}`}
                    className={cn(
                      "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
                      "transition-[box-shadow,transform] duration-(--dur-base)",
                      "hover:-translate-y-0.5 hover:shadow-md",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    {community.heroKey ? (
                      <PropertyImage
                        photo={{
                          kind: "stored",
                          key: community.heroKey,
                          w: 1200,
                          h: 900,
                          alt: community.heroAlt ?? "",
                        }}
                        size={400}
                        sizes={IMAGE_SIZES.cardGrid4}
                        aspect="4/3"
                      />
                    ) : (
                      <span
                        aria-hidden="true"
                        className="flex aspect-4/3 items-center justify-center bg-surface-sunken text-accent-quiet"
                      >
                        <MapPinned className="size-8" />
                      </span>
                    )}

                    <span className="flex flex-1 flex-col gap-1 p-4">
                      <span className="text-h4 font-semibold text-foreground">
                        {community.name}
                      </span>
                      {community.priceRange?.min ? (
                        <span className="text-sm text-foreground-muted tabular">
                          From {formatPrice(community.priceRange.min, { compact: true })}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>

            {isFlagship ? (
              <Button asChild variant="outline" className="self-start">
                <Link href={`/${city.slug}/communities`}>
                  Every {city.name} community
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
            ) : null}
          </Container>
        </Section>
      ) : null}

      {/* 6. Living here */}
      {city.bodyMd ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-6">
            <h2 className="text-h2">Living in {city.name}</h2>
            <Markdown>{city.bodyMd}</Markdown>
          </Container>
        </Section>
      ) : null}

      {/* 7. FAQ — the accordion and the FAQPage markup come from one array */}
      {city.faq.length > 0 ? (
        <Section>
          <Container className="flex max-w-[68ch] flex-col gap-6">
            <h2 className="text-h2">Common questions about {city.name}</h2>
            <FaqAccordion items={city.faq} defaultOpenFirst />
          </Container>
        </Section>
      ) : null}

      {/* 8. Latest articles */}
      {articles.length > 0 ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                overline="Reading"
                title={`Latest from ${city.name}`}
              />
              {isFlagship ? (
                <Button asChild variant="outline">
                  <Link href={`/${city.slug}/blog`}>
                    All articles
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              ) : null}
            </div>
            <ArticleGrid articles={articles} />
          </Container>
        </Section>
      ) : null}

      {/* 9. Lead CTA */}
      <Section>
        <Container className="max-w-[68ch]">
          <LeadForm
            leadType="general"
            heading={`Thinking about ${city.name}?`}
            description={
              isFlagship
                ? "I live here. Ask me anything about a street, a school zone or a builder — you will get a straight answer, not a brochure."
                : `Tell me what you are looking for in ${city.name} and I will tell you what is realistic at that budget.`
            }
            compact
            submitLabel="Send message"
          />
        </Container>
      </Section>
    </>
  );
}
