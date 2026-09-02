import type { Metadata } from "next";
import Link from "next/link";

import { GuideLayout } from "@/components/site/guide-layout";
import { JsonLd } from "@/components/site/json-ld";
import { AnswerFirst, Callout, TableScroll } from "@/components/site/prose";
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
 * `/assumable-mortgage-homes` — docs/05.
 *
 * The page exists because of a specific, narrow, currently-valuable question:
 * when rates are high, a buyer who can take over a 3% loan is buying a
 * materially different house from the one the listing price describes.
 *
 * COMPLIANCE: lending + legal disclaimers (docs/09 § 6). She is not a lender
 * and not an attorney; entitlement substitution and servicer approval are
 * decided by other people entirely, and this page says so rather than implying
 * she can arrange it.
 */

export const revalidate = 3600;

const crumbs = [
  { href: "/guides", label: "Guides" },
  { href: "/assumable-mortgage-homes", label: "Assumable Mortgage Homes" },
];

const toc = [
  { id: "what-it-is", label: "What an assumption is" },
  { id: "which-loans", label: "Which loans can be assumed" },
  { id: "why-now", label: "Why it matters at these rates" },
  { id: "equity-gap", label: "The equity gap" },
  { id: "va-entitlement", label: "VA entitlement substitution" },
  { id: "documents", label: "What to ask for first" },
  { id: "process", label: "The approval process" },
  { id: "timeline", label: "Timelines and servicer friction" },
  { id: "fails", label: "If it falls through" },
  { id: "finding", label: "How to find one" },
  { id: "current", label: "Current assumable listings" },
  { id: "faq", label: "Common questions" },
];

const faq: FaqItem[] = [
  {
    q: "What does assuming a mortgage actually mean?",
    a: "You take over the seller's existing loan — its balance, its interest rate and its remaining term — instead of getting a new one. The rate travels with the loan, not with the market, which is the entire reason anyone does this.",
  },
  {
    q: "Which loans can be assumed?",
    a: "Government-backed loans: VA, FHA and USDA. Conventional loans generally cannot be assumed because they carry a due-on-sale clause the lender will enforce. If a listing says assumable, the first question is which of the three it is.",
  },
  {
    q: "Do I have to be a veteran to assume a VA loan?",
    a: "No. A VA loan can be assumed by a non-veteran buyer, subject to the servicer's approval. The catch is on the seller's side, not yours: unless a veteran buyer substitutes their entitlement, the seller's entitlement stays tied up in that house until the loan is paid off.",
  },
  {
    q: "What is the equity gap?",
    a: "The difference between the price and the loan balance. If a house is $500,000 and the assumable balance is $300,000, you need $200,000 — in cash, or through a second loan at current rates. This is the reason most assumptions fall apart, and it is the first number to work out.",
  },
  {
    q: "Can I get a second mortgage to cover the gap?",
    a: "Sometimes. A second lien behind an assumed first is possible but far from universal, and the terms are set by whoever writes it. Ask a lender before you rely on it — that is a question for them, not for me.",
  },
  {
    q: "How long does an assumption take?",
    a: "Longer than a normal purchase, and the honest answer is that it varies a great deal. The servicer processes the assumption on their own timetable, and they are not motivated by your closing date. Build real slack into the contract dates and expect to chase.",
  },
  {
    q: "Does the seller stay liable for the loan?",
    a: "It depends on whether the servicer grants a release of liability. Without one, the seller can remain on the hook. This matters enormously if you are the seller, and it is worth an attorney's eye on the paperwork rather than a handshake.",
  },
  {
    q: "Is an assumption always cheaper?",
    a: "No. Compare the whole cost: the assumed payment plus whatever the equity gap costs you, against a conventional purchase at today's rate. On a large gap the arithmetic sometimes favours the ordinary loan, and it is worth doing that sum before falling in love with the rate.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "Assumable Mortgage Homes in Central Florida",
  description:
    "How assuming a VA, FHA or USDA mortgage actually works in Central Florida: which loans qualify, the equity gap, entitlement substitution, realistic timelines, and current assumable listings.",
  path: "/assumable-mortgage-homes",
  type: "article",
});

export default async function AssumablePage() {
  const result = await safeQuery(
    () => searchListings({ type: ["assumable"], sort: "newest", page: 1 }),
    EMPTY_RESULT,
    "searchListings(assumable)",
  );

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: "Assumable mortgage homes in Central Florida",
            description:
              "Which loans can be assumed, how the equity gap works, VA entitlement substitution, and what the timeline really looks like.",
            path: "/assumable-mortgage-homes",
            section: "Assumable mortgages",
            wordCount: 1900,
          }),
          serviceJsonLd({
            name: "Assumable mortgage buyer representation",
            description:
              "Representation for buyers pursuing an assumable VA, FHA or USDA mortgage in Lake Mary and Central Florida.",
            path: "/assumable-mortgage-homes",
            serviceType: "Assumable mortgage buyer representation",
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <GuideLayout
        overline="Buyer guide"
        title="Assumable mortgage homes in Central Florida"
        lead="When rates are high, taking over someone else's low-rate loan can be worth more than any price negotiation. Here is how it actually works, and where it usually goes wrong."
        crumbs={crumbs}
        toc={toc}
        faq={faq}
        leadType="assumable"
        ctaHeading="Looking for an assumable listing?"
        ctaDescription="Tell me your budget and how much cash you can put behind the gap, and I will tell you honestly whether an assumption is realistic for you."
      >
        <p>
          An assumable mortgage is the closest thing the current market has to a
          free lunch, and like most free lunches it comes with conditions that
          are rarely mentioned in the listing. This page covers what an
          assumption is, which loans allow it, and the one number that decides
          whether it is possible for you.
        </p>

        <h2 id="what-it-is">What an assumption actually is</h2>
        <AnswerFirst>
          You take over the seller&rsquo;s existing loan rather than getting a
          new one — the same balance, the same interest rate, the same remaining
          term. The rate belongs to the loan, not to the market.
        </AnswerFirst>
        <p>
          A seller who financed at 2.9% in 2021 is sitting on an asset that has
          nothing to do with their house. If that loan can be transferred, a
          buyer inherits payments calculated at a rate no lender will write
          today. On a $300,000 balance the difference between 2.9% and current
          rates is hundreds of dollars a month, every month, for decades.
        </p>
        <p>
          It is not a subject-to arrangement and it is not a private agreement
          between you and the seller. A real assumption is approved by the loan
          servicer, who substitutes you as the borrower of record.
        </p>

        <h2 id="which-loans">Which loans can be assumed</h2>
        <AnswerFirst>
          Government-backed loans — VA, FHA and USDA. Conventional loans almost
          never can, because of the due-on-sale clause.
        </AnswerFirst>

        <TableScroll>
          <table>
            <thead>
              <tr>
                <th>Loan type</th>
                <th>Assumable</th>
                <th>What to watch</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>VA</td>
                <td>Yes, with servicer approval</td>
                <td>The seller&rsquo;s entitlement stays tied up unless a veteran buyer substitutes theirs</td>
              </tr>
              <tr>
                <td>FHA</td>
                <td>Yes, with servicer approval</td>
                <td>You must qualify on credit and income like any FHA borrower</td>
              </tr>
              <tr>
                <td>USDA</td>
                <td>Yes, with conditions</td>
                <td>Property and income eligibility rules still apply</td>
              </tr>
              <tr>
                <td>Conventional</td>
                <td>Generally no</td>
                <td>Due-on-sale clause; the lender can call the balance</td>
              </tr>
            </tbody>
          </table>
        </TableScroll>

        <p>
          You still have to qualify. An assumption transfers the rate, not the
          underwriting — the servicer will look at your credit and your income
          exactly as a lender would.
        </p>

        <h2 id="why-now">Why it matters at these rates</h2>
        <AnswerFirst>
          Because the gap between a pandemic-era rate and a current one is large
          enough to change what you can afford, in a way no price reduction
          matches.
        </AnswerFirst>
        <p>
          A seller can cut the price by $20,000 and barely move your monthly
          payment. An assumable loan two or three points below market moves it a
          great deal. When you are comparing houses, compare the payments rather
          than the prices — that is the comparison that reflects what you will
          actually live with.
        </p>

        <h2 id="equity-gap">The equity gap, and why most assumptions fail</h2>
        <AnswerFirst>
          You must cover the difference between the sale price and the
          outstanding loan balance. That difference is usually large, and it is
          usually the reason an assumption does not happen.
        </AnswerFirst>
        <p>
          If the house is $500,000 and the assumable balance is $310,000, you
          need $190,000. The seller is not giving away their equity because
          their loan is attractive — they still want their money.
        </p>

        <Callout title="Work out the gap first" tone="warning">
          <p>
            Before anything else, ask for the current payoff balance and
            subtract it from the price. If you cannot cover that number in cash
            or with a second loan, the rate does not matter and the rest of the
            process is academic. I ask this question in the first phone call,
            because it saves everyone weeks.
          </p>
        </Callout>

        <h2 id="va-entitlement">VA entitlement substitution</h2>
        <AnswerFirst>
          If a non-veteran assumes a VA loan, the seller&rsquo;s entitlement
          stays attached to that property until the loan is paid off — which can
          stop them using their own benefit again.
        </AnswerFirst>
        <p>
          This is the part sellers discover too late. A veteran who lets a
          civilian assume their VA loan may find their entitlement unavailable
          for their next purchase. If the buyer is also VA-eligible, they can
          substitute their entitlement for the seller&rsquo;s and release it.
        </p>
        <p>
          If you are the seller in this situation, get it in writing and get it
          confirmed by the servicer before closing, not after. If you are the
          buyer, understand that this is why some VA sellers will only consider
          a veteran buyer — it is not a preference, it is arithmetic about their
          own next house.
        </p>

        <h2 id="documents">What to ask for before anything else</h2>
        <AnswerFirst>
          Three things: the current payoff statement, the loan type, and written
          confirmation from the servicer that the loan is assumable.
        </AnswerFirst>
        <p>
          &ldquo;Assumable&rdquo; in a listing description is a claim, not a
          fact. It is sometimes wrong — the seller may be repeating what they
          were told at closing years ago, or confusing an assumable loan with a
          portable one. The only version that counts is the servicer&rsquo;s.
        </p>
        <ul>
          <li>
            <strong>A current payoff statement.</strong> Not the original loan
            amount, and not the balance on last year&rsquo;s statement. The
            payoff figure is what sets your equity gap, and it changes every
            month.
          </li>
          <li>
            <strong>The loan type and the servicer&rsquo;s name.</strong> VA,
            FHA and USDA assumptions run on different rules, and the servicer —
            not the original lender — is who decides.
          </li>
          <li>
            <strong>Whether the seller has already contacted the servicer.</strong>{" "}
            If they have not, that call is the first real step, and it should
            happen before you write an offer rather than after.
          </li>
          <li>
            <strong>For a VA loan, whether the seller understands the
            entitlement position.</strong> Some sellers withdraw the moment they
            learn what a non-veteran assumption does to their own benefit. Better
            to find that out on day one.
          </li>
        </ul>

        <h2 id="process">What the approval process actually looks like</h2>
        <AnswerFirst>
          The servicer qualifies you much as a lender would, then substitutes
          you as the borrower of record. It is underwriting, just slower and
          with fewer people working on it.
        </AnswerFirst>
        <p>
          Broadly, the sequence runs: the seller requests an assumption package
          from the servicer; you complete it and supply income, asset and credit
          documentation; the servicer underwrites you; the assumption is
          approved, with or without a release of the seller&rsquo;s liability;
          and the transfer is recorded at closing alongside whatever you are
          using to cover the equity gap.
        </p>
        <p>
          Two things surprise people. The first is that you are genuinely
          underwritten — an assumption is not a way around credit or income
          requirements, and a buyer who would not qualify for a new loan will
          usually not qualify for this one either. The second is how little the
          servicer cares about your closing date. There is no loan officer whose
          commission depends on it.
        </p>

        <h2 id="timeline">Timelines and servicer friction</h2>
        <AnswerFirst>
          Expect it to take longer than a normal purchase, and expect to chase.
          Servicers process assumptions on their own schedule.
        </AnswerFirst>
        <p>
          The servicing department that handles assumptions is rarely the one
          that answers the phone, and it is rarely staffed for speed. Build
          genuine slack into the contract dates, agree in advance who chases and
          how often, and keep a written record of every call. An assumption that
          fails usually fails on the calendar rather than on the merits.
        </p>

        <h2 id="fails">If the assumption falls through</h2>
        <AnswerFirst>
          Your contract needs to say what happens then, in writing, before you
          sign it. Assume it might fail and decide in advance who carries the
          consequence.
        </AnswerFirst>
        <p>
          Assumptions fail for ordinary reasons: the servicer declines, the
          package sits unprocessed past every extension, the payoff turns out
          higher than the seller believed, or the release of liability is
          refused and the seller withdraws. None of those is exotic, and all of
          them are survivable if the contract anticipated them.
        </p>
        <p>
          What that means practically is a financing contingency written for an
          assumption rather than for a conventional loan, realistic dates with
          an agreed extension mechanism, and clarity about your deposit if the
          servicer simply never gets there. A Florida real estate attorney
          should look at that language — this is precisely the kind of clause
          where the standard form does not fit the transaction.
        </p>
        <p>
          It is also worth having a fallback in mind. If the assumption dies and
          you still want the house, are you willing to buy it conventionally at
          today&rsquo;s rate? Knowing the answer before you are three weeks into
          a contract makes the decision far less painful.
        </p>

        <h2 id="finding">How to find an assumable home</h2>
        <AnswerFirst>
          Ask. Assumability is often not advertised, because the listing agent
          either does not know or does not think to mention it.
        </AnswerFirst>
        <p>
          A house with an assumable loan looks like every other house on the
          market. Finding one means asking the question on properties you like
          anyway — what kind of loan is on it, and what is the current balance.
          That is a normal question between agents, and it costs nothing to ask.
        </p>
        <p>
          Anything I represent that carries an assumable loan is marked as such
          and appears below. Beyond that, I ask the question routinely on any
          property a client is seriously considering — it costs one message
          between agents, and the occasional yes is worth a great deal.
        </p>
        <p>
          One local note. A great many Central Florida homes changed hands
          between 2020 and 2022, which is exactly the window when the lowest
          rates were written. That is why assumptions are worth asking about
          here specifically: the pool of houses carrying a very low
          government-backed loan is unusually large, and most of their owners
          have no idea it is an asset.
        </p>

        <h2 id="current">Current assumable listings</h2>
      </GuideLayout>

      {/* The live block docs/05 requires, with an alert signup as its empty
          state rather than an empty grid. */}
      <section aria-labelledby="assumable-listings" className="section-y bg-surface-sunken">
        <div className="container-page flex flex-col gap-6">
          <h2 id="assumable-listings" className="text-h2">
            Assumable listings right now
          </h2>

          {result.listings.length > 0 ? (
            <ListingGrid listings={result.listings} />
          ) : (
            <div className="flex max-w-[68ch] flex-col items-start gap-4 rounded-lg border border-dashed border-border bg-surface p-6">
              <p className="text-body text-foreground-muted">
                Nothing of mine has an assumable loan on it at the moment. They
                turn up irregularly and they go quickly, so the useful thing is
                to be on the list before one appears rather than checking back.
              </p>
              <Button asChild variant="accent">
                <Link href="/contact?interest=assumable">
                  Tell me when one comes up
                </Link>
              </Button>
            </div>
          )}

          <div className="max-w-[68ch]">
            <Disclaimer type={["lending", "legal"]} />
          </div>
        </div>
      </section>
    </>
  );
}
