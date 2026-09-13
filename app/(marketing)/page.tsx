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
import {
  MediaFrame,
  heroPhoto,
  portraitPhoto,
} from "@/components/site/media-frame";
import { ReviewForm } from "@/components/site/review-form";
import { Reveal } from "@/components/site/reveal";
import { PropertyImage } from "@/components/site/property-image";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { HomeSearch, HomeSearchResults } from "@/components/site/home-search";
import { SearchBar } from "@/components/site/search-bar";
import { Hero3D } from "@/components/three/hero-3d";
import { StatTiles } from "@/components/site/stat-tiles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCityBySlug,
  getHomeCities,
  getSearchCities,
} from "@/lib/queries/cities";
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
import { cn, formatPrice } from "@/lib/utils";

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

/**
 * The hero's right-hand column, mirroring the client's banner.
 *
 * Short forms of the four services named on /about — real estate
 * representation, construction consulting, residential remodeling and
 * new-construction guidance. The banner says "Investments" and "Turnkey
 * solutions"; those are not described anywhere on this site, and a hero is the
 * wrong place to introduce a service with no page behind it.
 */
const HERO_SERVICES = [
  "Real estate",
  "Construction",
  "Remodeling",
  "New construction",
] as const;

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
    href: "/hire-contractor",
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
    href: "/hire-contractor",
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
  const [
    cities,
    homeCities,
    facets,
    featured,
    published,
    lakeMary,
    reviews,
    settings,
  ] = await Promise.all([
    /*
        Two lists, because they answer different questions.

        `cities` fills the search dropdown — the cities that can be searched
        (`in_search`, the five in the brief). `homeCities` is what the tiles
        below show, which the admin now sets per city with a switch on the
        cities list. Before migration 025 both came from `in_search`, so
        featuring a city on the front page also forced it into the filter.
      */
    safeQuery(() => getSearchCities(), [], "getSearchCities(home)"),
    safeQuery(() => getHomeCities(), [], "getHomeCities(home)"),
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
    safeQuery(
      () => countPublishedListings(),
      0,
      "countPublishedListings(home)",
    ),
    safeQuery(() => getCityBySlug("lake-mary"), null, "getCityBySlug(home)"),
    safeQuery(() => getReviews(3), [], "getReviews(home)"),
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(home)"),
  ]);

  /** Spec: swap the primary CTA rather than advertise an empty search. */
  const inventoryIsThin = published < 5;

  /** Admin → Settings → Branding, migration 023. Null hides section 6's media. */
  const portrait = portraitPhoto(settings);

  /*
    The photograph beside the lead form.

    Lake Mary first — it is the flagship city and the one the copy names — then
    any city that has a hero, then the site-wide hero. All three are already
    uploaded through the admin, so this adds no asset and nothing to maintain.
    If none exists the block is simply not rendered.
  */
  const leadPhotoCity = lakeMary?.heroKey
    ? lakeMary
    : (cities.find((city) => city.heroKey) ?? null);

  const leadPhoto =
    heroPhoto(leadPhotoCity?.heroKey, leadPhotoCity?.heroAlt, 1600, 1200) ??
    heroPhoto(settings.heroKey, "Central Florida homes", 1600, 1200);

  /*
    The hero photograph, from Admin → Settings → Branding.

    3:2 is only the intrinsic ratio the <img> declares; the element is sized by
    CSS and cropped with object-cover, so a portrait upload still fills the
    band — it is simply cropped harder.
  */
  const heroBackground = heroPhoto(settings.heroKey, "", 1600, 1067);

  const leadPhotoCaption = leadPhotoCity
    ? `${leadPhotoCity.name}, ${leadPhotoCity.county} County`
    : "Lake Mary and Central Florida";
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
      {/*
        Hero and results, inside one client island.

        The island is a wrapper that listens for the hero form's submit and
        answers it in place — see components/site/home-search.tsx. Everything
        inside it stays server-rendered; passing server components as children
        through a client component is what keeps the form's database-driven
        options out of the browser bundle.
      */}
      <HomeSearch>
        {/* ── 1. Hero + search ─────────────────────────────────────────── */}
        {/*
        A photograph, full bleed, with the words on top of it.

        This was a navy panel with a 4:5 photo beside it. The client asked for
        the treatment their own banner uses: one large photograph edge to edge,
        the copy over it, the services listed opposite. The badge, the buttons
        and the search card are unchanged — a change of composition, not of
        content.

        The picture comes from Admin → Settings → Branding, so it can be
        swapped without a deploy.
      */}
        <section
          data-hero-bleed=""
          className="relative isolate flex min-h-[min(84svh,640px)] items-center overflow-hidden bg-surface-invert text-foreground-invert lg:min-h-[min(88svh,780px)]"
        >
          {heroBackground ? (
            <>
              <div aria-hidden="true" className="absolute inset-0 -z-20">
                <PropertyImage
                  photo={heroBackground}
                  size={1600}
                  sizes={IMAGE_SIZES.fullBleed}
                  priority
                  aspect="none"
                  wrapperClassName="h-full w-full"
                  className="h-full w-full object-cover object-center motion-safe:animate-[ken-burns_28s_var(--ease-in-out)_infinite_alternate]"
                />
              </div>

              {/*
              The overlay, in two parts, and the reason the words stay readable
              over whatever photograph is uploaded next.

              Phone: a vertical wash, heaviest at the bottom where the search
              card sits. The copy runs the full width, so there is no side to
              keep clear.

              From 1024px: a diagonal wash, nearly solid behind the headline and
              thinning to almost nothing on the right, so the house is still the
              picture rather than something behind a grey sheet.

              The stops are not eyeballed: `npm run check:hero-contrast`
              (tests/hero-contrast.spec.ts) hides each piece of hero text,
              screenshots the pixels behind it at five widths and fails below
              WCAG AA. Run it after changing the photograph.
            */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(7_16_35/0.76)_0%,rgb(7_16_35/0.80)_42%,rgb(7_16_35/0.92)_100%)] lg:bg-[linear-gradient(100deg,rgb(7_16_35/0.94)_0%,rgb(7_16_35/0.88)_36%,rgb(7_16_35/0.58)_64%,rgb(7_16_35/0.30)_100%)]"
              />
              {/* Keeps the transparent header legible over a bright sky. */}
              <div
                aria-hidden="true"
                className="absolute inset-x-0 top-0 -z-10 h-40 bg-[linear-gradient(180deg,rgb(7_16_35/0.70),transparent)]"
              />
            </>
          ) : (
            <>
              {/*
              No photograph uploaded: the navy composition and the 3D scene are
              the design in that case, not a grey box waiting for an image. They
              are not drawn over a photograph — a WebGL scene on top of a hero
              picture is two focal points arguing.
            */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-royal-800),var(--color-royal-950))]"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-20 [background-image:linear-gradient(var(--color-azure-600)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-600)_1px,transparent_1px)] [background-size:72px_72px] opacity-[0.07]"
              />
              <Hero3D />
            </>
          )}

          <Container className="w-full pt-6 pb-12 md:pt-8 md:pb-16 lg:pt-0 xl:pb-16">
            <div className="grid items-center gap-8 lg:grid-cols-12 lg:items-start lg:gap-12">
              <div className="flex flex-col items-start gap-6 lg:col-span-7 lg:gap-5">
                <Badge
                  tone="accent"
                  className="bg-royal-900/70 text-azure-400 backdrop-blur-sm"
                >
                  Lake Mary · Seminole &amp; Orange County
                </Badge>

                <h1 className="text-display text-foreground-invert [text-shadow:0_2px_24px_rgb(7_16_35/0.5)]">
                  Find your home in{" "}
                  <span className="relative whitespace-nowrap">
                    Lake Mary
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-1 h-1 bg-accent md:-bottom-2 md:h-1.5"
                    />
                  </span>
                </h1>

                <p className="max-w-[52ch] text-lead text-foreground-invert">
                  {siteConfig.positioning}
                </p>

                {/*
                Hidden on a phone, for two measured reasons.

                It is seven lines there, which pushed the buttons and the search
                card — the thing the client asked the page to lead with — off the
                first screen entirely. And it is the one piece of hero text that
                did not clear WCAG AA over the photograph at 360/414px: muted ink
                at 16px measured 4.43:1 against the brightest part of the picture
                behind it (`npm run check:hero-contrast`). From 768px there is
                room for it; once the search card moved into the hero's right
                column the copy sat higher, over the thinner middle of the
                wash, and measured 4.41:1 at 768px — so that middle stop was
                deepened from 0.68 to 0.80 and it clears AA again.

                Nothing is lost: the same introduction is the opening of the
                "Meet The House Boss" section further down the page.
              */}
                <p className="hidden max-w-[56ch] text-body text-foreground-invert-muted md:block">
                  I&rsquo;m {siteConfig.knownAs} — a licensed Realtor{" "}
                  <em className="text-azure-400 not-italic">and</em> a Certified
                  Residential Building Contractor. I read a property the way a
                  builder does, so you can look past the finishes and make a
                  decision you will still be happy with in five years.
                </p>

                {inventoryIsThin ? (
                  <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <Button variant="accent" size="lg" asChild>
                      <Link href="/contact">Get new listing alerts</Link>
                    </Button>
                    <Button variant="invert" size="lg" asChild>
                      <Link href="/search">Browse what is available</Link>
                    </Button>
                    {/*
                    Third, and deliberately the quietest of the three. It is not
                    what most visitors came for, and a hero with three equally
                    weighted CTAs has none.
                  */}
                    <ReviewForm
                      variant="ghost"
                      size="lg"
                      className="text-foreground-invert hover:bg-royal-900/70 hover:text-foreground-invert"
                    />
                  </div>
                ) : (
                  <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <Button variant="accent" size="lg" asChild>
                      <Link href="/search">Search homes</Link>
                    </Button>
                    <Button variant="invert" size="lg" asChild>
                      <Link href="/contact">Talk to Krisi</Link>
                    </Button>
                    <ReviewForm
                      variant="ghost"
                      size="lg"
                      className="text-foreground-invert hover:bg-royal-900/70 hover:text-foreground-invert"
                    />
                  </div>
                )}

                {/*
                The services, as one line under the buttons.

                They were stacked in the bottom-right corner, mirroring the
                client's banner — which is exactly where the fixed WhatsApp
                button sits, so the last two were behind it. On this side they
                are always legible, and they close the copy column rather than
                leaving it to end on a row of buttons.
              */}
                <ul className="hidden flex-wrap items-center gap-x-3 gap-y-1 pt-2 md:flex">
                  {HERO_SERVICES.map((service, index) => (
                    <li
                      key={service}
                      className="flex items-center gap-3 text-overline font-semibold tracking-[0.16em] text-foreground-invert uppercase"
                    >
                      {index > 0 ? (
                        <span
                          aria-hidden="true"
                          className="h-3 w-px bg-accent/70"
                        />
                      ) : null}
                      {service}
                    </li>
                  ))}
                </ul>
              </div>

              {/*
              The services, opposite the copy — the right-hand column of the
              client's own banner, and what balances a composition whose weight
              is otherwise all on the left.

              Desktop only: on a phone it would push the search card, which the
              client asked to lead with, off the first screen. The wording is
              the four services named on /about rather than the banner's, so the
              site does not advertise something it describes nowhere.
            */}
              {/*
              The search, inside the hero rather than beneath it.

              It was a full-width band under the copy, which left a large empty
              area of photograph to its right and pushed everything else down.
              In the hero's own second column it fills that space, and the glass
              treatment lets the photograph read through it instead of covering
              it with a white slab.
            */}
              {/*
                `data-hero-aside` lifts the card to just under the header on
                desktop (app/globals.css). The section's top padding exists to
                clear the large logo, which sits over the LEFT column only —
                without the lift the card sat ~150px below the nav for nothing.
              */}
              <div data-hero-aside="" className="lg:col-span-5">
                {/*
                Held to 26rem and pushed right. At 5/12 of a 1440 viewport the
                panel is ~640px wide, which stretches three stacked selects into
                a shape that reads as a form rather than as a card.
              */}
                <SearchBar
                  cities={cities}
                  facets={facets}
                  variant="hero"
                  className="lg:ml-auto lg:max-w-[26rem]"
                />
              </div>
            </div>
          </Container>
        </section>

        {/*
        The answer, immediately under the question. Renders nothing at all
        until a search has been run.
      */}
        <HomeSearchResults />
      </HomeSearch>

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
        <Container>
          <Reveal className="flex flex-col gap-8">
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
                    <span className="text-sm text-foreground-muted">
                      {hook}
                    </span>
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
          </Reveal>
        </Container>
      </Section>

      {/* ── 4. Featured listings — hidden below three ────────────────── */}
      {showFeatured ? (
        <Section tone="sunken">
          <Container>
            <Reveal className="flex flex-col gap-8">
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
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ── 5. Search by city ────────────────────────────────────────── */}
      {homeCities.length > 0 ? (
        <Section>
          <Container>
            <Reveal className="flex flex-col gap-8">
              <SectionHeader
                overline="Search by city"
                title="Where I work"
                lead="Seminole and Orange County. Each city has its own guide — schools, commute, what the market is actually doing — not just a list of homes."
              />
              <CityTiles cities={homeCities} facets={facets} />
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ── 6. Meet The House Boss ───────────────────────────────────── */}
      <Section tone="sunken">
        <Container>
          <div className="grid items-center gap-8 lg:grid-cols-12 lg:gap-12">
            {/*
              The portrait is uploaded in Admin → Settings → Branding
              (migration 023). With none uploaded the media column is dropped
              entirely and the copy runs full width, rather than leaving a grey
              4:5 rectangle where a person should be — which is what
              `photo={null}` produced here for the whole of Phase 5.
            */}
            {portrait ? (
              <div className="relative lg:col-span-5">
                <MediaFrame
                  photo={portrait}
                  size={1600}
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
            ) : null}

            <div
              className={cn(
                "flex flex-col items-start gap-5",
                portrait ? "lg:col-span-7" : "lg:col-span-12",
              )}
            >
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
        <Container>
          <Reveal className="flex flex-col gap-8">
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
                    <span className="text-sm text-foreground-muted">
                      {body}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
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
                  photo={heroPhoto(
                    lakeMary.heroKey,
                    lakeMary.heroAlt,
                    1600,
                    1200,
                  )}
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
        <Container>
          <Reveal className="flex flex-col gap-8">
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
                    <span className="text-sm text-foreground-muted">
                      {lead}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Reveal>
        </Container>
      </Section>

      {/* ── 10. Reviews — hidden below three ─────────────────────────── */}
      {showReviews ? (
        <Section tone="sunken">
          <Container>
            <Reveal className="flex flex-col gap-8">
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
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ── 11. Lead CTA band ────────────────────────────────────────── */}
      <Section tone="invert">
        <Container>
          <div className="grid items-start gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-8 lg:col-span-6">
              <SectionHeader
                invert
                overline="Stay ahead of the market"
                title="Get new listings before they are everywhere"
                lead="I will send you homes that match what you are looking for in Lake Mary and Central Florida — and nothing else."
              />

              {/*
                The photograph that fills the column beside the form.

                Not decoration for its own sake: the column was empty below the
                heading, so on a wide screen the form floated alone against a
                large field of navy. It uses the flagship city's own hero, which
                is already uploaded and already on the page's city tiles — so it
                is a real photograph of the place the copy names, not a stock
                image standing in for one.

                Hidden below `lg`. On a phone the form is the only thing that
                matters here, and an image above it would push the first field
                below the fold.
              */}
              {leadPhoto ? (
                <MediaFrame
                  photo={leadPhoto}
                  size={800}
                  sizes="(max-width: 1023px) 0px, 45vw"
                  aspect="4/3"
                  scrim
                  className="hidden lg:block"
                >
                  <p className="absolute inset-x-0 bottom-0 p-5 text-sm font-medium text-foreground-invert">
                    {leadPhotoCaption}
                  </p>
                </MediaFrame>
              ) : null}
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

      {/* ── 12. Closing CTA band ─────────────────────────────────────── */}
      {/*
        A light band between the navy lead section and the navy footer.

        Two reasons it earns its place. Visually, the page ended on dark and ran
        straight into a dark footer, so the lead form and the footer read as one
        undifferentiated block. Practically, it is the last thing a reader sees
        who did not fill in the form — and the two things worth offering them
        are the inventory and a conversation.

        The primary action follows the same rule as the hero: when there are
        fewer than five published listings, sending someone to a near-empty
        search is worse than sending them to a person.
      */}
      <Section>
        <Container>
          <div className="flex flex-col items-center gap-6 text-center">
            <SectionHeader
              align="center"
              overline="Where to next"
              title={
                inventoryIsThin
                  ? "Tell me what you are looking for"
                  : "Start with the homes, or start with a conversation"
              }
              lead={
                inventoryIsThin
                  ? "New listings are added as they come to market. In the meantime, the fastest route to the right home is a short conversation about what you need."
                  : "Browse everything currently for sale, or ask the questions a listing page cannot answer — about the construction, the neighbourhood, or the loan."
              }
            />

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              {inventoryIsThin ? (
                <>
                  <Button asChild size="lg">
                    <Link href="/contact">Talk to Krisi</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/guides">Read the buyer guides</Link>
                  </Button>
                </>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/search">Browse every home for sale</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/contact">Talk to Krisi</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
