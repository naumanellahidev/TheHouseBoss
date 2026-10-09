import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Newspaper } from "lucide-react";

import { ArticleGrid } from "@/components/site/article-card";
import { ArticleFilters } from "@/components/site/article-filters";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { JsonLd } from "@/components/site/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { heroPhoto } from "@/components/site/media-frame";
import { Button } from "@/components/ui/button";
import { getArticles } from "@/lib/queries/articles";
import { getCityBySlug } from "@/lib/queries/cities";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { getSeoOverride } from "@/lib/queries/seo";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { allCities } from "@/lib/site-config";
import {
  articleCanonical,
  filterArticles,
  parseArticleParams,
} from "@/lib/validation/article-params";

export const dynamic = "force-dynamic";

/**
 * `/articles/{city}` — everything written about one city.
 *
 * ── Why the cities come from site-config ──────────────────────────────────
 *
 * `allCities` is the compile-time list, so these pages exist and are prerendered
 * whether or not the city has a row in the database yet, and whether or not
 * anything has been written about it. That is deliberate: the nav offers one per
 * city, and a nav item that 404s is worse than a page saying "nothing yet and
 * here is the city guide instead".
 *
 * A slug that is not in that list still 404s. This is not a filter anyone may
 * invent a value for — `/articles/miami` would be a page claiming a service area
 * that is not served.
 *
 * ── Why the articles are not re-hosted here ───────────────────────────────
 *
 * Every card links to the article's own permanent URL. This page is an index, so
 * it can be added, renamed or reorganised without touching a published address
 * (CLAUDE.md § 3 rule 11) and without creating a second copy of the writing for a
 * search engine to choose between.
 */

function cityFromSlug(slug: string) {
  return allCities.find((city) => city.slug === slug) ?? null;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const [{ city: slug }, rawSearch] = await Promise.all([params, searchParams]);
  const city = cityFromSlug(slug);

  if (!city) {
    return { title: "Not found", robots: { index: false, follow: true } };
  }

  const path = `/articles/${city.slug}`;
  const filters = parseArticleParams(rawSearch);
  const canonical = articleCanonical(path, { ...filters, city: "" });
  const override = await getSeoOverride(path);

  return buildMetadata({
    override,
    noindex: !canonical.index,
    title: `${city.name} Articles: Market, Neighbourhoods & Building`,
    description:
      `Everything written about ${city.name}, Florida — what the market is actually doing, ` +
      `what the neighbourhoods are like, and the construction questions worth asking before ` +
      `you buy. From Krisi Kakarova, Realtor and licensed residential contractor.`,
    path,
  });
}

export default async function CityArticlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ city: slug }, rawSearch] = await Promise.all([params, searchParams]);
  const city = cityFromSlug(slug);
  if (!city) notFound();

  const [settings, all, cityRecord] = await Promise.all([
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(city articles)"),
    safeQuery(() => getArticles({ citySlug: slug, limit: 200 }), [], `getArticles(${slug})`),
    safeQuery(() => getCityBySlug(slug), null, `getCityBySlug(${slug})`),
  ]);

  /*
    The city is fixed by the path, so it is forced into the parameters rather
    than read from them. A hand-edited `?city=` on this page would otherwise
    show somebody Sanford's writing under a heading that says Lake Mary.
  */
  const filters = { ...parseArticleParams(rawSearch), city: slug };
  const articles = filterArticles(all, filters);

  const crumbs = [
    { href: "/articles", label: "Articles" },
    { href: `/articles/${city.slug}`, label: city.name },
  ];

  /*
    The city's own hero photograph when it has one, the site hero otherwise.

    Not a stock picture of somewhere else: the hero on a page about Sanford
    showing Lake Mary is the kind of detail that is never noticed and never
    forgiven.
  */
  const photo =
    heroPhoto(cityRecord?.heroKey, cityRecord?.heroAlt ?? city.name, 1920, 1080) ??
    heroPhoto(settings.heroKey, settings.heroAlt?.trim() || "Central Florida homes", 1920, 1080);

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      {/*
        `sm`, and the articles immediately under it.

        Somebody who arrived from the Articles menu wants this city's writing, so
        the list is the first thing on the page. What the page says about itself —
        the city guide, the listings — is below the results, for the visitor who
        did not find what they came for.
      */}
      <PageHero
        overline="Articles"
        title={`Written about ${city.name}`}
        lead={`What the ${city.name} market is doing, what the neighbourhoods are actually like, and the construction side of buying here.`}
        crumbs={crumbs}
        photo={photo}
        size="sm"
      />

      <Section className="pt-8">
        <Container className="flex flex-col gap-8">
          {all.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title={`Nothing about ${city.name} yet`}
              description={`The ${city.name} guide covers the schools, the commute and what the neighbourhoods are like — and every listing in the city is one click away.`}
              actions={
                <div className="flex flex-wrap gap-3">
                  <Button asChild variant="accent">
                    <Link href={`/${city.slug}`}>The {city.name} guide</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/articles">All articles</Link>
                  </Button>
                </div>
              }
            />
          ) : (
            <>
              <SectionHeader
                overline={`${city.name}, ${city.county} County`}
                title={`${all.length} ${all.length === 1 ? "piece" : "pieces"} about ${city.name}`}
                lead="Search within them, or narrow by type and topic."
              />
              {/*
                The city control is locked, not omitted: this page IS the city
                filter, and offering the control again would let somebody set it
                to a different city on a page whose title, breadcrumb and URL all
                say this one. It travels as a hidden field so a search inside the
                city does not silently widen to all of them.
              */}
              <ArticleFilters
                all={all}
                params={filters}
                basePath={`/articles/${city.slug}`}
                lockedCity={city.slug}
                resultCount={articles.length}
              />

              {articles.length > 0 ? (
                <ArticleGrid articles={articles} leadsPage />
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-sunken p-6">
                  <p className="text-lead font-medium text-foreground">
                    Nothing in {city.name} matches that.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href={`/articles/${city.slug}`}>Clear filters</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/articles">Search every city</Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Container>
      </Section>

      {/*
        Out to the city itself, and across to the rest of the writing.

        Both links matter for more than navigation: the city hub is the page that
        should rank for "{city} homes for sale", and a link to it from every piece
        of writing about the city is the clearest signal available that the two
        are about the same place.
      */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-4">
          <SectionHeader
            overline="Next"
            title={`Looking at ${city.name} itself?`}
            lead={`The city guide has the schools, the commute, the neighbourhoods and what is for sale right now.`}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <Link href={`/${city.slug}`}>
                {city.name} guide
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/${city.slug}/homes-for-sale`}>Homes for sale in {city.name}</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/articles">All articles</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
