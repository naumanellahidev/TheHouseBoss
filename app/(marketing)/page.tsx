import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Award,
  Building2,
  ClipboardCheck,
  FileSignature,
  HardHat,
  Home,
  MapPin,
  Quote,
  Ruler,
  ShieldCheck,
  Star,
  Wrench,
} from "lucide-react";

import { FeaturedListings } from "@/components/listing/featured-listings";
import { CityTiles } from "@/components/site/city-tiles";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { FloatCard } from "@/components/site/float-card";
import { LeadForm } from "@/components/site/lead-form";
import { MediaFrame, heroPhoto } from "@/components/site/media-frame";
import { IMAGE_SIZES, PropertyImage } from "@/components/site/property-image";
import { SearchBar } from "@/components/site/search-bar";
import { StatTiles } from "@/components/site/stat-tiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCityBySlug, getSearchCities } from "@/lib/queries/cities";
import {
  countPublishedListings,
  getFacets,
  getFeaturedListings,
} from "@/lib/queries/listings";
import { getReviews } from "@/lib/queries/articles";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSiteSettings } from "@/lib/queries/settings";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import { formatPrice } from "@/lib/utils";

/**
 * The home page — all eleven sections of docs/05-page-specs.md § Home.
 *
 * This page shipped as a Phase 0 demo (hero + trust strip + a card reading
 * "The rest of this page is built in Phase 3") and was never revisited: the
 * roadmap's Phase 3 lists fifteen tasks and none of them is the home page, so
 * the phase closed with the placeholder in place. That is recorded in
 * PROGRESS.md rather than quietly fixed.
 *
 * Every section that depends on data self-hides or degrades, because the
 * launch reality is 0–6 listings and no reviews yet. The rules come from the
 * spec's empty-state strategy, not from taste:
 *
 *   fewer than 3 featured  → hide section 4 entirely
 *   fewer than 3 reviews   → hide section 10 entirely
 *   fewer than 5 published → the hero's primary CTA becomes listing alerts,
 *                            because sending someone to a near-empty search
 *                            result is worse than not sending them at all
 *   a city with 0 listings → still tiled, linking to its guide page
 */

export const metadata: Metadata = buildMetadata({
  title: "Lake Mary & Central Florida Homes for Sale",
  description:
    "Search homes for sale in Lake Mary, Longwood, Sanford, Casselberry and Orlando with a Realtor who is also a licensed residential contractor — VA buyers, assumable mortgages and new construction.",
  path: "/",
});

/* ── Static content ──────────────────────────────────────────────────────── */

const trustPoints = [
  {
    icon: Award,
    label: `${siteConfig.yearsExperience} Years Experience`,
    detail: "Serving Central Florida since 2013",
  },
  {
    icon: ShieldCheck,
    label: siteConfig.licenses.realEstate.label,
    detail: siteConfig.licenses.realEstate.number,
  },
  {
    icon: HardHat,
    label: siteConfig.licenses.contractor.label,
    detail: siteConfig.licenses.contractor.number,
  },
  {
    icon: MapPin,
    label: siteConfig.brokerage,
    detail: "Lake Mary, Florida",
  },
];

/** Section 3. The three specialties, in the order the brief prioritises them. */
const specialties = [
  {
    href: "/guides/va-home-buyer",
    icon: Home,
    title: "VA home buyers",
    hook: "Entitlement, zero down, and the Minimum Property Requirements that quietly end VA deals — read by someone who can spot them before you offer.",
  },
  {
    href: "/assumable-mortgage-homes",
    icon: FileSignature,
    title: "Assumable mortgages",
    hook: "Take over a seller's low-rate VA, FHA or USDA loan. The equity gap is the number that decides whether it works.",
  },
  {
    href: "/new-construction-representation",
    icon: HardHat,
    title: "New construction",
    hook: "The sales office works for the builder. Register your own representation before your first model-home visit — it takes one message.",
  },
];

/**
 * Section 7. The contractor differentiator.
 *
 * docs/05 § Home: "This is the differentiator; do not cut it." It is the one
 * thing on this site no competing agent can copy, so it gets its own section
 * rather than a line in the bio.
 */
const contractorValue = [
  {
    icon: ClipboardCheck,
    title: "I read condition, not finishes",
    body: "Fresh paint and new flooring are the cheapest things in a house. I look at the roof, the panel, the windows and the grading — the things that cost five figures.",
  },
  {
    icon: Wrench,
    title: "Repair exposure before you offer",
    body: "You find out what a property is likely to need, and roughly what it costs, while you can still negotiate on it rather than after the inspection.",
  },
  {
    icon: Ruler,
    title: "Whether the remodel is realistic",
    body: "Moving a wall, opening a kitchen, adding a bathroom — I can tell you what is structural, what is permitted, and what it actually costs here.",
  },
  {
    icon: Building2,
    title: "Oversight on a new build",
    body: "I know what to look for at each construction-phase walkthrough, and what to raise before the one-year warranty window closes.",
  },
];

/** Section 9. Mirrors the hand-authored list on /guides — not DB-backed. */
const guides = [
  {
    href: "/guides/va-home-buyer",
    title: "VA home-buyer guide",
    lead: "Entitlement, the funding fee, and the MPRs that end VA deals in Central Florida.",
  },
  {
    href: "/assumable-mortgage-homes",
    title: "Assumable mortgage homes",
    lead: "Which loans qualify, the equity gap, and what actually goes wrong.",
  },
  {
    href: "/new-construction-representation",
    title: "New-construction representation",
    lead: "Why registering your agent before the first visit matters more than anything else.",
  },
];

/* ── Page ────────────────────────────────────────────────────────────────── */

export default async function HomePage() {
  /*
    One parallel fetch. Each is wrapped in safeQuery so a single failing query
    degrades its own section rather than 500-ing the site's front door — the
    same discipline the marketing layout uses for settings.
  */
  const [cities, facets, featured, published, lakeMary, reviews, settings] =
    await Promise.all([
      safeQuery(() => getSearchCities(), [], "getSearchCities(home)"),
      safeQuery(
        () => getFacets(),
        {
          cities: [],
          propertyTypes: [],
          listingTypes: [],
          price: null,
          beds: null,
          sqft: null,
          year: null,
          total: 0,
        },
        "getFacets(home)",
      ),
      safeQuery(() => getFeaturedListings(6), [], "getFeaturedListings(home)"),
      safeQuery(() => countPublishedListings(), 0, "countPublishedListings(home)"),
      safeQuery(() => getCityBySlug("lake-mary"), null, "getCityBySlug(home)"),
      safeQuery(() => getReviews(3), [], "getReviews(home)"),
      safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(home)"),
    ]);

  /** Spec: swap the primary CTA rather than advertise an empty search. */
  const inventoryIsThin = published < 5;
  const showFeatured = featured.length >= 3;
  const showReviews = reviews.length >= 3;

  const lakeMaryStats = lakeMary
    ? [
        lakeMary.stats.medianPrice != null && {
          label: "Median sale price",
          value: formatPrice(lakeMary.stats.medianPrice, { compact: true }),
        },
        lakeMary.stats.avgDaysOnMarket != null && {
          label: "Days on market",
          value: String(lakeMary.stats.avgDaysOnMarket),
        },
        lakeMary.stats.schoolDistrict && {
          label: "School district",
          value: lakeMary.stats.schoolDistrict,
        },
      ].filter((s): s is { label: string; value: string } => Boolean(s))
    : [];

  return (
    <>
      {/* ── 1. Hero + search ─────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert">
        {/*
          The navy gradient and gold grid stay as the base layer. They are not
          dead weight: if the hero photograph is ever missing the section still
          reads as designed rather than as a black box.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-ink-800),var(--color-ink-950))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 [background-image:linear-gradient(var(--color-gold-500)_1px,transparent_1px),linear-gradient(90deg,var(--color-gold-500)_1px,transparent_1px)] [background-size:72px_72px] opacity-[0.07]"
        />

        {heroPhoto(settings.heroKey, "") ? (
          <div aria-hidden="true" className="absolute inset-0 -z-10">
            <PropertyImage
              photo={heroPhoto(settings.heroKey, "")}
              size={800}
              sizes={IMAGE_SIZES.fullBleed}
              priority
              aspect="none"
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover motion-safe:animate-[ken-burns_24s_var(--ease-in-out)_infinite_alternate]"
            />
            {/*
              Scrim, not optional: docs/03 forbids text over an image without
              one, and the headline sits directly on top of this.
            */}
            <div className="absolute inset-0 bg-[linear-gradient(105deg,var(--color-ink-950)_18%,rgb(10_20_32/0.78)_52%,rgb(10_20_32/0.55)_100%)]" />
          </div>
        ) : null}

        <Container className="py-16 md:py-24 xl:py-32">
          {/*
            Asymmetric: copy at 7/12, media at 5/12. The old layout was a
            centred band, which is what made the page read as a template.
          */}
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col items-start gap-6 lg:col-span-7">
              <Badge tone="accent" className="bg-ink-800 text-gold-400">
                Lake Mary · Seminole &amp; Orange County
              </Badge>

              <h1 className="text-display text-foreground-invert">
                Find your home in{" "}
                <span className="relative whitespace-nowrap">
                  Lake Mary
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 -bottom-1 h-1 bg-accent md:-bottom-2 md:h-1.5"
                  />
                </span>
              </h1>

              <p className="max-w-[52ch] text-lead text-foreground-invert-muted">
                {siteConfig.positioning}
              </p>

              <p className="max-w-[56ch] text-body text-foreground-invert-muted">
                I&rsquo;m Krisi Kakarova — a licensed Realtor{" "}
                <em className="text-gold-400 not-italic">and</em> a Certified
                Residential Building Contractor. I read a property the way a
                builder does, so you can look past the finishes and make a
                decision you will still be happy with in five years.
              </p>

              {inventoryIsThin ? (
                <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
                  <Button variant="accent" size="lg" asChild>
                    <Link href="/contact">
                      Get new listing alerts
                    </Link>
                  </Button>
                  <Button variant="invert" size="lg" asChild>
                    <Link href="/search">Browse what is available</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
                  <Button variant="accent" size="lg" asChild>
                    <Link href="/search">Search homes</Link>
                  </Button>
                  <Button variant="invert" size="lg" asChild>
                    <Link href="/contact">Talk to Krisi</Link>
                  </Button>
                </div>
              )}
            </div>

            {/*
              The media column is hidden below lg rather than stacked: on a
              phone it would push the search card off the first screen, and
              search is what the client asked to lead with.
            */}
            <div className="relative hidden lg:col-span-5 lg:block">
              <MediaFrame
                photo={heroPhoto(lakeMary?.heroKey, lakeMary?.heroAlt, 1200, 1500)}
                sizes="(max-width: 1023px) 0px, 40vw"
                priority
                aspect="4/5"
              />
              {lakeMary?.stats.medianPrice != null ? (
                <FloatCard
                  className="absolute -bottom-6 -left-6 max-w-[15rem]"
                  label="Lake Mary median"
                  value={formatPrice(lakeMary.stats.medianPrice, {
                    compact: true,
                  })}
                  caption={
                    lakeMary.stats.asOf
                      ? `As of ${lakeMary.stats.asOf}`
                      : undefined
                  }
                />
              ) : null}
            </div>
          </div>

          {/* The search card, overlapping the hero's lower edge on desktop. */}
          <div className="mt-10 lg:mt-16">
            <SearchBar cities={cities} variant="hero" />
          </div>
        </Container>
      </section>

      {/* ── 2. Trust strip ───────────────────────────────────────────── */}
      <Section tone="sunken" className="border-b border-border">
        <Container>
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
            {trustPoints.map(({ icon: Icon, label, detail }) => (
              <li key={label} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
                >
                  <Icon className="size-4.5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm leading-snug font-semibold text-foreground">
                    {label}
                  </span>
                  <span className="text-xs text-foreground-subtle tabular">
                    {detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── 3. Specialty cards ───────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="What I specialise in"
            title="Three situations where the right agent changes the outcome"
            lead="Each of these has a full guide, written from doing the work rather than summarising someone else's article."
          />

          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
            {specialties.map(({ href, icon: Icon, title, hook }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-sm transition-[transform,box-shadow] duration-(--dur-fast) ease-(--ease-out) hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring lg:p-6"
                >
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
                  >
                    <Icon className="size-6" />
                  </span>
                  <span className="text-h4 font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="text-sm text-foreground-muted">{hook}</span>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-accent-quiet">
                    Read the guide
                    <ArrowRight
                      aria-hidden="true"
                      className="size-4 transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── 4. Featured listings — hidden below three ────────────────── */}
      {showFeatured ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader
                overline="Featured"
                title="Homes worth a closer look"
              />
              <Button variant="outline" asChild>
                <Link href="/search">See all homes</Link>
              </Button>
            </div>
            <FeaturedListings listings={featured} />
          </Container>
        </Section>
      ) : null}

      {/* ── 5. Search by city ────────────────────────────────────────── */}
      {cities.length > 0 ? (
        <Section>
          <Container className="flex flex-col gap-8">
            <SectionHeader
              overline="Search by city"
              title="Where I work"
              lead="Seminole and Orange County. Each city has its own guide — schools, commute, what the market is actually doing — not just a list of homes."
            />
            <CityTiles cities={cities} facets={facets} />
          </Container>
        </Section>
      ) : null}

      {/* ── 6. Meet The House Boss ───────────────────────────────────── */}
      <Section tone="sunken">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="relative lg:col-span-5">
              <MediaFrame
                photo={null}
                size={800}
                sizes={IMAGE_SIZES.portrait}
                aspect="4/5"
                className="mx-auto max-w-sm lg:mx-0 lg:max-w-none"
              />
              <FloatCard
                className="mx-auto mt-[-2rem] max-w-[17rem] lg:absolute lg:-right-6 lg:bottom-6 lg:mt-0"
                icon={HardHat}
                label="Dual licensed"
                value="Realtor + Contractor"
                caption={`${siteConfig.licenses.realEstate.number} · ${siteConfig.licenses.contractor.number}`}
              />
            </div>

            <div className="flex flex-col items-start gap-5 lg:col-span-7">
              <SectionHeader
                overline="Meet The House Boss"
                title="You gain more than a Realtor"
              />
              <p className="text-lead text-foreground-muted">
                I do more than help clients buy and sell homes. My residential
                construction experience gives me a deeper understanding of a
                property&rsquo;s condition, potential repair needs, remodeling
                possibilities and long-term potential.
              </p>
              <p className="text-body text-foreground-muted">
                I help my clients look beyond appearances so they can make
                informed, confident decisions — and I specialise in Lake Mary,
                the city I am proud to call home.
              </p>
              <Button variant="outline" asChild>
                <Link href="/about">Read Krisi&rsquo;s story</Link>
              </Button>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── 7. Why a contractor-Realtor — never cut ──────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="The difference"
            title="What a contractor's licence actually changes"
            lead="Any agent can tell you a kitchen is dated. Knowing what it costs to fix, and whether the wall behind it can move, is a different job."
          />

          <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
            {contractorValue.map(({ icon: Icon, title, body }) => (
              <li
                key={title}
                className="flex gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs lg:p-6"
              >
                <span
                  aria-hidden="true"
                  className="flex size-11 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
                >
                  <Icon className="size-6" />
                </span>
                <span className="flex flex-col gap-1.5">
                  <span className="text-h4 font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="text-sm text-foreground-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── 8. Lake Mary spotlight ───────────────────────────────────── */}
      {lakeMary ? (
        <Section tone="invert">
          <Container>
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="flex flex-col items-start gap-5 lg:col-span-6">
                <SectionHeader
                  invert
                  overline="Flagship city"
                  title="Lake Mary, in detail"
                  lead="The city I live in and know street by street — schools, commute, the communities worth your time, and what the market is doing right now."
                />
                {lakeMaryStats.length > 0 ? (
                  <StatTiles
                    stats={lakeMaryStats}
                    asOf={lakeMary.stats.asOf}
                    invert
                    columns={3}
                    className="w-full"
                  />
                ) : null}
                <Button variant="accent" asChild>
                  <Link href="/lake-mary">Explore Lake Mary</Link>
                </Button>
              </div>

              <div className="lg:col-span-6">
                <MediaFrame
                  photo={heroPhoto(lakeMary.heroKey, lakeMary.heroAlt, 1600, 1200)}
                  sizes="(max-width: 1023px) 100vw, 50vw"
                  aspect="4/3"
                />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ── 9. Guides teaser ─────────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <SectionHeader
              overline="Guides"
              title="Written to be useful before you call"
            />
            <Button variant="outline" asChild>
              <Link href="/guides">All guides</Link>
            </Button>
          </div>

          <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
            {guides.map(({ href, title, lead }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex h-full flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm transition-[transform,box-shadow] duration-(--dur-fast) ease-(--ease-out) hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <span className="text-h4 font-semibold text-foreground">
                    {title}
                  </span>
                  <span className="text-sm text-foreground-muted">{lead}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── 10. Reviews — hidden below three ─────────────────────────── */}
      {showReviews ? (
        <Section tone="sunken">
          <Container className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <SectionHeader overline="Reviews" title="What clients say" />
              <Button variant="outline" asChild>
                <Link href="/reviews">Read all reviews</Link>
              </Button>
            </div>

            <ul className="grid grid-cols-1 gap-5 md:grid-cols-3 lg:gap-6">
              {reviews.map((review) => (
                <li
                  key={review.id}
                  className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs"
                >
                  <Quote
                    aria-hidden="true"
                    className="size-6 text-accent-quiet"
                  />
                  {review.rating ? (
                    <span
                      className="flex gap-0.5"
                      aria-label={`${review.rating} out of 5`}
                    >
                      {Array.from({ length: review.rating }).map((_, i) => (
                        <Star
                          key={i}
                          aria-hidden="true"
                          className="size-4 fill-accent text-accent"
                        />
                      ))}
                    </span>
                  ) : null}
                  <blockquote className="text-sm text-foreground-muted">
                    {review.body}
                  </blockquote>
                  <span className="mt-auto text-sm font-semibold text-foreground">
                    {review.authorName}
                  </span>
                </li>
              ))}
            </ul>
          </Container>
        </Section>
      ) : null}

      {/* ── 11. Lead CTA band ────────────────────────────────────────── */}
      <Section tone="invert">
        <Container>
          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-4 lg:col-span-6">
              <SectionHeader
                invert
                overline="Stay ahead of the market"
                title="Get new listings before they are everywhere"
                lead="I will send you homes that match what you are looking for in Lake Mary and Central Florida — and nothing else."
              />
            </div>
            <div className="lg:col-span-6">
              <LeadForm
                leadType="general"
                submitLabel="Send me new listings"
                className="rounded-lg bg-surface p-5 shadow-lg lg:p-6"
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
