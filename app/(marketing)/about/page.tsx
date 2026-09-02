import type { Metadata } from "next";
import Link from "next/link";
import { Award, HardHat, MapPin, ShieldCheck } from "lucide-react";

import { Container, Section, SectionHeader } from "@/components/site/container";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { PageHero } from "@/components/site/page-hero";
import { Prose } from "@/components/site/prose";
import { PropertyImage, IMAGE_SIZES } from "@/components/site/property-image";
import { Button } from "@/components/ui/button";
import { breadcrumbJsonLd, personJsonLd } from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { allCities, isPending, siteConfig } from "@/lib/site-config";

/**
 * The entity page. Everything else on the site corroborates it, and this is
 * where the fullest `Person` JSON-LD lives — including both `hasCredential`
 * entries, which are the highest-value markup on the site.
 *
 * Content is the client's own bio, restructured into the sections in
 * docs/14-content-plan.md § 3 rather than run as nine undifferentiated
 * paragraphs. Her wording is preserved; only the ordering and headings are ours.
 */

const crumbs = [{ href: "/about", label: "About Krisi Kakarova" }];

export const metadata: Metadata = buildMetadata({
  title: "About Krisi Kakarova",
  description:
    "Krisi Kakarova is a licensed Realtor and Certified Residential Building Contractor with 13 years of experience serving buyers, sellers and homeowners across Central Florida.",
  path: "/about",
  type: "profile",
});

const credentials = [
  {
    icon: ShieldCheck,
    label: siteConfig.licenses.realEstate.label,
    value: siteConfig.licenses.realEstate.number,
    detail: siteConfig.licenses.realEstate.authority,
  },
  {
    icon: HardHat,
    label: siteConfig.licenses.contractor.label,
    value: siteConfig.licenses.contractor.number,
    detail: siteConfig.licenses.contractor.authority,
  },
  {
    icon: Award,
    label: "Experience",
    value: `${siteConfig.yearsExperience} years`,
    detail: "Serving Central Florida buyers, sellers and homeowners",
  },
  {
    icon: MapPin,
    label: "Brokerage",
    value: siteConfig.brokerage,
    detail: "Lake Mary, Seminole County, Florida",
  },
];

const services = [
  {
    title: "Real estate representation",
    body: "Buyer and seller representation across Seminole and Orange counties, with a focus on Lake Mary.",
  },
  {
    title: "Construction consulting",
    body: "A licensed contractor's read on condition, repair exposure and what a renovation will actually involve — before you commit.",
  },
  {
    title: "Residential remodeling",
    body: "Guidance on scope, sequencing and which work returns money, whether you are preparing to sell or planning to stay.",
  },
  {
    title: "New-construction guidance",
    body: "Independent representation at the builder's sales office, contract review, and walkthroughs at pre-drywall and final.",
  },
];

export default function AboutPage() {
  const hasPortrait = false; // Phase 5 content: client headshot still outstanding

  return (
    <>
      <JsonLd data={[personJsonLd(), breadcrumbJsonLd(crumbs)]} />

      <PageHero
        overline="Meet The House Boss"
        title="Krisi Kakarova"
        lead={siteConfig.positioning}
        crumbs={crumbs}
        size="md"
      />

      <Section>
        <Container className="grid gap-10 lg:grid-cols-12 lg:gap-12">
          {/* ── Portrait + credentials ─────────────────────────────────── */}
          <div className="lg:col-span-5">
            <div className="flex flex-col gap-6 lg:sticky lg:top-[calc(var(--header-h-lg)+1.5rem)]">
              <PropertyImage
                photo={
                  hasPortrait
                    ? {
                        kind: "stored",
                        key: "site/krisi-portrait",
                        w: 800,
                        h: 1000,
                        alt: `${siteConfig.legalName}, Realtor and Certified Residential Building Contractor`,
                      }
                    : null
                }
                sizes={IMAGE_SIZES.portrait}
                aspect="4/5"
                wrapperClassName="rounded-lg border border-border"
              />

              <dl className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm">
                {/* A <div> inside a <dl> may contain ONLY a dt/dd group —
                    no wrapper spans, no extra divs. The icon therefore lives
                    inside the <dt>, and the indent comes from padding. */}
                {credentials.map(({ icon: Icon, label, value, detail }) => (
                  <div key={label}>
                    <dt className="flex items-center gap-3 text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
                      <span
                        aria-hidden="true"
                        className="flex size-9 shrink-0 items-center justify-center rounded-md bg-accent-wash text-accent-quiet"
                      >
                        <Icon className="size-4" />
                      </span>
                      {label}
                    </dt>
                    <dd className="pl-12 text-sm font-semibold text-foreground tabular">
                      {value}
                    </dd>
                    <dd className="pl-12 text-xs text-foreground-subtle">
                      {detail}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          {/* ── Bio ────────────────────────────────────────────────────── */}
          <div className="lg:col-span-7">
            <Prose>
              <h2 id="meet">Meet The House Boss</h2>
              <p>
                I&rsquo;m Krisi Kakarova, a licensed Realtor and Certified
                Residential Building Contractor with{" "}
                {siteConfig.yearsExperience} years of experience serving buyers,
                sellers and homeowners throughout Central Florida.
              </p>

              <h2 id="more-than-a-realtor">More than a Realtor</h2>
              <p>
                I do more than help clients buy and sell homes. My residential
                construction experience gives me a deeper understanding of a
                property&rsquo;s condition, potential repair needs, remodeling
                possibilities and long-term potential. I help my clients look
                beyond appearances so they can make informed, confident
                decisions.
              </p>
              <p>
                In practice that means I am reading a house the way a builder
                does while we walk it — the age and condition of the roof, how
                the water is being moved away from the foundation, what the
                electrical panel tells you about the last renovation, whether a
                wall someone wants removed is carrying load. Those are the
                things that decide whether a home is a good buy or an expensive
                one, and they are rarely visible in the photographs.
              </p>

              <h2 id="why-lake-mary">Why Lake Mary</h2>
              <p>
                I specialize in Lake Mary&mdash;the city I am proud to call
                home. Because I live and work here, I offer firsthand knowledge
                of the community, its neighborhoods and its real estate market.
                I genuinely believe Lake Mary is one of the best places to live
                in Central Florida, and I enjoy helping others discover
                everything this exceptional community has to offer.
              </p>

              <h2 id="how-i-work">How I work</h2>
              <p>
                Whether you are purchasing an existing home, preparing a
                property for sale, planning a renovation or building from the
                ground up, I can help you understand your options and navigate
                the entire process.
              </p>
              <p>
                My business is built on strong professional relationships,
                organization and dependable communication. Over the years, I
                have developed a trusted network of real estate and construction
                professionals who can help support each stage of a transaction
                or project. I coordinate the details, communicate clearly and
                work diligently to keep the process moving forward.
              </p>

              <h2 id="what-to-expect">What you can expect</h2>
              <p>
                I believe every successful relationship begins with trust. My
                clients can expect honest guidance, careful attention to detail
                and a commitment to protecting their interests. I take the time
                to understand each client&rsquo;s goals and provide personalized
                service&mdash;not a one-size-fits-all approach.
              </p>
              <p>
                When you work with The House Boss, you gain more than a Realtor.
                You gain a knowledgeable real estate and construction resource
                who understands the transaction, the property and the work
                required to turn your vision into reality.
              </p>
              <p>
                Whether you are buying, selling, remodeling or building,
                I&rsquo;m here to help you move forward with confidence.
              </p>
            </Prose>
          </div>
        </Container>
      </Section>

      {/* ── Services ─────────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="Services"
            title="Four things I do"
            lead="Most agents offer the first one. The construction licence is what makes the other three possible."
          />
          <ul className="grid gap-5 md:grid-cols-2">
            {services.map((s) => (
              <li
                key={s.title}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6"
              >
                <h3 className="text-h4">{s.title}</h3>
                <p className="text-sm text-foreground-muted">{s.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* ── Service area ─────────────────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-6">
          <SectionHeader
            overline="Service area"
            title="Seminole and Orange counties"
            lead="Lake Mary is home and the market I know best. These are the others I work in regularly."
          />
          <ul className="flex flex-wrap gap-2">
            {allCities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/${c.slug}`}
                  className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-(--dur-fast) hover:border-border-strong hover:bg-surface-sunken"
                >
                  {c.name}
                  <span className="ml-2 text-xs text-foreground-subtle">
                    {c.county}
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="pt-2">
            <Button variant="outline" asChild>
              <Link href="/search">Search homes across Central Florida</Link>
            </Button>
          </div>
        </Container>
      </Section>

      {/* ── Contact ──────────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <Container className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeader
              overline="Get in touch"
              title="Tell me what you're trying to do"
              lead="Buying, selling, remodeling or building — start with the goal and we will work backwards from there."
            />
            {!isPending(siteConfig.contact.phone) ? (
              <p className="mt-6 text-sm text-foreground-muted">
                Prefer to talk?{" "}
                <a
                  href={siteConfig.contact.phoneHref}
                  className="text-accent-quiet underline underline-offset-4"
                >
                  {siteConfig.contact.phone}
                </a>
              </p>
            ) : null}
          </div>
          <div className="lg:col-span-7">
            <LeadForm compact />
          </div>
        </Container>
      </Section>
    </>
  );
}
