import Link from "next/link";
import { Mail, Phone } from "lucide-react";

import { LeadForm } from "@/components/site/lead-form";
import { Button } from "@/components/ui/button";
import { isPending, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * The contact card on a listing page — docs/05, section 9.
 *
 * Sticky in the right column from 1024px, `top: header + 24px`, and it scrolls
 * internally rather than growing past the viewport (docs/04 § 5).
 *
 * It names the brokerage as well as the agent: a page presenting her as
 * representing a buyer or seller carries the disclosure (docs/09 § 1).
 *
 * A PENDING phone or email is HIDDEN rather than rendered as a placeholder —
 * a dead `tel:` link is worse than no link at all.
 */
export function AgentCard({
  listingId,
  soldOut = false,
  className,
}: {
  listingId?: string;
  /** A sold listing offers "something similar" instead of a showing. */
  soldOut?: boolean;
  className?: string;
}) {
  const phone = isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone;
  const email = isPending(siteConfig.contact.email) ? null : siteConfig.contact.email;

  return (
    <div
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-sm md:p-6",
        className,
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-h4 font-semibold text-foreground">
          {siteConfig.legalName}
        </p>
        <p className="text-sm text-foreground-muted">
          Realtor &amp; Certified Residential Building Contractor
        </p>
        {/* FREC: the brokerage is named wherever she is presented as
            representing a party. The size rule itself is enforced by
            <ComplianceFooter />, which is on every page. */}
        <p className="text-sm font-medium text-foreground">
          {siteConfig.brokerage}
        </p>
        <p className="text-xs text-foreground-subtle">
          {siteConfig.licenses.realEstate.number} ·{" "}
          {siteConfig.licenses.contractor.number}
        </p>
      </div>

      {phone || email ? (
        <div className="flex flex-col gap-2">
          {phone ? (
            <Button asChild variant="primary" block>
              <a href={siteConfig.contact.phoneHref || `tel:${phone.replace(/[^\d+]/g, "")}`}>
                <Phone aria-hidden="true" />
                {phone}
              </a>
            </Button>
          ) : null}
          {email ? (
            <Button asChild variant="outline" block>
              <a href={`mailto:${email}`}>
                <Mail aria-hidden="true" />
                Email Krisi
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      {soldOut ? (
        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <p className="text-sm text-foreground-muted">
            This home has sold. If it was the sort of property you are looking
            for, tell me what you liked and I will send you what comes up next.
          </p>
          <Button asChild variant="accent" block>
            <Link href="/contact?interest=listing_inquiry">
              Find me something similar
            </Link>
          </Button>
        </div>
      ) : (
        <div className="border-t border-border pt-4">
          <LeadForm
            leadType="showing_request"
            listingId={listingId}
            heading="Request a showing"
            description="Tell me when suits and I will confirm by the end of the day."
            compact
            showInterest={false}
            submitLabel="Request a showing"
            className="border-0 p-0 shadow-none"
          />
        </div>
      )}
    </div>
  );
}
