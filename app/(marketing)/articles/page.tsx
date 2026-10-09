import type { Metadata } from "next";
import Link from "next/link";
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
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { allCities } from "@/lib/site-config";
import {
  articleCanonical,
  filterArticles,
  isFiltered,
  parseArticleParams,
} from "@/lib/validation/article-params";
import { cn } from "@/lib/utils";

/**
 * `/articles` — the writing hub.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * Articles were reachable in two places that named the format rather than the
 * subject: `/market-updates` and `/lake-mary/blog`. A visitor looking for "what
 * has she written about Sanford" had nowhere to go, and a piece about Sanford
 * appeared only inside a list called Market Updates.
 *
 * This is the index the nav points at, with every city's writing combined, and
 * the per-city pages under it are what "sorted by city" means. It is an INDEX,
 * not a new home for the articles: every card links to the article's existing
 * URL, because a published URL is permanent (CLAUDE.md § 3 rule 11) and a second
 * URL serving the same piece would be a duplicate competing with the original.
 *
 * ── Why the articles come first ───────────────────────────────────────────
 *
 * The hero is `sm`, and the search bar and the results are the first things under
 * it. Somebody arriving here wants to find one article, and every row of
 * explanation above the list is a row between them and it. What the hub says
 * ABOUT itself — the city pages, the answer hub, the guides — sits below the
 * results, where it serves the visitor who did not find what they came for.
 *
 * ── Dynamic, like `/search` ───────────────────────────────────────────────
 *
 * The filters are query parameters and the server applies them, so the page
 * renders per request. Same policy as the listing search: the bare URL is
 * canonical and indexed, every filtered permutation is `noindex, follow`, and a
 * filtered view is a link somebody can send.
 */

export const dynamic = "force-dynamic";

type Search = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const crumbs = [{ href: "/articles", label: "Articles" }];

export async function generateMetadata({ searchParams }: Search): Promise<Metadata> {
  const params = parseArticleParams(await searchParams);
  const canonical = articleCanonical("/articles", params);

  return buildMetadata({
    title: "Articles: Central Florida Real Estate & Building",
    description:
      "Every piece written for this site, searchable and filterable by city and topic — market notes, neighbourhood detail and the construction side of buying a house in Central Florida.",
    path: canonical.path,
    noindex: !canonical.index,
  });
}

export default async function ArticlesHubPage({ searchParams }: Search) {
  const params = parseArticleParams(await searchParams);

  const [settings, all] = await Promise.all([
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(articles)"),
    /*
      200 is the cap, and it is the whole index.

      Filtering happens over this set rather than in Postgres, because one agent's
      writing will not reach two hundred pieces for years and a second round trip
      to narrow a list the page already has buys nothing. When it does outgrow
      this, the query becomes a full-text search — which is what `searchListings`
      already is, and why the parser and the filter live in
      `lib/validation/article-params.ts` beside its equivalent.
    */
    safeQuery(() => getArticles({ limit: 200 }), [], "getArticles(hub)"),
  ]);

  const articles = filterArticles(all, params);
  const photo = heroPhoto(settings.heroKey, settings.heroAlt?.trim() || "Central Florida homes", 1920, 1080);

  /*
    Counts per city, from the articles themselves.

    A city link that leads to an empty page advertises writing that does not
    exist, so the list below the results shows only cities that have something.
    Every city page is in the nav and the sitemap either way — they answer a real
    question ("has she written about Oviedo?") even when the answer is "not yet".
  */
  const counts = new Map<string, number>();
  for (const article of all) {
    if (article.city?.slug) {
      counts.set(article.city.slug, (counts.get(article.city.slug) ?? 0) + 1);
    }
  }

  const cityLinks = allCities
    .map((city) => ({ ...city, count: counts.get(city.slug) ?? 0 }))
    .filter((city) => city.count > 0);

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline="Articles"
        title="Written about Central Florida"
        lead="Market notes, neighbourhood detail and the construction side of buying a house. Search it, or narrow it to one city."
        crumbs={crumbs}
        photo={photo}
        size="sm"
      />

      {/* ── The articles, first ─────────────────────────────────────────── */}
      <Section className="pt-8">
        <Container className="flex flex-col gap-6">
          {all.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="The first piece is being written"
              description="In the meantime, the answer hub covers the questions buyers, sellers and homeowners ask most often — sixty-two of them, in full."
              actions={
                <Button asChild variant="accent">
                  <Link href="/answers">Read the answers</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ArticleFilters
                all={all}
                params={params}
                basePath="/articles"
                resultCount={articles.length}
              />

              {articles.length > 0 ? (
                <ArticleGrid articles={articles} leadsPage />
              ) : (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border bg-surface-sunken p-6">
                  <p className="text-lead font-medium text-foreground">
                    Nothing matches that yet.
                  </p>
                  <p className="max-w-[60ch] text-sm text-foreground-muted">
                    Try a single word, or clear the filters to see everything. If it
                    is a question rather than a topic, the answer hub may already
                    cover it.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link href="/articles">Clear filters</Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link href="/answers">Search the answers</Link>
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Container>
      </Section>

      {/* ── Everything else, after ──────────────────────────────────────── */}
      {cityLinks.length > 0 && !isFiltered(params) ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-6">
            <SectionHeader
              overline="By city"
              title="One page per place"
              lead="Each city has its own page, with the writing about it and a route into its guide and its current listings."
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cityLinks.map((city) => (
                <li key={city.slug}>
                  <Link
                    href={`/articles/${city.slug}`}
                    className={cn(
                      "flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-5 py-4",
                      "transition-colors duration-(--dur-fast) hover:bg-surface-sunken",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    )}
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="text-body font-semibold text-foreground">{city.name}</span>
                      <span className="text-xs text-foreground-subtle">{city.county} County</span>
                    </span>
                    <span className="shrink-0 text-sm text-foreground-muted tabular">
                      {city.count}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      <Section>
        <Container className="flex flex-col gap-5">
          <SectionHeader
            overline="Also here"
            title="If you came with a question"
            lead="The answer hub takes the questions buyers, sellers and homeowners ask most often and answers them outright — no article to read through first."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="accent">
              <Link href="/answers">
                62 answers
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/guides/va-home-buyer">VA home-buyer guide</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/hire-contractor">Hire a contractor</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
