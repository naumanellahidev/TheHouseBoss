import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { Prose } from "@/components/site/prose";
import { legalMetadata } from "@/lib/seo/metadata";
import { isPending, siteConfig } from "@/lib/site-config";

/**
 * `/legal/accessibility` — docs/09 § 3.
 *
 * "A genuine, dated statement with a working contact route is both the right
 * thing and meaningful mitigation. A copy-pasted statement that nobody honors
 * is worse than none."
 *
 * So everything claimed here is something the build actually does, and the
 * known limitations are stated rather than omitted. LAST_REVIEWED must be
 * updated whenever this page is revisited — a statement dated two years ago
 * says more about the site than the statement itself does.
 */
const LAST_REVIEWED = "2 September 2026";

export const metadata: Metadata = legalMetadata(
  "Accessibility Statement",
  "Our accessibility commitment, what has been done, the known limitations, and how to report a barrier. Target: WCAG 2.1 Level AA.",
  "/legal/accessibility",
);

export default function AccessibilityPage() {
  const email = isPending(siteConfig.contact.email) ? null : siteConfig.contact.email;
  const phone = isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone;
  const crumbs = [{ href: "/legal/accessibility", label: "Accessibility" }];

  return (
    <Section>
      <Container className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-h1">Accessibility statement</h1>

        <Prose>
          <p>
            <strong>Last reviewed: {LAST_REVIEWED}.</strong>
          </p>

          <h2>Our commitment</h2>
          <p>
            This site is built to meet{" "}
            <strong>Web Content Accessibility Guidelines (WCAG) 2.1, Level AA</strong>.
            Finding a home is not an optional activity, and a property website
            that only some people can use is not doing its job.
          </p>

          <h2>What has been done</h2>
          <ul>
            <li>
              <strong>Semantic HTML.</strong> Headings describe the real
              structure of each page, there is exactly one level-one heading per
              page, and landmarks are used so a screen reader can skip to the
              main content.
            </li>
            <li>
              <strong>Keyboard operability.</strong> Everything that can be
              done with a mouse can be done with a keyboard, including the photo
              gallery, the search filters and the mobile menu. Focus is always
              visible, focus is trapped inside dialogs while they are open, and
              it returns to where it came from when they close.
            </li>
            <li>
              <strong>Colour contrast.</strong> Every text and interface colour
              pairing is checked against the WCAG AA thresholds by an automated
              script that reads the real colour values, and the build fails if
              any pairing falls below them. Colour is never the only way
              information is conveyed.
            </li>
            <li>
              <strong>Alternative text.</strong> Every listing photograph
              requires a description before the listing can be published — this
              is enforced by the publishing system, not left to memory.
            </li>
            <li>
              <strong>Reduced motion.</strong> Animation is minimal, and it is
              switched off entirely for anyone whose device asks for reduced
              motion.
            </li>
            <li>
              <strong>Text and zoom.</strong> Body text is never below 16px,
              form fields are at least 44 by 44 pixels, and pages reflow without
              horizontal scrolling down to a 360-pixel-wide screen and at 200%
              zoom.
            </li>
            <li>
              <strong>Testing.</strong> Automated accessibility checks run
              against every public page at nine screen widths as part of the
              build, alongside manual keyboard testing.
            </li>
          </ul>

          <h2>Known limitations</h2>
          <p>
            Stated plainly, because a statement that claims perfection is not
            credible:
          </p>
          <ul>
            <li>
              Automated testing catches roughly a third of real accessibility
              problems. Manual review covers more, but not everything.
            </li>
            <li>
              Screen-reader testing has been done with a subset of
              browser and screen-reader combinations, not all of them.
            </li>
            <li>
              Property photographs are described by a person. Descriptions are
              required, but their quality varies with how much detail the
              photograph warrants.
            </li>
            <li>
              Any third-party content embedded in future — a mapping service,
              for example — is outside our direct control. Where that happens we
              will provide the same information in an accessible form alongside
              it.
            </li>
          </ul>

          <h2>Telling us about a problem</h2>
          <p>
            If any part of this site is difficult or impossible for you to use,
            please tell us. It will be treated as a defect, not as feedback.
          </p>
          <ul>
            {email ? (
              <li>
                Email:{" "}
                <a href={`mailto:${email}?subject=Accessibility`}>{email}</a>
              </li>
            ) : null}
            {phone ? (
              <li>
                Phone: <a href={`tel:${phone.replace(/[^\d+]/g, "")}`}>{phone}</a>
              </li>
            ) : null}
            <li>
              Or use the <Link href="/contact">contact form</Link>.
            </li>
          </ul>
          <p>
            <strong>We will acknowledge your report within two business days</strong>{" "}
            and tell you what we intend to do about it and when. If we cannot
            fix something quickly, we will offer another way to get you the
            information you were trying to reach.
          </p>

          <h2>Fair housing</h2>
          <p>
            {siteConfig.legalName} and {siteConfig.brokerage} support the Fair
            Housing Act and the Equal Opportunity Act. We do not discriminate on
            the basis of race, colour, religion, sex, familial status, national
            origin, disability, or any other class protected by federal, state
            or local law.
          </p>
        </Prose>
      </Container>
    </Section>
  );
}
