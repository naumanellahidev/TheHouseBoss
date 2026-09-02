import type { Metadata } from "next";
import Link from "next/link";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section } from "@/components/site/container";
import { Prose } from "@/components/site/prose";
import { legalMetadata } from "@/lib/seo/metadata";
import { isPending, siteConfig } from "@/lib/site-config";

/**
 * `/legal/privacy` — docs/09 § 5.
 *
 * "Accuracy is the requirement, not length." Every processor named here is one
 * the site actually uses, and every category of data listed is one actually
 * collected. When a processor is added or removed, this page changes with it.
 */
const LAST_UPDATED = "3 September 2026";

export const metadata: Metadata = legalMetadata(
  "Privacy Policy",
  "What this site collects, why, who processes it, how long it is kept, and how to have it deleted.",
  "/legal/privacy",
);

export default function PrivacyPage() {
  const email = isPending(siteConfig.contact.email) ? null : siteConfig.contact.email;
  const crumbs = [{ href: "/legal/privacy", label: "Privacy Policy" }];

  return (
    <Section>
      <Container className="flex flex-col gap-6">
        <Breadcrumbs items={crumbs} />
        <h1 className="text-h1">Privacy policy</h1>

        <Prose>
          <p>
            <strong>Last updated: {LAST_UPDATED}.</strong> This policy covers{" "}
            {siteConfig.url.replace(/^https?:\/\//, "")}, operated by{" "}
            {siteConfig.legalName} of {siteConfig.brokerage}.
          </p>

          <h2>What we collect</h2>
          <p>Only what you give us, plus the minimum needed to run the site.</p>
          <ul>
            <li>
              <strong>When you submit a form:</strong> your name, email address,
              phone number if you give one, your message, which page you
              submitted from, and any campaign parameters in the link you
              arrived by.
            </li>
            <li>
              <strong>Automatically:</strong> your IP address, used to rate-limit
              form submissions so the forms cannot be abused. It is not used to
              build a profile of you.
            </li>
            <li>
              <strong>We do not collect:</strong> payment details, government
              identifiers, or any financial information. Nothing on this site
              asks for them, and no page here should ever ask you for a bank
              detail or a Social Security number — if one appears to, it is not us.
            </li>
          </ul>

          <h2>Why we collect it</h2>
          <p>
            To reply to you, and to send you the listing alerts you asked for if
            you asked for them. That is the whole list. We do not sell your
            information, and we do not share it for anyone else&rsquo;s
            marketing.
          </p>

          <h2>Who processes it</h2>
          <p>
            These companies process data on our behalf in order to run the site.
            Each is bound by its own agreement with us.
          </p>
          <ul>
            <li>
              <strong>Supabase</strong> — database and file storage. Your
              enquiry is stored here.
            </li>
            <li>
              <strong>Vercel</strong> — hosting. Handles the requests that serve
              these pages.
            </li>
            <li>
              <strong>Resend</strong> — email delivery. Sends the notification
              to us and the confirmation to you.
            </li>
          </ul>
          <p>
            We will also disclose information where the law requires it. If we
            add another processor, this list changes at the same time.
          </p>

          <h2>Cookies and analytics</h2>
          <p>
            This site sets no advertising cookies and runs no third-party
            advertising trackers. A single cookie is used to keep the site
            administrator signed in to the private dashboard; it is not set for
            ordinary visitors.
          </p>
          <p>
            We measure how the site is used with Vercel Web Analytics and Vercel
            Speed Insights. Neither sets a cookie and neither assigns you an
            identifier, so you are not followed between visits or across other
            websites. What is recorded is the page you viewed, the site that
            linked you to it, your country, your device type, and how quickly the
            page loaded for you. That is why you are not asked to accept cookies
            when you arrive.
          </p>

          <h2>How long we keep it</h2>
          <p>
            Enquiries are kept for as long as they are useful for the
            relationship, and reviewed periodically. Listing-alert subscriptions
            are kept until you unsubscribe. Ask us to delete something and we
            will, unless a specific legal or regulatory obligation requires us to
            keep it — Florida real estate record-keeping rules apply to
            transaction documents.
          </p>

          <h2>Email you receive from us</h2>
          <p>
            A reply to your enquiry is not marketing and has no unsubscribe link
            — it is a reply. Listing alerts are different: you only receive them
            if you confirm the subscription by clicking a link we email you, every
            one carries a working unsubscribe link and our postal address, and
            unsubscribing takes effect immediately.
          </p>

          <h2>Your choices</h2>
          <ul>
            <li>Ask us what we hold about you.</li>
            <li>Ask us to correct it.</li>
            <li>Ask us to delete it.</li>
            <li>Unsubscribe from any alert at any time.</li>
          </ul>
          <p>
            {email ? (
              <>
                Email <a href={`mailto:${email}?subject=Privacy`}>{email}</a> or
                use the <Link href="/contact">contact form</Link>. We will reply
                within thirty days and usually much sooner.
              </>
            ) : (
              <>
                Use the <Link href="/contact">contact form</Link>. We will reply
                within thirty days and usually much sooner.
              </>
            )}
          </p>

          <h2>Children</h2>
          <p>
            This site is not directed at children under 13 and we do not
            knowingly collect their information.
          </p>

          <h2>Changes</h2>
          <p>
            If this policy changes materially, the date at the top changes with
            it and the change is described here.
          </p>
        </Prose>
      </Container>
    </Section>
  );
}
