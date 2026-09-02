import { Info } from "lucide-react";

import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * Required disclaimers — docs/09-compliance-legal.md § 6.
 *
 * She is a licensed Realtor and a licensed residential contractor. She may
 * advise on real estate and on construction. She may NOT give lending, legal or
 * tax advice, or guarantee an outcome.
 *
 * Defined once so the wording cannot drift between pages. Placement per page is
 * in the table in docs/09 § 6:
 *
 *   lending   → /guides/va-home-buyer, /assumable-mortgage-homes
 *   legal     → /assumable-mortgage-homes, /new-construction-representation
 *   estimate  → /sell-your-central-florida-home, /market-updates/*
 *   tax       → wherever tax treatment is discussed
 */

const TEXT = {
  lending: `This is general education, not lending advice. ${siteConfig.legalName} is a licensed real estate agent, not a mortgage lender. Loan eligibility, terms and rates are determined by your lender and, for VA loans, by the U.S. Department of Veterans Affairs.`,

  legal: `This is general information, not legal advice. Contracts, title and disclosure questions should be reviewed by a Florida real estate attorney before you sign.`,

  tax: `This is general information, not tax advice. Talk to a CPA about how any of this applies to your situation.`,

  estimate: `Any figures here are estimates based on current market information and the condition of the property as described. They are not an appraisal, not a guarantee of sale price, and not a guarantee of timeline.`,

  construction: `Construction observations are based on visual inspection and ${siteConfig.legalName}'s experience as a Certified Residential Building Contractor (${siteConfig.licenses.contractor.number}). They do not replace a licensed home inspection, a four-point inspection, or an engineer's report.`,
} as const;

export type DisclaimerType = keyof typeof TEXT;

export function Disclaimer({
  type,
  className,
}: {
  type: DisclaimerType | DisclaimerType[];
  className?: string;
}) {
  const types = Array.isArray(type) ? type : [type];

  return (
    <aside
      className={cn(
        "my-8 flex gap-3 rounded-lg border border-border bg-surface-sunken p-4 md:p-5",
        className,
      )}
    >
      <Info
        className="mt-0.5 size-4 shrink-0 text-foreground-subtle"
        aria-hidden="true"
      />
      <div className="flex flex-col gap-2 text-xs leading-relaxed text-foreground-muted">
        {types.map((t) => (
          <p key={t}>{TEXT[t]}</p>
        ))}
      </div>
    </aside>
  );
}

/**
 * The honest version of "will this get me into ChatGPT?".
 *
 * Used wherever the AI-visibility claim is made, because nobody can guarantee
 * an assistant recommends a specific agent — docs/08 § 1.
 */
export function NoGuaranteeNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-xs text-foreground-subtle", className)}>
      Information on this site is provided for general guidance and is believed
      accurate at the time of writing. Verify anything you intend to rely on.
    </p>
  );
}
