import type { Metadata } from "next";
import Link from "next/link";
import { HardHat, ScrollText, ShieldCheck } from "lucide-react";

import { ListingGrid } from "@/components/listing/listing-grid";
import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { Disclaimer } from "@/components/site/disclaimer";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { JsonLd } from "@/components/site/json-ld";
import { LeadForm } from "@/components/site/lead-form";
import { AnswerFirst, Callout, Prose } from "@/components/site/prose";
import { PropertyImage } from "@/components/site/property-image";
import { RelatedLinks } from "@/components/site/related-links";
import { Reveal } from "@/components/site/reveal";
import { heroPhoto } from "@/components/site/media-frame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Hero3D } from "@/components/three/hero-3d";
import { IMAGE_SIZES } from "@/lib/image-sizes";
import { getAcceptedLinks } from "@/lib/queries/links";
import { searchListings } from "@/lib/queries/listings";
import { EMPTY_RESULT, EMPTY_SETTINGS, safeQuery } from "@/lib/queries/safe";
import { getSeoOverride } from "@/lib/queries/seo";
import { getSiteSettings } from "@/lib/queries/settings";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";
import type { FaqItem } from "@/types/domain";

/**
 * `/new-construction-representation` — rebuilt per brief §40–§46 and §109.
 *
 * ── Why this is not the guide layout any more ─────────────────────────────
 *
 * It was a `GuideLayout`: a prose column with a sidebar table of contents,
 * identical in shape to the four buyer guides. That was the right call when it
 * was one guide among several, and §40 is explicit that it no longer is — this
 * page carries the single strongest differentiator on the site, and a page that
 * looks like every other page cannot say so.
 *
 * ── The positioning, and its limits ───────────────────────────────────────
 *
 * §41 asks this page to lead with the Realtor + Certified Residential Building
 * Contractor combination. §44 immediately constrains how: state the licence, do
 * not inflate it. So the hero says she can read a build, the advantage section
 * names both licence numbers, and nowhere does this page claim she inspects the
 * house, guarantees the work, or has a relationship with any builder. §110 asks
 * for "construction-aware guidance", and that is the register used throughout.
 *
 * ── What was preserved ────────────────────────────────────────────────────
 *
 * Every word of the guide body and every FAQ answer, verbatim. The writing was
 * accurate and compliance-conscious; §40 asks for the page to be rebuilt, not
 * for correct content to be thrown away and rewritten worse.
 */

export const revalidate = 3600;

const crumbs = [
  { href: "/guides", label: "Guides" },
  { href: "/new-construction-representation", label: "New-Construction Representation" },
];

const faq: FaqItem[] = [
  {
    q: "Does using my own agent cost me anything on a new build?",
    a: "In the normal case, no. Builders typically budget for a buyer's agent commission and pay it out of the same funds either way. If you walk in unrepresented, that budget does not become a discount for you — it simply stays with the builder.",
  },
  {
    q: "Why do I have to register my agent on the first visit?",
    a: "Because most builders' registration policies say the first visit is what counts. Walk into the sales office alone, give them your details, and many builders will refuse to recognise an agent afterwards — for that community, permanently. It is the single most expensive five minutes in new construction.",
  },
  {
    q: "The sales agent was really helpful. Do I still need someone?",
    a: "They probably were helpful, and they still work for the builder. They are paid by the builder, their duty runs to the builder, and anything you tell them about your budget or your timeline is information the builder now has. That is not a criticism of them; it is simply who they represent.",
  },
  {
    q: "Can I negotiate on a new build?",
    a: "Rarely on the base price, because a builder will not undercut the comparable sales in their own community. Often on incentives — closing costs, rate buydowns, upgrades. Knowing which lever a particular builder actually pulls is most of the value of having someone who has done it with them before.",
  },
  {
    q: "Which upgrades are worth paying for?",
    a: "Broadly, the ones that are hard to change later: structural changes, electrical and plumbing rough-ins, and anything behind a wall. Finishes are usually cheaper to do afterwards than through the design centre. As a contractor I can tell you what a given upgrade would actually cost to add later, which is the comparison that matters.",
  },
  {
    q: "Do I still need a home inspection on a brand-new house?",
    a: "Yes, and preferably more than one. New does not mean flawless — it means nobody has lived there long enough to find the problems. A pre-drywall inspection and a final inspection catch things that are cheap to fix now and expensive to fix after closing.",
  },
  {
    q: "What is the one-year walkthrough?",
    a: "Most builders warrant certain items for the first year and expect you to submit a list before it expires. Almost everyone forgets, or submits it late, or does not know what to look for. Diarise it the day you close.",
  },
  {
    q: "Can you inspect the house yourself?",
    a: "I can walk it with you and tell you what I see as a licensed residential contractor, which is more than most buyer's agents can offer. It does not replace a licensed home inspection or an engineer's report, and I will say so rather than let you skip one.",
  },
];

export async function generateMetadata(): Promise<Metadata> {
  const override = await getSeoOverride("/new-construction-representation");

  return buildMetadata({
    override,
    title: "New-Construction Representation",
    description:
      "Independent buyer representation on a new build in Central Florida, from a Realtor who is also a Certified Residential Building Contractor. Register before your first visit.",
    path: "/new-construction-representation",
  });
}

export default async function NewConstructionPage() {
  const [result, settings, relatedLinks] = await Promise.all([
    safeQuery(
      () => searchListings({ type: ["new_construction"], sort: "newest", page: 1 }),
      EMPTY_RESULT,
      "searchListings(newConstruction)",
    ),
    safeQuery(() => getSiteSettings(), EMPTY_SETTINGS, "getSiteSettings(nc)"),
    /*
      §46 wants this page connected to the listings and communities it relates
      to. These are links an operator accepted in Admin → SEO; a static page has
      no record id, so it is keyed on the path.
    */
    getAcceptedLinks({ articleId: undefined }).catch(() => []),
  ]);

  const hero = heroPhoto(settings.heroKey, "");

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: "New-construction buyer representation in Central Florida",
            description:
              "Registration rules, builder contracts, upgrades that hold value, and construction-phase walkthroughs by a licensed residential contractor.",
            path: "/new-construction-representation",
            section: "New construction",
            wordCount: 2100,
          }),
          serviceJsonLd({
            name: "New construction buyer representation",
            description:
              "Independent buyer representation for new-construction purchases in Central Florida, including construction-phase walkthroughs performed by a Certified Residential Building Contractor.",
            path: "/new-construction-representation",
            serviceType: "New construction buyer representation",
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      {/* ── 1. Hero (§42) ────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden bg-surface-invert text-foreground-invert">
        {/*
          The same layered composition as the homepage, deliberately: this is a
          second front door, not a different site. Base gradient, then the grid,
          then the desktop-only 3D, then the photograph and its scrim. Every
          layer is optional and the section reads as designed without any of
          them.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 bg-[radial-gradient(120%_90%_at_80%_0%,var(--color-royal-800),var(--color-royal-950))]"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-20 [background-image:linear-gradient(var(--color-azure-600)_1px,transparent_1px),linear-gradient(90deg,var(--color-azure-600)_1px,transparent_1px)] [background-size:72px_72px] opacity-[0.07]"
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
              className="h-full w-full object-cover motion-safe:animate-[ken-burns_24s_var(--ease-in-out)_infinite_alternate]"
            />
            {/* Scrim. docs/03 forbids text over a photograph without one. */}
            <div className="absolute inset-0 bg-[linear-gradient(75deg,var(--color-royal-950)_22%,rgb(10_20_32/0.8)_58%,rgb(10_20_32/0.5)_100%)]" />
          </div>
        ) : null}

        <Container className="pt-8 pb-16 md:pt-10 md:pb-24">
          <Breadcrumbs items={crumbs} invert />

          <div className="mt-8 grid items-end gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col items-start gap-6 lg:col-span-8">
              <Badge tone="accent" className="bg-royal-800 text-azure-400">
                Buyer representation on a new build
              </Badge>

              {/*
                §42 proposes this line and it is used close to verbatim, because
                it happens to be accurate: what is on offer is a second licence,
                not more enthusiasm.
              */}
              <h1 className="text-display text-foreground-invert">
                New construction, with a deeper level of expertise
              </h1>

              <p className="max-w-[52ch] text-lead text-foreground-invert-muted">
                The agent in the sales office works for the builder. When
                somebody in the room works for you — and can read the build while
                it is still open — the whole process changes.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row">
                {/*
                  `accent`, not the default `primary`.

                  The primary variant is royal navy, which is the right button
                  on a white page and effectively invisible on this one — it was
                  navy on navy in the first render. The inverted hero needs the
                  azure fill, which is what the homepage hero uses for the same
                  reason.
                */}
                <Button asChild size="lg" variant="accent">
                  <Link href="/contact?interest=new_construction">
                    Register me before your first visit
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-border-invert text-foreground-invert hover:bg-royal-800"
                >
                  <Link href="#what-changes">What representation changes</Link>
                </Button>
              </div>
            </div>

            {/*
              Both licence numbers, in the hero.

              §41 asks the positioning to be strategic rather than a footnote,
              and the honest way to do that is to show the numbers — they are
              verifiable against the Florida DBPR, which is the entire point of
              stating them rather than describing them.
            */}
            {/*
              The icon goes INSIDE the <dt>, and each wrapper <div> contains
              nothing but a dt/dd pair.

              A `<div>` inside a `<dl>` may hold only that pair — no sibling
              icon, no nested layout div. The first version of this block had
              both, and axe reported `definition-list` and `dlitem` at all three
              breakpoints. `docs/03` lists this exact trap; I walked into it
              anyway, which is why the audit runs.
            */}
            <dl className="flex flex-col gap-4 lg:col-span-4">
              {[
                {
                  Icon: ShieldCheck,
                  label: "Licensed Real Estate Agent",
                  value: siteConfig.licenses.realEstate.number,
                },
                {
                  Icon: HardHat,
                  label: "Certified Residential Building Contractor",
                  value: siteConfig.licenses.contractor.number,
                },
              ].map(({ Icon, label, value }) => (
                <div
                  key={label}
                  className="rounded-lg border border-border-invert/40 bg-royal-900/60 p-4"
                >
                  <dt className="flex items-start gap-3 text-sm font-semibold text-foreground-invert">
                    <Icon
                      className="mt-0.5 size-5 shrink-0 text-azure-400"
                      aria-hidden="true"
                    />
                    {label}
                  </dt>
                  <dd className="tabular mt-1 pl-8 text-sm text-foreground-invert-muted">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Container>
      </section>

      {/* ── 2. The advantage (§41, §44, §110) ────────────────────────── */}
      <Section>
        <Container>
          <Reveal>
            <SectionHeader
              overline="Why this page exists"
              title="Two licences, one side of the table"
              lead="Most buyers on a new build have a Realtor. Very few have one who is also licensed to build the house."
            />

            <div className="mt-10 grid gap-8 md:grid-cols-3">
              {ADVANTAGES.map((item) => (
                <div key={item.title} className="flex flex-col gap-3">
                  <item.icon className="size-6 text-accent-quiet" aria-hidden="true" />
                  <h3 className="text-h4 font-semibold">{item.title}</h3>
                  <p className="text-body leading-relaxed text-foreground-muted">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </Container>
      </Section>

      {/* ── 3. The warning, full width (§43) ─────────────────────────── */}
      <Section tone="sunken" className="py-10 md:py-12">
        <Container>
            <Callout title="Before you visit a single model home" tone="warning">
              <p>
                Most builders will only recognise your agent if they are registered
                on your <strong>first</strong> visit. Walk in alone, sign the
                visitor sheet, and you can lose the right to independent
                representation in that community entirely — with no saving to you,
                because the builder keeps the money either way.
              </p>
              <p>
                It takes one message to register me. Send it before you go.
              </p>
            </Callout>
        </Container>
      </Section>

      {/* ── 4. The guide body (§43) ──────────────────────────────────── */}
      <Section>
        <Container>
          <Prose>
            <h2 id="whose-agent">Whose agent is the sales office?</h2>
            <AnswerFirst>
              The builder&rsquo;s. They are paid by the builder, their duty runs to
              the builder, and everything you tell them is information the builder
              has.
            </AnswerFirst>
            <p>
              This is not a criticism of sales agents, who are usually knowledgeable
              and often genuinely pleasant. It is simply a statement of who employs
              them. When you mention that you could stretch to another thirty
              thousand, or that you need to be in by August, that is now the
              builder&rsquo;s information to use in a negotiation you are on the
              other side of.
            </p>

            <h2 id="register">Registering before your first visit</h2>
            <AnswerFirst>
              Send one message before you go. That is the whole step, and it is the
              most consequential five minutes in the process.
            </AnswerFirst>
            <p>
              Builder registration policies vary, but the common thread is that the
              first visit governs. Some builders allow a short grace period; many do
              not. Nobody tells you this at the door, because it is not in their
              interest to.
            </p>

            <h2 id="what-changes">What independent representation changes</h2>
            <AnswerFirst>
              Someone reads the contract on your behalf, knows which incentives a
              particular builder actually gives, and is at the site during
              construction rather than only at closing.
            </AnswerFirst>
            <p>
              On a resale, a buyer&rsquo;s agent negotiates a price. On a new build,
              the base price is close to fixed — a builder will not undercut the
              comparables in their own community, because doing so devalues every
              remaining lot. The negotiation happens elsewhere: closing cost
              contributions, rate buydowns, design-centre allowances, which lot,
              and what happens when the schedule slips.
            </p>

            <h2 id="spec-vs-build">Spec homes and to-be-built homes</h2>
            <AnswerFirst>
              They are different purchases with different risks. A finished spec
              home is closer to buying a resale; a to-be-built home is a contract to
              construct something that does not exist yet.
            </AnswerFirst>
            <p>
              A <strong>spec home</strong> — sometimes called inventory or a quick
              move-in — is already built or nearly so. You can walk it, you can have
              it inspected, and what you see is what you get. Builders often
              discount them or attach the strongest incentives to them, because an
              unsold finished house is expensive to hold. The trade is that the
              finishes were chosen by the builder.
            </p>
            <p>
              A <strong>to-be-built home</strong> lets you choose the lot, the
              floorplan and the finishes, and commits you to a construction timeline
              you do not control. Delays happen for real reasons, and the contract
              usually protects the builder rather than you. If your current lease
              ends on a fixed date, this is the variable that matters most, and it
              should shape which of the two you pursue.
            </p>
            <p>
              There is a middle case worth knowing about: a house under construction
              but not yet sold, where some selections are still open. It is often
              the best of both, and it is rarely advertised as a category.
            </p>

            <h2 id="contract">Reading a builder contract</h2>
            <AnswerFirst>
              A builder&rsquo;s contract is written by the builder&rsquo;s lawyers
              for the builder&rsquo;s benefit. It is not the standard state form,
              and the differences are not in your favour.
            </AnswerFirst>
            <p>
              Things worth understanding before you sign: what happens if the
              completion date slips and what your remedy is; whether your deposit is
              refundable and under what circumstances; how change orders are priced
              and who can authorise them; what the allowances actually cover; and
              how disputes are resolved.
            </p>
            <p>
              I can tell you what those clauses mean in practice and which ones I
              have seen bite. What I cannot do is give you legal advice, and on a
              contract this size a Florida real estate attorney is worth the fee.
            </p>

            <h2 id="upgrades">Lot premiums, upgrades, and what holds value</h2>
            <AnswerFirst>
              Pay for what is hard to change later — structure, rough-ins, and
              anything behind a wall. Finishes are almost always cheaper afterwards.
            </AnswerFirst>
            <p>
              The design centre is where budgets go to die, and it is designed to.
              The useful question on every line is: what would this cost to add in
              two years? For an extra run of conduit, a pre-plumb, an extended slab
              or a structural option, the answer is often &ldquo;far more, or not at
              all&rdquo; — those are worth paying for now. For cabinet hardware,
              light fixtures and backsplash tile, the answer is usually &ldquo;less,
              from anyone&rdquo;.
            </p>
            <p>
              Lot premiums are their own calculation. A conservation or water lot
              generally holds its premium; a marginally larger lot on the same
              street generally does not.
            </p>

            <h2 id="incentives">Where the negotiation actually is</h2>
            <AnswerFirst>
              Not the base price. Incentives — closing costs, rate buydowns, design
              allowances and which lot you get — are where a builder has room to
              move.
            </AnswerFirst>
            <p>
              Understanding why makes you better at asking. A builder who cuts the
              base price on your house has just lowered the comparable sale for
              every remaining lot in the community, and for the appraisals on all of
              them. A builder who gives you $15,000 towards closing costs has spent
              the same money without touching the recorded price. Given the choice,
              they will always prefer the second, which means asking for the second
              is far more likely to work.
            </p>
            <p>
              The levers that commonly move:
            </p>
            <ul>
              <li>
                <strong>Closing cost contributions</strong>, usually tied to using
                the builder&rsquo;s preferred lender. Worth comparing that
                lender&rsquo;s terms against an outside quote — sometimes the
                incentive genuinely wins, and sometimes it is priced back into the
                rate.
              </li>
              <li>
                <strong>Rate buydowns.</strong> In a high-rate market these have
                become the main currency, and they can be worth more than any price
                reduction over the life of the loan.
              </li>
              <li>
                <strong>Design centre allowances</strong>, which are effectively a
                discount on the upgrades you were going to buy anyway.
              </li>
              <li>
                <strong>Lot choice and premium.</strong> Sometimes a premium is
                waived where the price cannot move.
              </li>
            </ul>
            <p>
              Timing matters too. A builder near the end of a quarter, or with two
              finished houses standing empty, is a different negotiator from the
              same builder at the launch of a new phase.
            </p>

            <h2 id="walkthroughs">Construction-phase walkthroughs</h2>
            <AnswerFirst>
              I am a Certified Residential Building Contractor, so I can walk the
              house during construction and tell you what I am looking at.
            </AnswerFirst>
            <p>
              The most valuable visit is at pre-drywall, when the framing, the
              rough-in plumbing, the electrical and the mechanical are all still
              visible. After drywall, everything is a guess. A second useful visit
              is at final, before your walkthrough with the builder, so the list you
              bring is a real one.
            </p>
            <p>
              This does not replace a licensed home inspection, and I will always
              tell you to get one. It means you have someone who can read a build
              standing in it with you at the point where problems are cheapest to
              fix.
            </p>

            <h2 id="warranty">Warranty and the one-year walkthrough</h2>
            <AnswerFirst>
              Most builders warrant certain items for the first year and expect a
              list before it expires. Diarise it on the day you close.
            </AnswerFirst>
            <p>
              Nail pops, drywall cracks at the corners, doors that have moved as the
              house settled, grout, and anything that has never quite worked
              properly. Keep a running note from the day you move in rather than
              trying to remember at month eleven.
            </p>

            <h2 id="local">Building in Central Florida</h2>
            <AnswerFirst>
              Our climate is hard on houses, and the things that matter here are
              drainage, roofing and moisture.
            </AnswerFirst>
            <p>
              Grading and drainage around a new slab, flashing details, and how the
              envelope is sealed matter more here than they do in a dry climate. So
              does the mechanical system: an air conditioner that is undersized or
              badly ducted in Florida is not an inconvenience, it is a
              humidity problem that becomes a mould problem.
            </p>
          </Prose>
        </Container>
      </Section>

      {/* ── 5. Current new-construction listings (§43, §46) ──────────── */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-6">
          <SectionHeader
            overline="Available now"
            title="New construction I represent"
          />

          {result.listings.length > 0 ? (
            <ListingGrid listings={result.listings} />
          ) : (
            <div className="flex max-w-[68ch] flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-surface p-6">
              <p className="text-body text-foreground-muted">
                Nothing of my own is listed as new construction at the moment,
                which does not narrow your options at all — representation works
                on any builder&rsquo;s community, and that is the point of this
                page.
              </p>
              <Button asChild variant="accent">
                <Link href="/contact?interest=new_construction">
                  Register me before your first visit
                </Link>
              </Button>
            </div>
          )}

          <div className="max-w-[68ch]">
            <Disclaimer type={["legal", "construction"]} />
          </div>
        </Container>
      </Section>

      {/* ── 6. FAQ (§21, §43) ────────────────────────────────────────── */}
      <Section>
        <Container>
          <SectionHeader overline="Common questions" title="Questions buyers ask" />
          {/*
            The SAME array feeds `faqJsonLd` above and this accordion. §21 is
            explicit that FAQ markup may only describe questions the page
            actually renders, and one array is the only way to keep that true as
            the content changes.
          */}
          <div className="mt-8 max-w-[68ch]">
            <FaqAccordion items={faq} defaultOpenFirst />
          </div>
        </Container>
      </Section>

      {/* ── 7. Onward links and CTA (§46) ────────────────────────────── */}
      <Section tone="invert">
        <Container>
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-12">
            <div className="flex flex-col gap-6 lg:col-span-6">
              <SectionHeader
                invert
                overline="Before your first visit"
                title="Tell me which communities you are considering"
                lead="One message is the whole step. Registering me before you walk into a sales office protects your representation for that entire community, and it costs you nothing."
              />

              {relatedLinks.length > 0 ? (
                <RelatedLinks links={relatedLinks} heading="Related reading" />
              ) : null}
            </div>

            <div className="lg:col-span-6">
              <LeadForm
                leadType="new_construction"
                submitLabel="Register me with the builder"
                className="rounded-lg bg-surface p-5 shadow-lg lg:p-6"
              />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}

/**
 * The three things the second licence changes, and the one it does not.
 *
 * The third card is the limits, and it is a card rather than a footnote on
 * purpose. §44 forbids inflating the licence and §110 asks for accurate
 * language; a page that spends two columns on what she can do and buries what
 * she cannot in small print is doing the opposite of that.
 */
const ADVANTAGES = [
  {
    icon: ScrollText,
    title: "The contract",
    body: "A builder's contract is written by the builder's lawyers. Knowing which clauses bite — and which ones a Florida attorney should read before you sign — is worth more than any negotiation on the base price.",
  },
  {
    icon: HardHat,
    title: "The build",
    body: "At pre-drywall the framing, the rough-ins and the mechanicals are all still visible. After drywall they are a guess. Having somebody there who reads that for a living is the difference the second licence makes.",
  },
  {
    icon: ShieldCheck,
    title: "The limits",
    body: "Construction knowledge is not a home inspection, and none of this is legal advice. Both are said plainly throughout this page, because a claim you have to walk back later helps nobody.",
  },
] as const;
