import { PropertyCard } from "@/components/listing/property-card";
import { cn } from "@/lib/utils";
import type { ListingCard } from "@/types/domain";

/**
 * The home page's featured strip.
 *
 * Separate from `ListingGrid` because it behaves differently on mobile: a
 * featured row scrolls sideways as a `rail`, so three homes are visible as a
 * set and the section does not push the rest of the page a screen and a half
 * down. From 768px it becomes the ordinary grid.
 *
 * `priority` goes to the first card only. On the home page the hero image is
 * the LCP element, so eagerly loading three more large photos below the fold
 * competes with it for bandwidth — the opposite of what a search page wants,
 * where the grid IS the content.
 *
 * The caller decides whether to render this at all: docs/05 § Home hides the
 * whole section below three featured listings, because two cards in a row meant
 * for three reads as a mistake.
 */
export function FeaturedListings({
  listings,
  className,
}: {
  listings: ListingCard[];
  className?: string;
}) {
  return (
    <ul
      className={cn(
        "rail gap-5 md:grid md:grid-cols-2 md:overflow-visible lg:grid-cols-3 lg:gap-6",
        className,
      )}
    >
      {listings.map((listing, index) => (
        <li
          key={listing.id}
          // Below 768px each card is a snap point at ~82% of the viewport, so
          // the next one peeks in and the row is visibly scrollable.
          className="w-[82vw] max-w-sm shrink-0 snap-start md:w-auto md:max-w-none"
        >
          <PropertyCard listing={listing} priority={index === 0} />
        </li>
      ))}
    </ul>
  );
}
