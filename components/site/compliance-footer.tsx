import { siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";

/**
 * ============================================================================
 * FLORIDA ADVERTISING DISCLOSURE — LEGALLY REQUIRED ON EVERY PUBLIC PAGE
 * ============================================================================
 *
 * FREC rule 61J2-10.026: the registered brokerage name must appear at least as
 * prominently as the team or individual licensee name.
 *
 * BROKERAGE_CLASS must therefore be >= NAME_CLASS in font size AND weight.
 * DO NOT CHANGE THESE TWO CONSTANTS WITHOUT BROKER APPROVAL.
 *
 * This component is the ONLY place the licence numbers may be rendered in page
 * chrome. Never re-implement it inline — CLAUDE.md hard rule 16, checked by the
 * phase-review skill.
 *
 * Reference: docs/09-compliance-legal.md § 1
 * ============================================================================
 */

const NAME_CLASS = "text-sm font-medium";
const BROKERAGE_CLASS = "text-base font-semibold";

/** Equal Housing Opportunity mark. Meaningful, not decorative. */
function EqualHousingMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={cn("size-9 shrink-0", className)}
      role="img"
      aria-label="Equal Housing Opportunity"
    >
      <path
        d="M24 8 4 23h5v17h30V23h5L24 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <rect x="15" y="27" width="18" height="3" fill="currentColor" />
      <rect x="15" y="33" width="18" height="3" fill="currentColor" />
    </svg>
  );
}

export function ComplianceFooter({ className }: { className?: string }) {
  const { licenses, legalName, brokerage, name } = siteConfig;

  return (
    <div
      className={cn("bg-ink-950 text-foreground-invert-muted", className)}
      data-compliance-footer=""
    >
      <div className="container-page flex flex-col gap-6 py-8 md:flex-row md:items-start md:justify-between">
        {/* ── Licensee disclosure ─────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          {/* Brokerage first and largest — FREC prominence requirement */}
          <p className={cn(BROKERAGE_CLASS, "text-foreground-invert")}>
            {brokerage}
          </p>

          <p className={cn(NAME_CLASS, "text-foreground-invert-muted")}>
            {legalName} · {name}
          </p>

          <ul className="flex flex-col gap-1 text-xs text-foreground-invert-muted sm:flex-row sm:flex-wrap sm:gap-x-4">
            <li>
              {licenses.realEstate.label}{" "}
              <span className="tabular">{licenses.realEstate.number}</span>
            </li>
            <li>
              {licenses.contractor.label}{" "}
              <span className="tabular">{licenses.contractor.number}</span>
            </li>
          </ul>
        </div>

        {/* ── Fair Housing ────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 text-foreground-invert-muted">
          <EqualHousingMark />
          <div className="flex flex-col text-xs leading-snug">
            <span className="font-semibold text-foreground-invert">
              Equal Housing Opportunity
            </span>
            <span>
              We support the Fair Housing Act and the Equal Opportunity Act.
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-ink-800">
        <div className="container-page flex flex-col gap-2 py-5 text-xs leading-relaxed">
          <p>
            All information is deemed reliable but is not guaranteed and should
            be independently verified. Property details, availability and
            pricing are subject to change without notice.
          </p>
          <p>
            &copy; {new Date().getFullYear()} {name}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
