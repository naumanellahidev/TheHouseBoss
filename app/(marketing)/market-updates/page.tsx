import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock, LineChart } from "lucide-react";

import { ArticleGrid, articleHref } from "@/components/site/article-card";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { MediaFrame, heroPhoto, portraitPhoto } from "@/components/site/media-frame";
import { PageHero } from "@/components/site/page-hero";
import { PropertyImage } from "@/components/site/property-image";
import { Button } from "@/components/ui/button";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { getArticles } from "@/lib/queries/articles";
import { getCities } from "@/lib/queries/cities";
import { getPageHero } from "@/lib/queries/page-sections";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { cn, formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import type { City } from "@/types/domain";

export const revalidate = 3600;

export const metadata: Metadata = buildMetadata({
  title: "Central Florida Market Updates",
  description:
    "What the Lake Mary, Longwood, Sanford, Casselberry and Orlando housing markets are actually doing — with the date every figure was true, and what it means if you are buying or selling.",
  path: "/market-updates",
});

/**
 * `/market-updates` — "Insights" in the navigation.
 *
 * The page's job is to be the dated, citable source on what prices here are
 * doing, which is what AI search quotes. So every section that shows a figure
 * shows the date it was true, and a figure without a date is not shown.
 *
 * It also has to work on day one, when no update has been published: the city
 * photo tiles and the "at a glance" figures come from the cities she has
 * already filled in, so the page is useful before the first article exists.
 */
export default async function MarketUpdatesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;

  const [articles, cities, hero, settings] = await Promise.all([
    safeQuery(
      () => getArticles({ kind: "market_update", citySlug: city, limit: 48 }),
      [],
      "getArticles(market updates)",
    ),
    safeQuery(() => getCities(), [] as City[], "getCities"),
    getPageHero("market-updates"),
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(market-updates)"),
  ]);

  const crumbs = [{ href: "/market-updates", label: "Market Updates" }];
  const active = cities.find((item) => item.slug === city);
  const flagship =
    cities.find((item) => item.isFlagship) ?? cities.find((item) => item.slug === "lake-mary");

  /*
    The photograph chosen in Admin → Pages, else the flagship city's, else the
    site hero. All three are already in the Media library.
  */
  const photo = heroPhoto(
    hero.imageKey || flagship?.heroKey || settings.heroKey,
    "",
    1920,
    1080,
  );

  const [latest, ...rest] = articles;
  const glanceCity = active ?? flagship;
  const glance = glanceCity ? glanceFigures(glanceCity) : [];
  const cityTiles = cities.filter((item) => item.heroKey);
  const portrait = portraitPhoto(settings);
  // Only a city with a date on its figures gets the section (docs/14 § 1).
  const showGlance = Boolean(glanceCity && glance.length > 0 && glanceCity.stats.asOf);

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline={hero.overline}
        title={hero.title}
        lead={hero.lead}
        crumbs={crumbs}
        photo={photo}
        size="lg"
      />

      {/* ── City filter, on glass over the hero's lower edge ─────────────── */}
      {cities.length > 0 ? (
        <div className="relative z-10 -mt-8 md:-mt-10">
          <Container>
            <nav
              aria-label="Filter by city"
              className="glass scroll-row gap-2 rounded-2xl p-2 md:flex-wrap"
            >
              <CityChip href="/market-updates" active={!city}>
                Every city
              </CityChip>
              {cities.map((option) => (
                <CityChip
                  key={option.slug}
                  href={`/market-updates?city=${option.slug}`}
                  active={city === option.slug}
                >
                  {option.name}
                </CityChip>
              ))}
            </nav>
          </Container>
        </div>
      ) : null}

      {/* ── Latest update, then the rest ──────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-10">
          {latest ? (
            <>
              <div className="flex flex-col gap-5">
                <SectionHeader
                  overline={active ? active.name : "Latest"}
                  title={active ? `The latest on ${active.name}` : "The latest update"}
                />
                <Link
                  href={articleHref(latest)}
                  className={cn(
                    "group grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm lg:grid-cols-12",
                    "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
                    "hover:-translate-y-0.5 hover:shadow-md",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  )}
                >
                  <div className="overflow-hidden lg:col-span-7">
                    {latest.coverKey ? (
                      <PropertyImage
                        photo={{
                          kind: "stored",
                          key: latest.coverKey,
                          w: 1200,
                          h: 675,
                          alt: latest.coverAlt ?? "",
                        }}
                        size={1600}
                        sizes={IMAGE_SIZES.listingHero}
                        aspect="16/9"
                        className="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex aspect-video items-center justify-center bg-surface-invert text-azure-400">
                        <LineChart className="size-12" aria-hidden="true" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 p-6 md:p-8 lg:col-span-5 lg:justify-center">
                    {latest.city ? (
                      <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                        {latest.city.name}
                      </p>
                    ) : null}
                    <h3 className="text-h3 text-foreground">{latest.title}</h3>
                    {latest.excerpt ? (
                      <p className="line-clamp-4 text-body text-foreground-muted">
                        {latest.excerpt}
                      </p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 text-xs text-foreground-subtle">
                      {latest.publishedAt ? (
                        <span className="flex items-center gap-1.5">
                          <CalendarDays className="size-3.5" aria-hidden="true" />
                          <time dateTime={latest.publishedAt}>
                            {formatDate(latest.publishedAt)}
                          </time>
                        </span>
                      ) : null}
                      {latest.readingMin ? (
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-3.5" aria-hidden="true" />
                          {latest.readingMin} min
                        </span>
                      ) : null}
                    </div>
                    <span className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-quiet">
                      Read the update
                      <ArrowRight
                        className="size-4 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              </div>

              {rest.length > 0 ? (
                <div className="flex flex-col gap-5">
                  <h2 className="text-h3">Earlier updates</h2>
                  <ArticleGrid articles={rest} />
                </div>
              ) : null}
            </>
          ) : (
            /*
              Nothing published yet. A composed panel rather than a grey icon
              box: who is writing it, and what to do in the meantime.
            */
            <div className="grid overflow-hidden rounded-2xl border border-border bg-surface shadow-sm md:grid-cols-12">
              {portrait ? (
                <div className="md:col-span-4">
                  <MediaFrame
                    photo={portrait}
                    sizes={IMAGE_SIZES.portrait}
                    aspect="4/5"
                    className="h-full rounded-none"
                  />
                </div>
              ) : null}
              <div
                className={cn(
                  "flex flex-col justify-center gap-4 p-6 md:p-10",
                  portrait ? "md:col-span-8" : "md:col-span-12",
                )}
              >
                <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                  {active ? active.name : "Coming soon"}
                </p>
                <h2 className="text-h2">
                  {active
                    ? `No ${active.name} update published yet`
                    : "The first market update is being written"}
                </h2>
                <p className="max-w-[56ch] text-body text-foreground-muted">
                  Rather than publish a stale figure, nothing goes up until there
                  is something real to say. Ask, and I will tell you where the
                  market is today for the street you have in mind.
                </p>
                <div className="flex flex-wrap gap-3 pt-2">
                  <Button asChild variant="accent" size="lg">
                    <Link href="#ask">Ask about your area</Link>
                  </Button>
                  {active ? (
                    <Button asChild variant="outline" size="lg">
                      <Link href="/market-updates">All cities</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          )}
        </Container>
      </Section>

      {/* ── At a glance: dated figures she has entered for the city ─────── */}
      {showGlance && glanceCity?.stats.asOf ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                overline="At a glance"
                title={`${glanceCity.name} in three numbers`}
                lead="The figures on the city guide, with the date they were true. They move; the guide has the context."
              />
              <p className="flex items-center gap-2 text-sm text-foreground-muted">
                <CalendarDays className="size-4 text-accent-quiet" aria-hidden="true" />
                Figures as of{" "}
                <time dateTime={glanceCity.stats.asOf} className="font-semibold text-foreground">
                  {formatDate(glanceCity.stats.asOf)}
                </time>
              </p>
            </div>

            <ul className={cn("grid gap-4", glance.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
              {glance.map((figure) => (
                <li
                  key={figure.label}
                  className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-6 shadow-sm"
                >
                  <span className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
                    {figure.label}
                  </span>
                  <span className="font-display text-h2 text-foreground tabular">
                    {figure.value}
                  </span>
                  <span className="text-sm text-foreground-muted">{figure.detail}</span>
                </li>
              ))}
            </ul>

            <Button asChild variant="outline" className="self-start">
              <Link href={`/${glanceCity.slug}`}>
                Read the {glanceCity.name} guide
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </Container>
        </Section>
      ) : null}

      {/* ── Browse by city ────────────────────────────────────────────────── */}
      {cityTiles.length > 0 ? (
        /*
          Same ground as the section above it when the glance figures are
          hidden, so the two paddings would stack into one tall empty band.
        */
        <Section className={showGlance ? undefined : "pt-0"}>
          <Container className="flex flex-col gap-8">
            <SectionHeader
              overline="City guides"
              title="Every market I work in"
              lead="Schools, commute, the neighborhoods and what the market is doing — one guide per city."
            />
            {/* Two across on a phone: eight full-width tiles was a very long scroll. */}
            <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {cityTiles.map((tile) => (
                <li key={tile.slug}>
                  <Link
                    href={`/${tile.slug}`}
                    className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <MediaFrame
                      photo={heroPhoto(tile.heroKey, "", 1600, 1200)}
                      sizes={IMAGE_SIZES.cardGrid4}
                      aspect="4/3"
                      scrim
                      imageClassName="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.03]"
                    >
                      <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3 text-foreground-invert sm:p-4">
                        <span className="flex min-w-0 flex-col">
                          <span className="text-body font-semibold md:text-h4">{tile.name}</span>
                          <span className="text-xs text-foreground-invert-muted">
                            {tile.county} County
                          </span>
                        </span>
                        <ArrowRight
                          className="hidden size-5 shrink-0 transition-transform duration-(--dur-fast) group-hover:translate-x-0.5 sm:block"
                          aria-hidden="true"
                        />
                      </div>
                    </MediaFrame>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* ── Ask about your street ─────────────────────────────────────────── */}
      <Section tone="invert" id="ask" className="scroll-mt-24">
        <Container className="grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-12">
          <div className="flex flex-col gap-6 lg:col-span-5">
            <SectionHeader
              invert
              overline="Your street"
              title="Tell me the street. I will tell you what sold there."
              lead="An update covers a city. Your decision turns on a few blocks — send the address and I will reply with the recent sales that matter for it."
            />
            {portrait ? (
              <div className="flex items-center gap-4">
                <MediaFrame
                  photo={portrait}
                  sizes={IMAGE_SIZES.thumb}
                  aspect="1/1"
                  className="w-16 shrink-0"
                />
                <p className="text-sm text-foreground-invert-muted">
                  <span className="block font-semibold text-foreground-invert">
                    {siteConfig.knownAs}
                  </span>
                  Realtor and Certified Residential Contractor
                </p>
              </div>
            ) : null}
          </div>
          <div className="rounded-2xl bg-surface p-6 text-foreground shadow-float md:p-8 lg:col-span-7">
            <LeadForm
              compact
              heading="Ask about your area"
              description="The street or the neighborhood, and whether you are buying or selling."
              submitLabel="Send"
            />
          </div>
        </Container>
      </Section>

      {/* docs/09 § 6: market pages carry the estimate disclaimer. */}
      <Container className="py-10">
        <Disclaimer type="estimate" />
      </Container>
    </>
  );
}

/**
 * The figures to show for a city, in the order a buyer asks about them.
 *
 * A figure she has never entered is left out rather than shown as "—": a row of
 * dashes looks like a broken page, and an absent figure says nothing false.
 */
function glanceFigures(city: City): { label: string; value: string; detail: string }[] {
  const figures: { label: string; value: string; detail: string }[] = [];
  const { medianPrice, medianPricePerSqft, avgDaysOnMarket } = city.stats;

  if (typeof medianPrice === "number") {
    figures.push({
      label: "Median price",
      value: formatPrice(medianPrice, { compact: true }),
      detail: "Half of homes sold for more, half for less",
    });
  }
  if (typeof medianPricePerSqft === "number") {
    figures.push({
      label: "Per square foot",
      value: formatPrice(medianPricePerSqft),
      detail: "Median price divided by living area",
    });
  }
  if (typeof avgDaysOnMarket === "number") {
    figures.push({
      label: "Days on market",
      value: String(avgDaysOnMarket),
      detail: "Average time from listing to contract",
    });
  }
  return figures;
}

function CityChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-primary bg-primary text-primary-fg"
          : "border-transparent text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
