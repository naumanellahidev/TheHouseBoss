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
import { getSoldListings } from "@/lib/queries/listings";
import { safeQuery } from "@/lib/queries/safe";
import type { FaqItem } from "@/types/domain";

/**
 * `/sell-your-central-florida-home` — docs/05.
 *
 * The contractor angle is the differentiator on the selling side too: knowing
 * which pre-listing repairs return money and which do not is worth more to a
 * seller than any marketing package.
 *
 * COMPLIANCE: the estimate disclaimer (docs/09 § 6) — a valuation is not an
 * appraisal and not a guarantee of sale price. It appears with the form.
 */

export const revalidate = 3600;

const crumbs = [
  { href: "/guides", label: "Guides" },
  { href: "/sell-your-central-florida-home", label: "Sell Your Home" },
];

const toc = [
  { id: "worth", label: "What your home is worth" },
  { id: "repairs", label: "Which repairs return money" },
  { id: "pricing", label: "Pricing strategy" },
  { id: "preparation", label: "Preparation and staging" },
  { id: "marketing", label: "How I market a home" },
  { id: "offers", label: "Judging an offer" },
  { id: "inspection", label: "Inspection and appraisal" },
  { id: "disclosure", label: "What you must disclose" },
  { id: "timeline", label: "The process, start to finish" },
  { id: "sold", label: "Recently sold" },
  { id: "faq", label: "Common questions" },
];

const faq: FaqItem[] = [
  {
    q: "What is my home actually worth?",
    a: "The honest answer is a range, and it narrows once someone has stood in the house. Online estimates work from public records and cannot see that your roof is two years old or that the previous owner tiled over a problem. I will give you a range with the comparables behind it, and tell you what would move you to the top of it.",
  },
  {
    q: "Should I make repairs before listing?",
    a: "Some. The ones that change how a buyer perceives risk — roof, water intrusion, electrical — usually return more than they cost, because they remove the discount a buyer applies for uncertainty. Cosmetic renovations rarely return their cost. I will walk your house and tell you which is which.",
  },
  {
    q: "How long will it take to sell?",
    a: "It depends on price, condition and the specific street, and anyone who gives you a number before seeing the house is guessing. What I can tell you is that the first two weeks carry most of the buyer attention, which is why the price has to be right on day one rather than after a reduction.",
  },
  {
    q: "What does it cost to sell?",
    a: "Commission, title and closing costs, any agreed repairs or concessions, and whatever you spend preparing the house. I will put real numbers against each of those for your property before you commit to anything, so you know your net rather than a headline price.",
  },
  {
    q: "Should I sell before I buy?",
    a: "It depends on whether you can carry both and how much risk you want. Selling first is financially safer and logistically harder. There are bridge options in between. This is a conversation worth having early, because it changes the whole sequence.",
  },
  {
    q: "What if my house does not appraise?",
    a: "It happens, particularly in a moving market. The options are to renegotiate, to have the buyer make up the difference in cash, or to challenge the appraisal with better comparables. Having the comparables ready before that call is most of the battle.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "Sell Your Central Florida Home",
  description:
    "Selling in Lake Mary or Central Florida: what your home is realistically worth, which pre-listing repairs return money and which do not, pricing strategy, and the whole process from valuation to closing.",
  path: "/sell-your-central-florida-home",
  type: "article",
});

export default async function SellPage() {
  const sold = await safeQuery(() => getSoldListings(undefined, 3), [], "getSoldListings");

  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: "Selling a home in Central Florida",
            description:
              "Valuation, which repairs return money, pricing strategy, preparation, marketing and the process from listing to closing.",
            path: "/sell-your-central-florida-home",
            section: "Selling",
            wordCount: 1800,
          }),
          serviceJsonLd({
            name: "Seller representation",
            description:
              "Listing representation in Lake Mary and Central Florida, including a licensed contractor's assessment of which pre-listing repairs return their cost.",
            path: "/sell-your-central-florida-home",
            serviceType: "Real estate seller representation",
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <GuideLayout
        overline="Seller guide"
        title="Selling your Central Florida home"
        lead="What it is worth, what to fix before listing and what to leave alone, and what the process actually looks like from the first conversation to the closing table."
        crumbs={crumbs}
        toc={toc}
        faq={faq}
        leadType="seller"
        ctaHeading="What is your home worth?"
        ctaDescription="Tell me the address and a little about the condition, and I will come back with a range, the comparables behind it, and what would move you to the top of it."
      >
        <p>
          Most selling advice is generic because most agents cannot see past the
          finishes. I am also a licensed residential contractor, which changes
          the most expensive decision a seller makes: what to spend money on
          before the house goes on the market.
        </p>

        <h2 id="worth">What your home is worth</h2>
        <AnswerFirst>
          A range, based on comparable sales and on the actual condition of your
          house — not a single number from an algorithm that has never been
          inside it.
        </AnswerFirst>
        <p>
          Automated estimates work from public records: square footage, bedroom
          count, the last sale price. They cannot see that the roof was replaced
          two years ago, that the kitchen was renovated properly rather than
          cosmetically, or that there is a moisture problem behind the laundry.
          All three change the number materially.
        </p>

        <Callout title="What I will give you">
          <p>
            A realistic range, the three to five comparable sales it rests on
            and why each is comparable, the specific things about your house
            that push you up or down within that range, and what it would take
            to move to the top of it — with the cost of each, and whether it is
            worth doing.
          </p>
        </Callout>

        <h2 id="repairs">Which repairs return money, and which do not</h2>
        <AnswerFirst>
          Repairs that remove a buyer&rsquo;s uncertainty about risk usually
          return more than they cost. Cosmetic renovations usually do not.
        </AnswerFirst>
        <p>
          A buyer looking at an ageing roof does not deduct the cost of a roof —
          they deduct the cost of a roof plus a margin for everything else they
          now suspect. Removing that doubt is worth more than the repair. A new
          quartz countertop, by contrast, competes against the buyer&rsquo;s own
          taste and rarely returns its cost.
        </p>

        <TableScroll>
          <table>
            <thead>
              <tr>
                <th>Usually worth doing</th>
                <th>Usually not</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Roof at or near end of life</td>
                <td>Full kitchen renovation</td>
              </tr>
              <tr>
                <td>Any active water intrusion</td>
                <td>Bathroom remodel to current fashion</td>
              </tr>
              <tr>
                <td>Electrical panel issues</td>
                <td>Room additions</td>
              </tr>
              <tr>
                <td>Wood-destroying organism damage</td>
                <td>Pools, in most cases</td>
              </tr>
              <tr>
                <td>Paint, deep clean, decluttering</td>
                <td>High-end fixtures throughout</td>
              </tr>
              <tr>
                <td>Drainage and grading problems</td>
                <td>Landscaping beyond tidy</td>
              </tr>
            </tbody>
          </table>
        </TableScroll>

        <p>
          This is a general ordering, not a rule for your house. The point of
          walking it together is to work out which of these apply to you and
          which are irrelevant.
        </p>

        <h2 id="pricing">Pricing strategy</h2>
        <AnswerFirst>
          Price it right in the first fortnight. The attention a listing gets in
          its first two weeks is the most it will ever get, and a reduction
          never recovers it.
        </AnswerFirst>
        <p>
          Overpricing to &ldquo;leave room to negotiate&rdquo; costs sellers
          money with dispiriting reliability. The house sits, the days-on-market
          count climbs where every buyer can see it, and the eventual reduction
          arrives after the audience has moved on. Houses priced correctly at
          launch usually sell nearer to asking than houses that reach the same
          price via a reduction.
        </p>

        <h2 id="preparation">Preparation and staging</h2>
        <AnswerFirst>
          Clean, decluttered and neutral beats expensively decorated, and costs
          a fraction as much.
        </AnswerFirst>
        <p>
          In order of return: remove roughly a third of what is in the house,
          deep clean including the things nobody thinks about, repair the small
          broken things a buyer reads as neglect, paint anything bold in a
          neutral colour, and make sure it smells of nothing at all.
        </p>

        <h2 id="marketing">How I market a home</h2>
        <AnswerFirst>
          Professional photography, a written description that answers real
          questions, and a listing page built to be found and cited rather than
          just to exist.
        </AnswerFirst>
        <p>
          Every listing I take gets its own page on this site — properly
          structured, fast, and marked up so search engines and AI assistants
          can read it. It also gets something no other listing in this market
          carries: my construction read on the property, which tells a serious
          buyer that the condition has already been looked at by someone
          qualified.
        </p>

        <h2 id="offers">Judging an offer — the price is not the offer</h2>
        <AnswerFirst>
          The highest number is not always the best offer. What matters is the
          probability that it actually closes, and at what price it closes
          after the inspection.
        </AnswerFirst>
        <p>
          Two offers at the same price are rarely worth the same. The things I
          look at, in roughly this order:
        </p>
        <ul>
          <li>
            <strong>Financing.</strong> Cash, then a fully underwritten
            pre-approval, then a pre-qualification, then nothing. The difference
            between the second and the third is enormous and mostly invisible in
            the headline number.
          </li>
          <li>
            <strong>The appraisal contingency.</strong> If the buyer has agreed
            to cover a shortfall, and has the cash to do it, the price is far
            more real.
          </li>
          <li>
            <strong>The inspection period.</strong> A long one is a long
            option on your house — you are off the market while they decide.
          </li>
          <li>
            <strong>Deposit size.</strong> A larger deposit is a buyer telling
            you they intend to close.
          </li>
          <li>
            <strong>Sale of another home.</strong> A contingent offer is only as
            reliable as a transaction you cannot see.
          </li>
          <li>
            <strong>Closing date and possession.</strong> Sometimes the timing
            is worth more to you than a few thousand dollars.
          </li>
        </ul>
        <p>
          I will lay every offer out against those and give you my honest read,
          including when the lower one is the better one.
        </p>

        <h2 id="inspection">Inspection and appraisal — where deals wobble</h2>
        <AnswerFirst>
          These two stages break more Central Florida transactions than
          financing does, and both are more manageable if the work was done
          before listing.
        </AnswerFirst>
        <p>
          The inspection report will find things. It always does, on every
          house, including new ones. What determines whether it becomes a
          renegotiation is whether the findings are surprises. A buyer who
          already knew the roof was fifteen years old, because it was disclosed
          and priced in, does not come back asking for a new roof. A buyer who
          discovers it on page forty of a report does.
        </p>
        <p>
          This is the main argument for the pre-listing walkthrough. Knowing
          what an inspector will find, deciding in advance what to fix and what
          to disclose, and pricing accordingly, removes most of the leverage a
          renegotiation depends on.
        </p>
        <p>
          On the appraisal: if it comes in below the contract price, the options
          are to renegotiate, to have the buyer bring the difference in cash if
          their contract requires it, or to challenge the appraisal with
          comparable sales the appraiser did not use. That last one works more
          often than people expect, but only if someone assembles the
          comparables quickly and puts them in front of the lender. That is a
          job I do rather than hope for.
        </p>

        <h2 id="disclosure">What you have to disclose</h2>
        <AnswerFirst>
          In Florida, a seller must disclose known facts that materially affect
          the value of the property and are not readily observable by the buyer.
        </AnswerFirst>
        <p>
          That standard is broader than most sellers assume, and it is not
          limited to what is on a form. Past flooding, a repaired sinkhole
          claim, an active leak, prior termite damage, unpermitted work — if you
          know about it and a buyer walking through would not see it, the safe
          course is to disclose it.
        </p>
        <p>
          Sellers resist this because it feels like arguing against their own
          interest. In practice, disclosure protects you: a known and disclosed
          defect that the buyer accepted is closed business, while an
          undisclosed one is a problem that can follow you after closing. It
          also tends to produce a cleaner negotiation, because the buyer is not
          discovering things.
        </p>
        <p>
          I am not a lawyer and this is not legal advice. If you are unsure
          whether something needs disclosing, the answer is to ask a Florida
          real estate attorney rather than to guess — and to lean towards
          disclosing while you wait for their answer.
        </p>

        <h2 id="timeline">The process, start to finish</h2>
        <AnswerFirst>
          Valuation and walkthrough, preparation, photography and launch,
          showings and offers, inspection and appraisal, then closing.
        </AnswerFirst>
        <ol>
          <li>
            <strong>Walkthrough and valuation.</strong> I see the house, we
            agree a range, and I tell you what is worth doing first.
          </li>
          <li>
            <strong>Preparation.</strong> The repairs we agreed, then cleaning
            and decluttering.
          </li>
          <li>
            <strong>Photography and launch.</strong> Photographs, the written
            description, the listing page, and a launch timed for the week.
          </li>
          <li>
            <strong>Showings and offers.</strong> Feedback after every showing,
            and a straight assessment of each offer including the terms that are
            not the price.
          </li>
          <li>
            <strong>Inspection and appraisal.</strong> The stage most deals
            wobble at. Having already looked at the condition, there are fewer
            surprises here.
          </li>
          <li>
            <strong>Closing.</strong> Title, final walkthrough, keys.
          </li>
        </ol>

        <h2 id="sold">Recently sold</h2>
      </GuideLayout>

      <section aria-labelledby="sold-recent" className="section-y bg-surface-sunken">
        <div className="container-page flex flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="sold-recent" className="text-h2">
              Recently sold
            </h2>
            <Button asChild variant="outline">
              <Link href="/sold">Every sold home</Link>
            </Button>
          </div>

          {sold.length > 0 ? (
            <ListingGrid listings={sold} />
          ) : (
            <p className="max-w-[68ch] rounded-lg border border-dashed border-border bg-surface p-6 text-body text-foreground-muted">
              The sold archive is still filling up on this site. Ask and I will
              walk you through recent comparable sales in your neighbourhood
              directly.
            </p>
          )}

          <div className="max-w-[68ch]">
            <Disclaimer type="estimate" />
          </div>
        </div>
      </section>
    </>
  );
}
