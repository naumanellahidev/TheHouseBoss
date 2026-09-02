import * as React from "react";
import { HardHat } from "lucide-react";

import { formatBaths, formatNumber, formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types/domain";

/**
 * Key facts, features and the Contractor's Take.
 *
 * All three are small enough that separate files would cost more to follow
 * than they save; what they share is that each hides itself when it has
 * nothing to say, rather than rendering an empty heading.
 */

const PROPERTY_LABELS: Record<string, string> = {
  single_family: "Single family",
  townhouse: "Townhouse",
  condo: "Condo",
  villa: "Villa",
  multi_family: "Multi-family",
  land: "Land",
  manufactured: "Manufactured",
};

/** 2x2 on mobile, 4 across from 768px (docs/04 § 4). */
export function KeyFacts({ listing }: { listing: Listing }) {
  const facts: { label: string; value: string }[] = [
    listing.beds != null ? { label: "Beds", value: String(listing.beds) } : null,
    listing.baths != null
      ? {
          label: "Baths",
          value:
            listing.halfBaths > 0
              ? `${formatBaths(listing.baths)} + ${listing.halfBaths} half`
              : formatBaths(listing.baths),
        }
      : null,
    listing.sqft != null
      ? { label: "Living area", value: `${formatNumber(listing.sqft)} sq ft` }
      : null,
    listing.lotSize != null
      ? { label: "Lot", value: `${listing.lotSize} acres` }
      : null,
    listing.yearBuilt != null
      ? { label: "Year built", value: String(listing.yearBuilt) }
      : null,
    { label: "Type", value: PROPERTY_LABELS[listing.propertyType] ?? listing.propertyType },
    listing.garageSpaces > 0
      ? { label: "Garage", value: `${listing.garageSpaces} spaces` }
      : null,
    listing.hoaFee != null
      ? { label: "HOA", value: `${formatPrice(listing.hoaFee)}/mo` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  if (facts.length === 0) return null;

  return (
    <dl className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
      {facts.map((fact) => (
        <div
          key={fact.label}
          className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4 shadow-xs"
        >
          <dt className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
            {fact.label}
          </dt>
          <dd className="text-h4 font-semibold text-foreground tabular">
            {fact.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** 2 columns on mobile, 3 on desktop; collapsed after 8 on small screens. */
export function FeatureList({ features }: { features: string[] }) {
  if (features.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-2 md:grid-cols-3">
      {features.map((feature) => (
        <li
          key={feature}
          className="flex items-start gap-2 text-body text-foreground-muted"
        >
          <span
            aria-hidden="true"
            className="mt-2 size-1.5 shrink-0 rounded-full bg-accent"
          />
          {feature}
        </li>
      ))}
    </ul>
  );
}

/**
 * "The Contractor's Take" — the differentiator on a listing page.
 *
 * Her construction read on the property, which no other agent's listing in this
 * market can carry. Rendered as a distinct callout so it is visibly not the
 * marketing description, and it disappears entirely when empty rather than
 * leaving a hollow heading (docs/05, section 7).
 *
 * The construction disclaimer travels WITH it: an observation from a licensed
 * contractor is not a home inspection, and docs/09 § 6 requires that said
 * wherever such an observation appears.
 */
export function ContractorsTake({
  text,
  className,
}: {
  text: string | null;
  className?: string;
}) {
  if (!text?.trim()) return null;

  return (
    <section
      aria-labelledby="contractors-take"
      className={cn(
        "rounded-lg border-l-4 border-l-accent bg-accent-wash p-5 md:p-6",
        className,
      )}
    >
      <h2
        id="contractors-take"
        className="flex items-center gap-2.5 text-h3 text-foreground"
      >
        <HardHat className="size-5 shrink-0 text-accent-quiet" aria-hidden="true" />
        The Contractor&rsquo;s Take
      </h2>

      <div className="mt-4 flex flex-col gap-4 text-lead leading-relaxed text-foreground-muted">
        {text
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
      </div>
    </section>
  );
}
