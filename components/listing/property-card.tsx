import Link from "next/link";
import { Bath, BedDouble, Maximize } from "lucide-react";

import { Badge, listingStatusBadge } from "@/components/ui/badge";
import { IMAGE_SIZES, PropertyImage } from "@/components/site/property-image";
import { formatBaths, formatNumber, formatPrice } from "@/lib/utils";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { ListingCard as ListingCardType } from "@/types/domain";

/**
 * The property card — used everywhere a listing appears.
 *
 * Rules it exists to keep consistent:
 *  - one aspect-ratio box around the photo, so a grid never shifts as images
 *    load (CLS target 0, HR7)
 *  - the status badge pairs colour with TEXT; colour is never the only signal
 *  - the whole card is ONE link. Nested interactive elements inside a card
 *    link are the most common keyboard trap on a listing grid.
 *  - a sold card shows the sold price and date, because that is the useful
 *    fact about it — the list price no longer is.
 *
 * `sizes` matters more here than anywhere else on the site: this is the
 * image-heavy grid, and a wrong value is the usual cause of a poor mobile
 * Lighthouse score (docs/04 § 7).
 */

export function PropertyCard({
  listing,
  priority = false,
  className,
}: {
  listing: ListingCardType;
  /** Set on the first row above the fold so the LCP image is not lazy. */
  priority?: boolean;
  className?: string;
}) {
  const badge = listingStatusBadge[listing.status];
  const sold = listing.status === "sold";

  const facts = [
    listing.beds != null
      ? { icon: BedDouble, value: `${listing.beds}`, label: "bed" }
      : null,
    listing.baths != null
      ? { icon: Bath, value: formatBaths(listing.baths), label: "bath" }
      : null,
    listing.sqft != null
      ? { icon: Maximize, value: formatNumber(listing.sqft), label: "sq ft" }
      : null,
  ].filter(Boolean) as { icon: typeof BedDouble; value: string; label: string }[];

  return (
    <article className={cn("h-full", className)}>
      <Link
        href={`/listing/${listing.slug}`}
        className={cn(
          "group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm",
          "transition-[box-shadow,transform] duration-(--dur-base) ease-(--ease-out)",
          "hover:-translate-y-0.5 hover:shadow-md",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        )}
      >
        <div className="relative">
          <PropertyImage
            photo={listing.cover}
            size={800}
            sizes={IMAGE_SIZES.cardGrid3}
            priority={priority}
            aspect="4/3"
            className="transition-transform duration-(--dur-slow) ease-(--ease-out) group-hover:scale-[1.02]"
          />

          <span className="absolute top-3 left-3">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </span>

          {listing.photosPurged ? (
            <span className="absolute right-3 bottom-3 rounded-sm bg-royal-950/80 px-2 py-1 text-overline font-semibold tracking-[0.12em] text-porcelain-50 uppercase">
              Photos archived
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col gap-2 p-4 md:p-5">
          <p className="text-h4 font-semibold text-foreground tabular">
            {sold && listing.soldPrice != null
              ? formatPrice(listing.soldPrice)
              : formatPrice(listing.price)}
            {sold ? (
              <span className="ml-2 text-sm font-medium text-foreground-muted">
                sold{listing.soldAt ? ` ${formatDate(listing.soldAt)}` : ""}
              </span>
            ) : null}
          </p>

          <p className="text-body font-medium text-foreground">
            {listing.address}
            {listing.unit ? `, ${listing.unit}` : ""}
          </p>
          <p className="text-sm text-foreground-muted">
            {listing.city.name}, FL{listing.zip ? ` ${listing.zip}` : ""}
          </p>

          {facts.length > 0 ? (
            <ul className="mt-auto flex flex-wrap gap-4 border-t border-border pt-3 text-sm text-foreground-muted">
              {facts.map((fact) => (
                <li key={fact.label} className="flex items-center gap-1.5">
                  <fact.icon
                    className="size-4 text-accent-quiet"
                    aria-hidden="true"
                  />
                  <span className="font-medium text-foreground tabular">
                    {fact.value}
                  </span>
                  <span>{fact.label}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </Link>
    </article>
  );
}
