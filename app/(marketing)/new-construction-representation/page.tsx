import type { Metadata } from "next";
import Link from "next/link";

import { GuideLayout } from "@/components/site/guide-layout";
import { JsonLd } from "@/components/site/json-ld";
import { AnswerFirst, Callout } from "@/components/site/prose";
import { Disclaimer } from "@/components/site/disclaimer";
import { ListingGrid } from "@/components/listing/listing-grid";
import { Button } from "@/components/ui/button";
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  serviceJsonLd,
} from "@/lib/seo/jsonld";
import { buildMetadata } from "@/lib/seo/metadata";
import { searchListings } from "@/lib/queries/listings";
import { EMPTY_RESULT, safeQuery } from "@/lib/queries/safe";
import type { FaqItem } from "@/types/domain";

/**
 * `/new-construction-representation` — docs/05.
 *
 * The strongest page on the site for her contractor licence: nobody else in
 * this market can offer a buyer's agent who is licensed to read the build.
 *
 * COMPLIANCE: legal disclaimer (docs/09 § 6) — builder contracts are reviewed
 * by an attorney, not by an agent. The construction disclaimer also applies to
 * the walkthrough section.
 */

export const revalidate = 3600;

const crumbs = [
  { href: "/guides", label: "Guides" },
  { href: "/new-construction-representation", label: "New-Construction Representation" },
];

const toc = [
  { id: "whose-agent", label: "Whose agent is the sales office?" },
  { id: "register", label: "Register before your first visit" },
  { id: "what-changes", label: "What representation changes" },
  { id: "spec-vs-build", label: "Spec homes and to-be-built" },
  { id: "contract", label: "Reading a builder contract" },
  { id: "incentives", label: "Where the negotiation actually is" },
  { id: "upgrades", label: "Lot premiums and upgrades" },
  { id: "walkthroughs", label: "Construction-phase walkthroughs" },
  { id: "warranty", label: "Warranty and the one-year walk" },
  { id: "local", label: "Building in Central Florida" },
  { id: "current", label: "Current new-construction homes" },
  { id: "faq", label: "Common questions" },
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

export const metadata: Metadata = buildMetadata({
  title: "New Construction Buyer Representation in Central Florida",
  description:
    "Why you want your own representation before you walk into a builder's sales office in Central Florida — registration rules, contract terms, which upgrades hold value, and construction-phase walkthroughs by a licensed contractor.",
  path: "/new-construction-representation",
  type: "article",
});

export default async function NewConstructionPage() {
  const result = await safeQuery(
    () => searchListings({ type: ["new_construction"], sort: "newest", page: 1 }),
    EMPTY_RESULT,
    "searchListings(newConstruction)",
  );

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

      <GuideLayout
        overline="Buyer guide"
        title="New-construction representation in Central Florida"
        lead="The agent in the sales office works for the builder. Here is what changes when someone in the room works for you — and why the timing of that decision matters more than the decision itself."
        crumbs={crumbs}
        toc={toc}
        faq={faq}
        leadType="new_construction"
        ctaHeading="Thinking about a new build?"
        ctaDescription="Tell me which communities you are considering and I will register you before your first visit — that one step protects your representation for the whole community."
      >
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

        <h2 id="current">Current new-construction homes</h2>
      </GuideLayout>

      <section aria-labelledby="nc-listings" className="section-y bg-surface-sunken">
        <div className="container-page flex flex-col gap-6">
          <h2 id="nc-listings" className="text-h2">
            New construction I represent
          </h2>

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
        </div>
      </section>
    </>
  );
}
