import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { Prose } from "@/components/site/prose";
import { legalMetadata } from "@/lib/seo/metadata";
import { siteConfig } from "@/lib/site-config";

/**
 * `/legal/terms` — docs/09 § 9.
 *
 * The substantive part is section 3: what she is licensed to advise on and what
 * she is not. docs/09 § 6 lists lending, legal and tax advice, and guarantees of
 * price or outcome, as things she may not give — this page says so in one place
 * rather than relying on each guide's disclaimer alone.
 */
const LAST_UPDATED = "2 September 2026";

export const metadata: Metadata = legalMetadata(
  "Terms of Use",
  "The terms that apply to using this website, what the information here is and is not, and the licences under which it is published.",
  "/legal/terms",
);

export default function TermsPage() {
  const crumbs = [{ href: "/legal/terms", label: "Terms of Use" }];

  return (
    <Section>
      <Container className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-h1">Terms of use</h1>

        <Prose>
          <p>
            <strong>Last updated: {LAST_UPDATED}.</strong> By using this site you
            agree to these terms. If you do not, please do not use it.
          </p>

          <h2>1. Who we are</h2>
          <p>
            This site is operated by {siteConfig.legalName}, a licensed Florida
            real estate agent (licence{" "}
            {siteConfig.licenses.realEstate.number}) and Certified Residential
            Building Contractor (licence{" "}
            {siteConfig.licenses.contractor.number}), trading as{" "}
            {siteConfig.name} under the brokerage {siteConfig.brokerage}.
          </p>

          <h2>2. Property information</h2>
          <p>
            Listing information is believed accurate at the time of publication
            and is not guaranteed. Prices, availability and property details
            change, sometimes quickly. Measurements and lot sizes are
            approximate. Nothing here is an offer or a binding commitment, and
            you should verify anything you intend to rely on — square footage,
            school assignment, permitted use, HOA obligations — independently
            before you act.
          </p>
          <p>
            Sold listings are kept published as a record of completed
            transactions. They are historical, and the price shown was correct
            on the date shown.
          </p>

          <h2>3. What the advice here is, and is not</h2>
          <p>
            {siteConfig.legalName} is licensed to advise on real estate and, as a
            Certified Residential Building Contractor, on residential
            construction. She is <strong>not</strong> a mortgage lender, an
            attorney, a tax adviser, a licensed home inspector or an engineer.
          </p>
          <p>Specifically, nothing on this site is:</p>
          <ul>
            <li>
              <strong>Lending advice.</strong> Loan eligibility, terms and rates
              are determined by your lender and, for VA loans, by the U.S.
              Department of Veterans Affairs.
            </li>
            <li>
              <strong>Legal advice.</strong> Contracts, title and disclosure
              questions should be reviewed by a Florida real estate attorney.
            </li>
            <li>
              <strong>Tax advice.</strong> Talk to a CPA about how anything here
              applies to you.
            </li>
            <li>
              <strong>A guarantee.</strong> No sale price, timeline, appraisal
              outcome or loan approval is promised anywhere on this site.
            </li>
            <li>
              <strong>A home inspection.</strong> Construction observations are
              based on visual inspection and experience. They do not replace a
              licensed home inspection, a four-point inspection or an
              engineer&rsquo;s report.
            </li>
          </ul>

          <h2>4. Fair housing</h2>
          <p>
            We comply with the Fair Housing Act and all applicable state and
            local fair housing laws. All properties are offered without regard
            to race, colour, religion, sex, familial status, national origin,
            disability, or any other protected class. Property descriptions
            describe the property, never the intended occupant.
          </p>

          <h2>5. Your use of the site</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              Use the contact forms to send unsolicited commercial messages.
            </li>
            <li>
              Scrape or bulk-copy listing content for republication as your own.
            </li>
            <li>
              Attempt to gain access to the administrative area or to any data
              you are not entitled to.
            </li>
            <li>Interfere with the site&rsquo;s operation or security.</li>
          </ul>
          <p>
            Reading, quoting with attribution, and linking to these pages are all
            welcome — including by AI assistants and search engines. The site is
            written to be quoted accurately.
          </p>

          <h2>6. Intellectual property</h2>
          <p>
            The written content, photographs and design of this site belong to{" "}
            {siteConfig.legalName} or are used with permission.
          </p>
          <p>
            {/*
              Stated without the ® glyph deliberately. The mark is a registered
              collective membership mark that only NAR members may use, and
              whether that applies here is still an open question (docs/09 § 2).
              Until it is answered, the site does not use it, and says so.
            */}
            REALTOR is a registered collective membership mark owned by the
            National Association of REALTORS and may be used only by its
            members. It is not used on this site.
          </p>

          <h2>7. Links to other sites</h2>
          <p>
            Where we link elsewhere, we do not control that site and are not
            responsible for its content or its privacy practices.
          </p>

          <h2>8. Limitation of liability</h2>
          <p>
            This site is provided as-is. To the fullest extent Florida law
            allows, we are not liable for any loss arising from your use of it or
            from reliance on information published here that you have not
            independently verified. Nothing in these terms limits any liability
            that cannot lawfully be limited.
          </p>

          <h2>9. Governing law</h2>
          <p>
            These terms are governed by the laws of the State of Florida.
          </p>

          <h2>10. Contact</h2>
          <p>
            Questions about these terms: use the{" "}
            <Link href="/contact">contact form</Link>. Our{" "}
            <Link href="/legal/privacy">privacy policy</Link> and{" "}
            <Link href="/legal/accessibility">accessibility statement</Link> are
            separate pages.
          </p>
        </Prose>
      </Container>
    </Section>
  );
}
