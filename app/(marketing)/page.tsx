import Link from "next/link";
import { Award, HardHat, MapPin, ShieldCheck } from "lucide-react";

import { Container, Section, SectionHeader } from "@/components/site/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { siteConfig } from "@/lib/site-config";

/**
 * PHASE 0: hero + trust strip only.
 *
 * These are sections 1 and 2 of the final home page spec
 * (docs/05-page-specs.md § Home), minus the search widget, which needs the
 * listing_facets view from Phase 1 and is built in Phase 3.
 *
 * Sections still to come: specialty cards, featured listings, city tiles,
 * Meet Krisi, contractor value props, Lake Mary spotlight, guides teaser,
 * reviews, lead CTA band.
 */

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

export default function HomePage() {
  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert">
        {/*
          Placeholder ground until the client's Lake Mary photography arrives.
          A layered navy gradient plus a faint architectural grid — deliberate,
          not a grey box. Swap for the hero photograph in Phase 3.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_15%_0%,var(--color-ink-800),var(--color-ink-950))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 [background-image:linear-gradient(var(--color-gold-500)_1px,transparent_1px),linear-gradient(90deg,var(--color-gold-500)_1px,transparent_1px)] [background-size:72px_72px] opacity-[0.07]"
        />

        <Container className="flex min-h-[78svh] flex-col justify-center py-16 md:py-24 lg:min-h-[min(84svh,760px)]">
          <div className="flex max-w-[46rem] flex-col items-start gap-6">
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

            <div className="flex w-full flex-col gap-3 pt-2 sm:w-auto sm:flex-row">
              <Button variant="accent" size="lg" asChild>
                <Link href="/search">Search homes</Link>
              </Button>
              <Button variant="invert" size="lg" asChild>
                <Link href="/contact">Talk to Krisi</Link>
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Trust strip ───────────────────────────────────────────────── */}
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

      {/* ── Placeholder for the sections built in later phases ────────── */}
      <Section>
        <Container className="flex flex-col gap-6">
          <SectionHeader
            overline="In progress"
            title="The rest of this page is built in Phase 3"
            lead="Specialty cards, featured listings, city tiles, Meet Krisi, the Lake Mary spotlight, guides and reviews all depend on the database and the admin dashboard. The design language above is what they will be built from."
          />
          <div>
            <Button variant="outline" asChild>
              <Link href="/dev/styleguide">View the design system</Link>
            </Button>
          </div>
        </Container>
      </Section>
    </>
  );
}
