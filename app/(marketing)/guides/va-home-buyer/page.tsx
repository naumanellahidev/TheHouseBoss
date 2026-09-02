import type { Metadata } from "next";
import Link from "next/link";

import { GuideLayout } from "@/components/site/guide-layout";
import { JsonLd } from "@/components/site/json-ld";
import {
  AnswerFirst,
  Callout,
  TableScroll,
} from "@/components/site/prose";
import { Disclaimer } from "@/components/site/disclaimer";
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
 * The flagship guide.
 *
 * Central Florida has a large veteran population and very few genuinely useful
 * local VA pages, which is exactly the kind of narrow, answerable question a
 * small site can win (docs/08 § 1).
 *
 * The Minimum Property Requirements section is the differentiating asset of the
 * entire site: she is a licensed residential contractor and can tell a VA buyer
 * whether a roof, a sub-panel or a soffit will fail the appraisal BEFORE they
 * write an offer. No other agent page in this market can credibly say that.
 *
 * CONTENT NOTE: everything here is factual and verifiable. The first-person
 * passages marked {/* CLIENT VOICE * /} are written in her register but need a
 * 30-minute interview to replace with her real examples — docs/14 § 6.
 */

const crumbs = [
  { href: "/guides", label: "Guides" },
  { href: "/guides/va-home-buyer", label: "VA Home-Buyer Guide" },
];

const toc = [
  { id: "who-qualifies", label: "Who qualifies" },
  { id: "entitlement", label: "What entitlement means" },
  { id: "zero-down", label: "Zero down payment" },
  { id: "funding-fee", label: "The funding fee" },
  { id: "appraisal", label: "The VA appraisal" },
  { id: "mprs", label: "Minimum Property Requirements" },
  { id: "condos", label: "Condos" },
  { id: "new-construction", label: "New construction" },
  { id: "sellers", label: "Will sellers accept a VA offer?" },
  { id: "reuse", label: "Using the benefit again" },
  { id: "central-florida", label: "Buying VA in Central Florida" },
  { id: "process", label: "The process, step by step" },
  { id: "faq", label: "Common questions" },
];

const faq: FaqItem[] = [
  {
    q: "Can I use a VA loan more than once?",
    a: "Yes. VA entitlement is not a one-time benefit. Once a VA loan is paid off and the property sold, you can apply to have full entitlement restored. You can also hold two VA loans at once using remaining entitlement, which is common for service members who buy at a new duty station before selling the previous home.",
  },
  {
    q: "Do VA loans really require no down payment?",
    a: "Within your available entitlement, yes — a VA purchase can be financed at 100% of the appraised value with no down payment and no mortgage insurance. If you are buying above what your remaining entitlement covers, a down payment is required on the excess.",
  },
  {
    q: "Is there a maximum VA loan amount?",
    a: "Not for a buyer with full entitlement. VA loan limits were removed for full-entitlement borrowers in 2020. Your lender still has to approve the loan on income, credit and the appraised value — the ceiling is what you can afford, not a published cap.",
  },
  {
    q: "Does the seller have to pay my closing costs on a VA loan?",
    a: "No. There are certain fees a VA buyer is not allowed to pay, which are commonly covered by the seller or the lender, but seller-paid closing costs are negotiated in the contract like any other term.",
  },
  {
    q: "How long does a VA loan take to close in Central Florida?",
    a: "In practice, similar to a conventional loan — usually 30 to 45 days. The VA appraisal is ordered through the VA's own system rather than the lender's panel, and in a busy market that can add a few days. Building that into the contract dates avoids most of the friction.",
  },
  {
    q: "Can I buy a fixer-upper with a VA loan?",
    a: "Only within limits. The home must meet Minimum Property Requirements at the time of the appraisal, so a property needing significant repair usually cannot close on a standard VA purchase loan unless the work is completed first. This is where a contractor's read before you offer saves the most money.",
  },
  {
    q: "Do I need a termite inspection?",
    a: "In Florida, a wood-destroying organism report is standard on a VA purchase and cannot be paid for by the buyer on most transactions. Given the climate, this is not a formality — it is one of the most common sources of required repairs here.",
  },
  {
    q: "Does a VA appraisal cost more or take longer than a regular one?",
    a: "The fee is set by the VA rather than negotiated, and it is typically comparable to a conventional appraisal. The appraiser is assigned through the VA system, so you cannot choose them, and turn times vary with local demand.",
  },
  {
    q: "What is a Tidewater notice?",
    a: "If the VA appraiser is likely to come in below the contract price, they issue a Tidewater notice, giving the listing side a short window — usually two business days — to submit additional comparable sales. It is a genuine opportunity to prevent a low appraisal, but only if someone acts on it quickly.",
  },
  {
    q: "Can I use a VA loan for an investment property?",
    a: "No. A VA loan is for a primary residence you intend to occupy, generally within 60 days of closing. You can buy a property with up to four units and live in one of them, which is the closest thing to an investment use the program allows.",
  },
];

export const metadata: Metadata = buildMetadata({
  title: "VA Home-Buyer Guide for Central Florida",
  description:
    "How VA loans work in Central Florida: eligibility, entitlement, zero down, the funding fee, and the Minimum Property Requirements that quietly kill deals here.",
  path: "/guides/va-home-buyer",
  type: "article",
});

export default function VaGuidePage() {
  return (
    <>
      <JsonLd
        data={[
          articleJsonLd({
            title: "VA Home-Buyer Guide for Central Florida",
            description:
              "Eligibility, entitlement, the funding fee, the VA appraisal and the Minimum Property Requirements that matter most in Central Florida.",
            path: "/guides/va-home-buyer",
            section: "VA home loans",
            wordCount: 2400,
          }),
          serviceJsonLd({
            name: "VA home buyer representation",
            description:
              "Representation for VA-eligible buyers in Lake Mary and Central Florida, including a licensed contractor's assessment of Minimum Property Requirement risk before an offer is written.",
            path: "/guides/va-home-buyer",
            serviceType: "VA home buyer representation",
          }),
          faqJsonLd(faq),
          breadcrumbJsonLd(crumbs),
        ]}
      />

      <GuideLayout
        overline="Buyer guide"
        title="The VA home-buyer guide for Central Florida"
        lead="What the benefit actually gets you, what the appraiser is actually looking for, and the property problems that quietly end VA deals in this market."
        crumbs={crumbs}
        toc={toc}
        faq={faq}
        leadType="va"
        ctaHeading="Planning a VA purchase in Central Florida?"
        ctaDescription="Tell me the area and the price range you are working with, and I will tell you what to expect from the appraisal side before you start writing offers."
      >
        <p>
          The VA home loan is the strongest financing benefit available to a
          civilian buyer in the United States, and it is routinely misunderstood
          by everyone involved in a transaction — including agents. This guide
          covers how it works, and then spends most of its length on the part
          that actually costs VA buyers money in Central Florida: the property
          condition standards.
        </p>

        <h2 id="who-qualifies">Who qualifies for a VA loan?</h2>
        <AnswerFirst>
          Veterans, active-duty service members, certain National Guard and
          Reserve members, and some surviving spouses. Eligibility is proven with
          a Certificate of Eligibility, which your lender can usually pull in
          minutes.
        </AnswerFirst>
        <p>
          The service requirement depends on when and how you served. Broadly:
        </p>
        <ul>
          <li>
            <strong>Active duty, wartime:</strong> generally 90 continuous days.
          </li>
          <li>
            <strong>Active duty, peacetime:</strong> generally 181 continuous
            days.
          </li>
          <li>
            <strong>National Guard and Reserve:</strong> generally six years of
            service, or 90 days of active-duty service under Title 10.
          </li>
          <li>
            <strong>Surviving spouses:</strong> of a service member who died in
            the line of duty or from a service-connected disability, subject to
            remarriage rules.
          </li>
        </ul>
        <p>
          These are summaries. The VA determines eligibility, not your lender and
          certainly not your agent — the Certificate of Eligibility is the
          document that settles it.
        </p>

        <h2 id="entitlement">What entitlement actually means</h2>
        <AnswerFirst>
          Entitlement is the amount the VA guarantees to your lender if you
          default. It is not a loan amount and it is not a budget — it is the
          reason a lender will finance 100% of the price without mortgage
          insurance.
        </AnswerFirst>
        <p>
          The distinction matters because entitlement is what determines whether
          you can buy with nothing down, not how much house you can buy. A buyer
          with <strong>full entitlement</strong> has no VA-imposed loan limit;
          the ceiling is what the lender will approve on income, credit and the
          appraised value.
        </p>
        <p>
          A buyer with <strong>partial or remaining entitlement</strong> — most
          often someone who still has an active VA loan on another property, or
          who had a previous VA loan foreclosed — can still buy, but a down
          payment may be required on the amount above what the remaining
          entitlement covers.
        </p>

        <h2 id="zero-down">Do you really buy with zero down?</h2>
        <AnswerFirst>
          Within your entitlement, yes. A VA purchase can be financed at 100% of
          the appraised value, with no down payment and no monthly mortgage
          insurance.
        </AnswerFirst>
        <p>
          The absence of mortgage insurance is the part buyers underestimate. On
          a conventional loan with less than 20% down, private mortgage insurance
          is a real monthly cost that buys you nothing. A VA loan replaces it
          with a one-time funding fee that can be financed into the loan. Over
          the first several years, that difference is usually worth considerably
          more than the funding fee costs.
        </p>
        <p>
          One thing zero down does not do is remove the need for cash. You still
          need funds for the deposit, the inspection, and any costs the seller
          does not cover — and in a competitive market, a buyer with some cash
          available has options a buyer with none does not.
        </p>

        <h2 id="funding-fee">The VA funding fee</h2>
        <AnswerFirst>
          A one-time fee paid to the VA that keeps the program running without
          taxpayer subsidy. It can be financed into the loan, and a significant
          number of buyers are exempt from it entirely.
        </AnswerFirst>
        <p>
          The fee is a percentage of the loan amount, and it varies with two
          things: how much you put down, and whether this is your first use of
          the benefit. The structure in effect since April 2023:
        </p>
        <TableScroll>
          <table>
            <thead>
              <tr>
                <th>Down payment</th>
                <th>First use</th>
                <th>Subsequent use</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Less than 5%</td>
                <td>2.15%</td>
                <td>3.30%</td>
              </tr>
              <tr>
                <td>5% to 9.99%</td>
                <td>1.50%</td>
                <td>1.50%</td>
              </tr>
              <tr>
                <td>10% or more</td>
                <td>1.25%</td>
                <td>1.25%</td>
              </tr>
            </tbody>
          </table>
        </TableScroll>
        <p>
          Note what the table shows: putting 5% down cuts the fee substantially,
          and on a repeat use it more than halves it. That is a calculation worth
          running rather than assuming zero down is always the right answer.
        </p>
        <Callout title="You may be exempt" tone="accent">
          <p>
            The funding fee is waived for veterans receiving compensation for a
            service-connected disability, for those who would be entitled to it
            but receive retirement or active-duty pay instead, for surviving
            spouses of veterans who died in service or from a service-connected
            disability, and for active-duty Purple Heart recipients.
          </p>
          <p>
            If you are exempt and the fee is charged anyway, it is refundable —
            but chasing a refund after closing is far worse than getting it right
            beforehand. Confirm your exemption status in writing with your lender
            before the closing disclosure is issued.
          </p>
        </Callout>
        <p>
          Percentages and exemption rules are set by the VA and do change.
          Confirm the current figures with your lender rather than relying on any
          website, this one included.
        </p>

        <h2 id="appraisal">What the VA appraisal is actually doing</h2>
        <AnswerFirst>
          Two jobs at once: establishing the property&rsquo;s value, and
          confirming it meets the VA&rsquo;s Minimum Property Requirements. The
          second job is what surprises people.
        </AnswerFirst>
        <p>
          A conventional appraisal is a valuation. A VA appraisal is a valuation
          plus a condition screen, performed by an appraiser assigned through the
          VA&rsquo;s own system rather than chosen by the lender. The result is a
          Notice of Value, and it can come with conditions that must be satisfied
          before the loan can close.
        </p>
        <p>
          If the value is likely to come in below the contract price, the
          appraiser issues a <strong>Tidewater</strong> notice first, giving the
          listing side a short window to provide supporting comparable sales.
          That window is genuinely useful — but only if the agents on both sides
          know what it is and respond inside it.
        </p>

        <h2 id="mprs">Minimum Property Requirements: what actually fails</h2>
        <AnswerFirst>
          MPRs exist to confirm a home is safe, structurally sound and sanitary.
          In Central Florida, a small number of them account for most of the
          repair conditions I see — and every one of them is visible before you
          write an offer if you know to look.
        </AnswerFirst>
        <p>
          This is the section worth reading twice. A VA buyer who loses an
          appraisal to a condition issue has usually already paid for an
          inspection, spent two weeks under contract, and lost their place in a
          moving market. The fix is not a better appraiser — it is knowing what
          the appraiser will flag before you commit.
        </p>

        <h3>Roof condition and remaining life</h3>
        <p>
          The most common single issue. The VA does not publish a hard age limit,
          but an appraiser is looking for a roof that will remain serviceable for
          a reasonable period and is free of active leaks. In this climate,
          asphalt shingle roofs age faster than in most of the country. A roof
          near the end of its life is also, separately, an insurance problem in
          Florida — many carriers will not write a new policy on an older roof at
          all, which can end a purchase even if the VA is satisfied.
        </p>

        <h3>Wood-destroying organisms</h3>
        <p>
          Florida requires a wood-destroying organism report on VA purchases, and
          the cost generally cannot be charged to the buyer. Subterranean termite
          activity is common here. Evidence of active infestation, or of past
          damage that was never repaired, will produce a condition.
        </p>

        <h3>Standing water, drainage and grading</h3>
        <p>
          Water must drain away from the foundation. Chronic ponding beside a
          slab, a downspout discharging against the house, or a negative grade in
          a side yard are all things an appraiser can and does note — and all
          things you can see on a first walkthrough if you look down instead of
          at the kitchen.
        </p>

        <h3>Peeling paint on pre-1978 homes</h3>
        <p>
          Lead-based paint was banned in 1978. On any home built before then,
          defective or peeling paint — inside, outside, on the soffit, on a
          detached garage — must be remediated. Central Florida has plenty of
          pre-1978 inventory, particularly in older parts of Sanford, Longwood
          and Orlando.
        </p>

        <h3>Mechanical systems that work</h3>
        <p>
          Heating must be adequate and functional. Electrical and plumbing must
          be safe and operational. Exposed wiring, an open junction box, a
          non-functioning water heater, or a panel brand with a known safety
          history will all draw attention.
        </p>

        <h3>Access, egress and the envelope</h3>
        <p>
          The property needs safe, permanent access from a public or private
          street. Crawl spaces and attics need access and adequate ventilation.
          Broken windows, missing handrails on stairs, and unsafe decking are
          straightforward failures.
        </p>

        {/* CLIENT VOICE — replace with her real examples after the interview */}
        <Callout title="Where the contractor licence earns its keep" tone="accent">
          <p>
            I hold a Certified Residential Building Contractor licence (
            {siteConfig.licenses.contractor.number}) alongside my real estate
            licence. On a VA purchase that means I can walk a property with you
            before you write and give you a straight read on the items above —
            the age and condition of the roof, whether the grading is moving
            water the wrong way, what the panel and the visible plumbing suggest
            about the last work done on the house.
          </p>
          <p>
            That is not a home inspection and it does not replace one. It is a
            filter applied at the right moment: before you spend money and before
            you lose two weeks discovering something that was visible on day one.
          </p>
        </Callout>

        <h2 id="condos">Can you buy a condo with a VA loan?</h2>
        <AnswerFirst>
          Only if the condominium project is on the VA&rsquo;s approved list. The
          unit qualifying is not enough — the whole association has to be
          approved.
        </AnswerFirst>
        <p>
          This catches Central Florida buyers regularly, because a lot of
          attractive inventory in Altamonte Springs, Casselberry and parts of
          Orlando is condominium. Approval status is searchable on the VA&rsquo;s
          portal, and a project can be approved, expired, or never submitted.
        </p>
        <p>
          A project can be submitted for approval, but the timeline is measured
          in months and depends entirely on the association&rsquo;s cooperation.
          It is not a realistic path inside a normal contract period. Check
          approval status before you tour, not after you fall in love with a
          unit.
        </p>

        <h2 id="new-construction">Using a VA loan on new construction</h2>
        <AnswerFirst>
          Yes, with conditions. The builder must be registered with the VA and
          have a valid builder ID, and the home must still pass a VA appraisal
          against the same Minimum Property Requirements.
        </AnswerFirst>
        <p>
          Buying new with a VA loan is common in Seminole County, where there is
          active construction across Sanford, Oviedo and the Lake Mary corridor.
          The practical issues are usually not VA rules but builder process:
          lender incentives tied to the builder&rsquo;s preferred lender,
          contract terms that heavily favour the builder, and the fact that the
          agent in the model home works for the builder.
        </p>
        <p>
          If you are considering a new build, read the{" "}
          <Link href="/new-construction-representation">
            new-construction representation guide
          </Link>{" "}
          before your first site visit. Registering your own agent afterwards is
          usually not possible.
        </p>

        <h2 id="sellers">Will a seller accept a VA offer?</h2>
        <AnswerFirst>
          Yes — and the resistance you hear about is mostly folklore from the
          1990s. What kills VA offers today is a weak offer, not the loan type.
        </AnswerFirst>
        <p>
          The persistent myths are that VA loans are slow, that the appraisal is
          harsher, and that the seller ends up paying for everything. In practice
          a VA purchase closes in a comparable window to a conventional one, the
          appraisal adds a condition screen rather than a stricter valuation, and
          the fees a buyer cannot pay are a short list that is negotiated like
          any other term.
        </p>
        <p>What actually makes a VA offer competitive:</p>
        <ul>
          <li>
            A full lender pre-approval, not a pre-qualification, from a lender
            with genuine VA volume.
          </li>
          <li>
            Realistic dates. Building the VA appraisal timeline into the contract
            rather than promising a schedule you cannot hold.
          </li>
          <li>
            A listing agent who has been told, in advance, how the process
            actually runs — most of the resistance is uncertainty, not
            preference.
          </li>
          <li>
            Choosing properties that will pass. This is the quiet one, and it is
            most of the battle.
          </li>
        </ul>

        <h2 id="reuse">Using the benefit more than once</h2>
        <AnswerFirst>
          The VA benefit is not a one-time entitlement. It can be restored after
          a VA loan is paid off, and in some circumstances you can hold two VA
          loans at the same time.
        </AnswerFirst>
        <p>
          <strong>Restoration</strong> applies when the prior VA loan is paid in
          full and the property is sold. Entitlement returns and you buy again as
          if it were the first time — though the funding fee moves to the
          subsequent-use rate unless you are exempt or put 5% or more down.
        </p>
        <p>
          <strong>Second-tier entitlement</strong> lets a buyer keep an existing
          VA-financed home and purchase another with the remaining entitlement.
          It is used most often on a permanent change of station. The maths is
          specific to your situation and your lender should run it before you
          start looking.
        </p>
        <p>
          There is also <strong>entitlement substitution</strong>: another
          VA-eligible buyer assuming your loan and substituting their entitlement
          for yours, releasing yours entirely. That matters if you ever sell a
          home carrying a low-rate VA loan — see the{" "}
          <Link href="/assumable-mortgage-homes">assumable mortgage guide</Link>.
        </p>

        <h2 id="central-florida">Buying VA in Central Florida specifically</h2>
        <AnswerFirst>
          Two local factors shape a VA purchase here more than anything in the
          VA&rsquo;s own rules: roof age and its effect on insurability, and
          HOA-heavy inventory.
        </AnswerFirst>
        <p>
          <strong>Insurance is the constraint people do not plan for.</strong>{" "}
          The Florida market has tightened considerably, and roof age is the
          single biggest factor in whether a policy can be bound at all. A home
          can satisfy the VA and still be effectively unbuyable because no
          carrier will write it. Get an insurance quote early — in parallel with
          the inspection, not after it.
        </p>
        <p>
          <strong>HOA fees change what you can afford.</strong> Much of the
          newer inventory across Lake Mary, Oviedo and Winter Springs carries an
          association fee, and it counts in your debt-to-income calculation. Two
          homes at the same price can approve very differently.
        </p>
        <p>
          <strong>Where VA buyers tend to do well here:</strong> newer
          construction in Sanford and Oviedo, which clears the roof and MPR
          questions cleanly; townhomes near the SunRail corridor; and
          well-maintained 1990s and 2000s single-family inventory in Lake Mary
          and Longwood where the roof and systems have already been updated once.
        </p>

        <h2 id="process">The process, step by step</h2>
        <ol>
          <li>
            <strong>Get your Certificate of Eligibility.</strong> Your lender can
            usually pull it electronically the same day.
          </li>
          <li>
            <strong>Get fully pre-approved</strong> by a lender that closes VA
            loans regularly. Volume matters more than rate at this stage.
          </li>
          <li>
            <strong>Set a realistic budget</strong> including HOA fees, taxes and
            an insurance estimate — not just principal and interest.
          </li>
          <li>
            <strong>Tour with MPRs in mind.</strong> Roof, drainage, panel,
            visible plumbing, paint condition on older homes.
          </li>
          <li>
            <strong>Write the offer</strong> with dates that accommodate the VA
            appraisal, and with the fee allocation handled explicitly.
          </li>
          <li>
            <strong>Inspection and WDO report.</strong> Both, always, regardless
            of how new the home is.
          </li>
          <li>
            <strong>VA appraisal.</strong> Ordered through the VA system. Watch
            for a Tidewater notice and respond inside the window.
          </li>
          <li>
            <strong>Resolve any conditions</strong> on the Notice of Value.
          </li>
          <li>
            <strong>Clear to close, then close.</strong> Occupancy is generally
            expected within 60 days.
          </li>
        </ol>

        <Disclaimer type="lending" />
      </GuideLayout>
    </>
  );
}
