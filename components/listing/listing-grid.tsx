import Link from "next/link";
import { SearchX } from "lucide-react";

import { PropertyCard } from "@/components/listing/property-card";
import { EmptyState } from "@/components/site/empty-state";
import { Button } from "@/components/ui/button";
import { PropertyCardSkeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ListingCard } from "@/types/domain";

/**
 * The results grid.
 *
 * 1 col → 2 at 768 → 3 at 1024, and it STAYS at 3 above 1280 rather than going
 * to 4: a four-across grid makes the photos too small to sell a house
 * (docs/04 § 4).
 *
 * The first three cards get `priority`, so the LCP image on a search page is
 * not lazy-loaded.
 */
export function ListingGrid({
  listings,
  className,
}: {
  listings: ListingCard[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {listings.map((listing, index) => (
        <li key={listing.id}>
          <PropertyCard listing={listing} priority={index < 3} />
        </li>
      ))}
    </ul>
  );
}

export function ListingGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6"
    >
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * The zero-result state — docs/05, `/search`.
 *
 * Never a bare "0 results". Three recovery actions, in the order most likely
 * to work: widen the price range in one tap, clear everything, or save the
 * search. Below that, a way back to the whole city.
 */
export function NoResults({
  widerPriceHref,
  clearHref,
  cityName,
  cityHref,
}: {
  widerPriceHref?: string;
  clearHref: string;
  cityName?: string;
  cityHref?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-6">
      <EmptyState
        icon={SearchX}
        title="No homes match these filters"
        description="That combination is narrower than the current inventory. Widening the price range usually brings results back."
        actions={
          <>
            {widerPriceHref ? (
              <Button asChild variant="accent">
                <Link href={widerPriceHref}>Widen the price range</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link href={clearHref}>Clear all filters</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/contact?interest=listing_inquiry">
                Get alerts for new listings
              </Link>
            </Button>
          </>
        }
      />

      {cityName && cityHref ? (
        <p className="text-sm text-foreground-muted">
          Or{" "}
          <Link
            href={cityHref}
            className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
          >
            browse every home in {cityName}
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
