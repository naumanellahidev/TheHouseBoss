import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Compass,
  HardHat,
  Layers,
  Ruler,
  ShieldCheck,
} from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { PropertyImage } from "@/components/site/property-image";
import { RelatedLinks } from "@/components/site/related-links";
import { Reveal } from "@/components/site/reveal";
import { heroPhoto } from "@/components/site/media-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hero3D } from "@/components/three/hero-3d";
import {
  DEFAULT_CONTENT,
  SECTION_KEYS,
  type HireContractorContent,
} from "@/lib/content/hire-contractor";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { getAcceptedLinks } from "@/lib/queries/links";
import {
  disabledKeys,
  getPageSections,
  mergeSection,
} from "@/lib/queries/page-sections";
import { EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSeoOverride } from "@/lib/queries/seo";
import { getCities } from "@/lib/queries/cities";
import { getSiteSettings } from "@/lib/queries/settings";
import { breadcrumbJsonLd, faqJsonLd } from "@/lib/seo/jsonld";
import { contractorJsonLd } from "@/lib/seo/contractor-jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

/**
 * `/hire-contractor` — the contractor side of the business.
 *
 * ── What this replaced, and why none of it survived ───────────────────────
 *
 * `/new-construction-representation` was a buyer GUIDE: a prose column with a
 * sidebar table of contents, arguing that a buyer purchasing from a builder
 * should have their own agent. Good writing, and the wrong document entirely
 * for this route — it sold representation, and this page offers construction
 * work.
 *
 * So the article is gone rather than moved down the page. Its facts survive
 * where they are still true (pre-drywall is the moment that matters; Florida's
 * climate is hard on drainage, flashing and mechanicals), rewritten into the
 * sections that need them. The old URL 308s here, set in `next.config.ts`.
 *
 * ── Why it is composed of sections rather than written as a document ──────
 *
 * Every block below is addressable: `page_sections` can override any field of
 * any of them, and disable one entirely, without touching the rest. §36 forbids
 * a single `content` field and this is the consequence — the structure lives in
 * data, not only in markup.
 *
 * ── Claims ────────────────────────────────────────────────────────────────
 *
 * §4 and §44. No project counts, no awards, no builder partnerships, no
 * guarantees, no pricing. The licence number is stated because it is verifiable
 * against the DBPR; everything else describes how work is approached, which is
 * a statement about method rather than about results.
 */

export const revalidate = 3600;

const crumbs = [{ href: "/hire-contractor", label: "Hire Contractor" }];

export async function generateMetadata(): Promise<Metadata> {
  const override = await getSeoOverride("/hire-contractor");

  return buildMetadata({
    override,
    /*
      §32. Contractor intent, not "new-construction representation".
      Deliberately not the old title: someone searching for a remodeler in Lake
      Mary has no reason to click a page about buyer representation.
    */
    title: "Residential Contractor & Remodeling",
    description:
      "Residential remodeling, renovation and new construction in Lake Mary and Central Florida from a Certified Residential Building Contractor who is also a licensed Realtor. Discuss your project.",
    path: "/hire-contractor",
  });
}

export default async function HireContractorPage() {
  const [rows, settings, relatedLinks, cities] = await Promise.all([
    getPageSections("hire-contractor"),
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(hire)"),
    getAcceptedLinks({}).catch(() => []),
    getCities().catch(() => []),
  ]);

  const stored = new Map(rows.map((row) => [row.sectionKey, row.content]));
  const off = disabledKeys(rows, SECTION_KEYS);

  /*
    Every section merged individually, so an override of one field in one
    section cannot blank another. The shape is the contract in
    `lib/content/hire-contractor.ts`.
  */
  const c: HireContractorContent = {
    hero: mergeSection(DEFAULT_CONTENT.hero, stored.get("hero")),
    advantage: mergeSection(DEFAULT_CONTENT.advantage, stored.get("advantage")),
    credentials: mergeSection(DEFAULT_CONTENT.credentials, stored.get("credentials")),
    services: mergeSection(DEFAULT_CONTENT.services, stored.get("services")),
    remodeling: mergeSection(DEFAULT_CONTENT.remodeling, stored.get("remodeling")),
    newConstruction: mergeSection(
      DEFAULT_CONTENT.newConstruction,
      stored.get("new_construction"),
    ),
    process: mergeSection(DEFAULT_CONTENT.process, stored.get("process")),
    local: mergeSection(DEFAULT_CONTENT.local, stored.get("local")),
    lakeMary: mergeSection(DEFAULT_CONTENT.lakeMary, stored.get("lake_mary")),
    faq: mergeSection(DEFAULT_CONTENT.faq, stored.get("faq")),
    cta: mergeSection(DEFAULT_CONTENT.cta, stored.get("cta")),
  };

  const hero = heroPhoto(settings.heroKey, "");

  /*
    §26. The city pages that exist, so the service-area list links to real
    routes rather than naming places with nothing behind them. A city named in
    `local.areas` with no published page is rendered as text, not as a dead
    link — §87 applies here as much as to the engine's own proposals.
  */
  const cityHrefs = new Map(cities.map((city) => [city.name, `/${city.slug}`]));

  return (
    <>
      <JsonLd
        data={[
          contractorJsonLd({
            path: "/hire-contractor",
            services: c.services.items.map((item) => item.title),
            areas: c.local.areas,
          }),
          ...(c.faq.items.length > 0 && !off.has("faq")
            ? [faqJsonLd(c.faq.items)]
            : []),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      {/* ═══ HERO (§6, §7) ══════════════════════════════════════════════ */}
      <section
        data-hero-bleed=""
        className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert"
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(130%_100%_at_20%_0%,var(--color-royal-800),var(--color-royal-950))]"
        />
        {/*
          Blueprint rule, not the homepage's even grid.

          §40 asks the 3D and the geometry to communicate design and
          construction. A drafting grid — fine lines with a heavier one every
          fifth — reads as a plan rather than as a generic tech background, and
          it is two gradients rather than an image.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 [background-image:linear-gradient(var(--color-azure-400)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-400)_1px,transparent_1px)] [background-size:32px_32px] opacity-[0.06]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 [background-image:linear-gradient(var(--color-azure-400)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-400)_1px,transparent_1px)] [background-size:160px_160px] opacity-[0.09]"
        />

        <Hero3D />

        {hero ? (
          <div aria-hidden="true" className="absolute inset-0 -z-20">
            <PropertyImage
              photo={hero}
              size={1600}
              sizes={IMAGE_SIZES.fullBleed}
              priority
              aspect="none"
              wrapperClassName="h-full w-full"
              className="h-full w-full object-cover opacity-70 motion-safe:animate-[ken-burns_28s_var(--ease-in-out)_infinite_alternate]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(100deg,var(--color-royal-950)_28%,rgb(10_20_32/0.82)_62%,rgb(10_20_32/0.55)_100%)]" />
          </div>
        ) : null}

        <Container className="pt-8 pb-20 md:pt-10 md:pb-28 lg:pb-32">
          <Breadcrumbs items={crumbs} invert />

          <div className="mt-10 flex max-w-4xl flex-col items-start gap-7">
            <Badge tone="accent" className="bg-royal-800 text-azure-400">
              {c.hero.eyebrow}
            </Badge>

            <h1 className="text-display text-foreground-invert">
              {c.hero.headline}
            </h1>

            <p className="max-w-[56ch] text-lead text-foreground-invert-muted">
              {c.hero.description}
            </p>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button asChild size="lg" variant="accent">
                <Link href={c.hero.primaryCta.href}>{c.hero.primaryCta.label}</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-border-invert text-foreground-invert hover:bg-royal-800"
              >
                <a href={c.hero.secondaryCta.href}>{c.hero.secondaryCta.label}</a>
              </Button>
            </div>

            {/*
              The licence, in the hero, as one line rather than a card.

              §10 wants a dedicated trust section and there is one below. Here it
              is a single verifiable fact placed where somebody deciding whether
              to keep reading will see it.
            */}
            <p className="flex items-center gap-2.5 text-sm text-foreground-invert-muted">
              <HardHat className="size-4 shrink-0 text-azure-400" aria-hidden="true" />
              Certified Residential Building Contractor{" "}
              <span className="tabular font-semibold text-foreground-invert">
                {siteConfig.licenses.contractor.number}
              </span>
            </p>
          </div>
        </Container>
      </section>

      {/* ═══ THE CONTRACTOR DIFFERENCE (§9) ═════════════════════════════ */}
      {!off.has("advantage") ? (
        <Section>
          <Container>
            <Reveal>
              {/*
                Asymmetric, not a three-card grid — §9 rules that out
                explicitly. The heading takes five columns and the argument
                takes six, with the twelfth left empty: the whitespace is the
                composition.
              */}
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                    {c.advantage.eyebrow}
                  </p>
                  <h2 className="mt-3 text-h1 text-foreground">
                    {c.advantage.headline}
                  </h2>
                </div>

                <div className="flex flex-col gap-6 lg:col-span-6">
                  {c.advantage.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="max-w-[62ch] text-lead leading-relaxed text-foreground-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ═══ CREDENTIAL (§10) ═══════════════════════════════════════════ */}
      {!off.has("credentials") ? (
        <Section tone="sunken">
          <Container>
            <div className="flex flex-col items-start gap-6 rounded-(--radius-2xl) border border-border bg-surface p-8 md:flex-row md:items-center md:gap-10 md:p-10">
              <ShieldCheck
                className="size-10 shrink-0 text-accent-quiet"
                aria-hidden="true"
              />
              <div className="flex flex-col gap-2">
                <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                  {c.credentials.eyebrow}
                </p>
                <h2 className="text-h2 text-foreground">{c.credentials.headline}</h2>
                <p className="max-w-[62ch] text-body leading-relaxed text-foreground-muted">
                  {c.credentials.body}
                </p>
              </div>

              <dl className="flex shrink-0 flex-col gap-4 md:ml-auto">
                <div className="rounded-lg border border-border bg-surface-sunken p-4">
                  <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                    Contractor licence
                  </dt>
                  <dd className="tabular mt-1 text-h4 font-semibold text-foreground">
                    {siteConfig.licenses.contractor.number}
                  </dd>
                </div>
                <div className="rounded-lg border border-border bg-surface-sunken p-4">
                  <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                    Real estate licence
                  </dt>
                  <dd className="tabular mt-1 text-h4 font-semibold text-foreground">
                    {siteConfig.licenses.realEstate.number}
                  </dd>
                </div>
              </dl>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ═══ SERVICES (§11, §12) ════════════════════════════════════════ */}
      {!off.has("services") ? (
        <Section>
          <Container>
            <SectionHeader
              overline={c.services.eyebrow}
              title={c.services.headline}
              lead={c.services.lead}
            />

            {/*
              Editorial rows, not a card grid.

              §12 asks for rich sections instead of small cards. Each service is
              a full-width row: title and description on the left, the specifics
              as a list on the right, separated by a rule. It reads as a
              document about the work rather than as a product catalogue.
            */}
            <ul className="mt-12 flex flex-col">
              {c.services.items.map((service, index) => (
                <li
                  key={service.key}
                  className="grid gap-6 border-t border-border py-10 lg:grid-cols-12 lg:gap-12"
                >
                  <div className="flex items-start gap-4 lg:col-span-5">
                    <span
                      aria-hidden="true"
                      className="tabular mt-1 text-sm font-semibold text-accent-quiet"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-2">
                      <h3 className="text-h3 text-foreground">{service.title}</h3>
                      <p className="max-w-[46ch] text-body leading-relaxed text-foreground-muted">
                        {service.description}
                      </p>
                    </div>
                  </div>

                  <ul className="flex flex-col gap-3 lg:col-span-6 lg:col-start-7">
                    {service.points.map((point) => (
                      <li
                        key={point}
                        className="flex items-start gap-3 text-body text-foreground"
                      >
                        <ArrowRight
                          className="mt-1.5 size-4 shrink-0 text-accent-quiet"
                          aria-hidden="true"
                        />
                        {point}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <Button asChild size="lg">
                <Link href={c.remodeling.cta.href}>Talk about your project</Link>
              </Button>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ═══ REMODELING (§19) ═══════════════════════════════════════════ */}
      {!off.has("remodeling") ? (
        <Section tone="sunken">
          <Container>
            <Reveal>
              <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="flex flex-col gap-6 lg:col-span-7">
                  <Layers className="size-7 text-accent-quiet" aria-hidden="true" />
                  <h2 className="text-h1 text-foreground">{c.remodeling.headline}</h2>
                  {c.remodeling.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="max-w-[62ch] text-lead leading-relaxed text-foreground-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <div>
                    <Button asChild variant="outline" size="lg">
                      <Link href={c.remodeling.cta.href}>{c.remodeling.cta.label}</Link>
                    </Button>
                  </div>
                </div>

                {/*
                  A pull-quote panel rather than a stock photograph.

                  §39 rules out cheesy contractor imagery and there is no
                  photograph of this work to use — inventing one would mean
                  stock, which §39 also rules out. A typographic panel is honest
                  and holds the composition.
                */}
                <div className="lg:col-span-5">
                  <blockquote className="glass rounded-(--radius-2xl) border border-border p-8">
                    <p className="text-h3 leading-snug text-foreground">
                      The finishes are the easy part. They come last, and they
                      are the part that matters least to whether the room works.
                    </p>
                  </blockquote>
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ═══ ARCHITECTURAL BREAK (§13) ══════════════════════════════════ */}
      {/*
        A full-width band using the drafting grid rather than a photograph.

        §13 asks for a cinematic visual break and §39 forbids stock contractor
        imagery. With no project photography to show, a typographic and
        geometric moment is the honest version — and it does not claim to be a
        house that was built.
      */}
      <section className="relative isolate overflow-hidden bg-surface-invert py-20 text-foreground-invert md:py-28">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(100%_140%_at_50%_0%,var(--color-royal-800),var(--color-royal-950))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [background-image:linear-gradient(var(--color-azure-400)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-400)_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.08]"
        />
        <Container>
          <div className="flex max-w-3xl flex-col gap-5">
            <Ruler className="size-8 text-azure-400" aria-hidden="true" />
            <p className="text-h1 leading-tight text-foreground-invert">
              Vision. Plan. Build. Finished space.
            </p>
            <p className="max-w-[54ch] text-lead text-foreground-invert-muted">
              Most of what determines whether a project works is settled before
              anyone picks up a tool — in what the structure allows, in the
              order the work happens, and in the questions asked at the start.
            </p>
          </div>
        </Container>
      </section>

      {/* ═══ NEW CONSTRUCTION (§18) ═════════════════════════════════════ */}
      {!off.has("new_construction") ? (
        <Section>
          <Container>
            <Reveal>
              <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
                <div className="lg:col-span-5">
                  <Compass className="size-7 text-accent-quiet" aria-hidden="true" />
                  <h2 className="mt-4 text-h1 text-foreground">
                    {c.newConstruction.headline}
                  </h2>
                </div>
                <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
                  {c.newConstruction.body.map((paragraph, i) => (
                    <p
                      key={i}
                      className="max-w-[62ch] text-lead leading-relaxed text-foreground-muted"
                    >
                      {paragraph}
                    </p>
                  ))}
                  <div>
                    <Button asChild variant="outline" size="lg">
                      <Link href={c.newConstruction.cta.href}>
                        {c.newConstruction.cta.label}
                      </Link>
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ═══ PROCESS (§15) ══════════════════════════════════════════════ */}
      {!off.has("process") ? (
        <Section tone="sunken">
          <Container>
            <SectionHeader
              overline={c.process.eyebrow}
              title={c.process.headline}
              lead={c.process.lead}
            />

            {/*
              An editorial timeline, not a SaaS workflow — §15 rules that out.
              Big numerals, a rule between steps, no connector arrows and no
              circles-with-icons.
            */}
            <ol className="mt-12 grid gap-px overflow-hidden rounded-(--radius-2xl) border border-border bg-border md:grid-cols-2 lg:grid-cols-5">
              {c.process.steps.map((step) => (
                <li key={step.number} className="flex flex-col gap-3 bg-surface p-6">
                  <span
                    aria-hidden="true"
                    className="tabular font-display text-h2 text-accent-quiet"
                  >
                    {step.number}
                  </span>
                  <h3 className="text-h4 font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-foreground-muted">
                    {step.description}
                  </p>
                </li>
              ))}
            </ol>
          </Container>
        </Section>
      ) : null}

      {/* ═══ CENTRAL FLORIDA (§20) ══════════════════════════════════════ */}
      {!off.has("local") ? (
        <Section>
          <Container>
            <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
              <div className="flex flex-col gap-6 lg:col-span-7">
                <SectionHeader
                  overline={c.local.eyebrow}
                  title={c.local.headline}
                />
                {c.local.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="max-w-[62ch] text-lead leading-relaxed text-foreground-muted"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>

              <div className="lg:col-span-4 lg:col-start-9">
                <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                  Service areas
                </p>
                <ul className="mt-4 flex flex-col gap-2">
                  {c.local.areas.map((area) => {
                    const href = cityHrefs.get(area);
                    return (
                      <li key={area}>
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex min-h-11 items-center text-lead text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            {area}
                          </Link>
                        ) : (
                          /* No page for it, so no link. §87 applies here too. */
                          <span className="inline-flex min-h-11 items-center text-lead text-foreground-muted">
                            {area}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ═══ LAKE MARY (§21) ════════════════════════════════════════════ */}
      {!off.has("lake_mary") ? (
        <Section tone="sunken">
          <Container>
            <Reveal>
              <div className="flex max-w-[70ch] flex-col gap-6">
                <h2 className="text-h1 text-foreground">{c.lakeMary.headline}</h2>
                {c.lakeMary.body.map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-lead leading-relaxed text-foreground-muted"
                  >
                    {paragraph}
                  </p>
                ))}
                <div className="flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link href={c.lakeMary.cta.href}>{c.lakeMary.cta.label}</Link>
                  </Button>
                  <Button asChild size="lg" variant="ghost">
                    <Link href="/lake-mary">
                      About Lake Mary
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Reveal>
          </Container>
        </Section>
      ) : null}

      {/* ═══ FAQ (§29, §30) ═════════════════════════════════════════════ */}
      {!off.has("faq") && c.faq.items.length > 0 ? (
        <Section>
          <Container>
            <SectionHeader overline="Common questions" title={c.faq.headline} />
            {/*
              §30. The same array feeds `faqJsonLd` at the top of this file, so
              the markup cannot describe a question the page does not render.
            */}
            <div className="mt-8 max-w-[68ch]">
              <FaqAccordion items={c.faq.items} defaultOpenFirst />
            </div>

            <div className="mt-10 max-w-[68ch]">
              <Disclaimer type={["legal", "construction"]} />
            </div>
          </Container>
        </Section>
      ) : null}

      {/* ═══ FINAL CTA (§28) ════════════════════════════════════════════ */}
      {!off.has("cta") ? (
        <Section tone="invert">
          <Container>
            <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
              <div className="flex flex-col gap-6 lg:col-span-6">
                <h2 className="text-display text-foreground-invert">
                  {c.cta.headline}
                </h2>
                <p className="max-w-[48ch] text-lead text-foreground-invert-muted">
                  {c.cta.body}
                </p>

                <div className="flex flex-col gap-3 text-lead text-foreground-invert">
                  <a
                    href={siteConfig.contact.phoneHref}
                    className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {siteConfig.contact.phone}
                  </a>
                  <a
                    href={`mailto:${siteConfig.contact.email}`}
                    className="inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {siteConfig.contact.email}
                  </a>
                </div>

                {relatedLinks.length > 0 ? (
                  <RelatedLinks links={relatedLinks} heading="Related" />
                ) : null}
              </div>

              <div className="lg:col-span-6">
                <LeadForm
                  leadType="new_construction"
                  submitLabel={c.cta.primary.label}
                  className="rounded-lg bg-surface p-5 shadow-lg lg:p-6"
                />
              </div>
            </div>
          </Container>
        </Section>
      ) : null}
    </>
  );
}
