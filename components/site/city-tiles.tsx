import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { MediaFrame, heroPhoto } from "@/components/site/media-frame";
import { IMAGE_SIZES } from "@/components/site/property-image";
import { cn } from "@/lib/utils";
import type { City, Facets } from "@/types/domain";

/**
 * City tiles with a live listing count.
 *
 * Counts come from the `listing_facets` view via `getFacets()` — never a
 * hardcoded number and never a per-tile query (HR22). A city with no listings
 * still renders, showing "Coming soon" and linking to its guide page rather
 * than to an empty result set: docs/05 § Home is explicit that a zero-count
 * tile is kept, because the city page is content that ranks on its own.
 *
 * Where the tile links depends on whether there is anything to see:
 *   count > 0  → /{city}/homes-for-sale, the search result
 *   count = 0  → /{city}, the guide page
 *
 * Sending someone to a search page that returns nothing is the fastest way to
 * make a site feel dead.
 */
export function CityTiles({
  cities,
  facets,
  className,
}: {
  cities: City[];
  facets: Facets;
  className?: string;
}) {
  const countFor = (slug: string) =>
    facets.cities.find((c) => c.value === slug)?.total ?? 0;

  return (
    <ul
      className={cn(
        // docs/04 § grid: 1 / 2 / 2 / 3 / 4 across the breakpoints.
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4",
        className,
      )}
    >
      {cities.map((city) => {
        const count = countFor(city.slug);
        const href = count > 0 ? `/${city.slug}/homes-for-sale` : `/${city.slug}`;

        return (
          <li key={city.id}>
            <Link
              href={href}
              className={cn(
                "group block rounded-(--radius-2xl)",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <MediaFrame
                photo={heroPhoto(city.heroKey, city.heroAlt, 1200, 1500)}
                size={800}
                sizes={IMAGE_SIZES.cardGrid4}
                aspect="4/5"
                scrim
                className={cn(
                  "transition-[transform,box-shadow] duration-(--dur-fast) ease-(--ease-out)",
                  "group-hover:-translate-y-0.5 group-hover:shadow-md",
                )}
              >
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4">
                  <span className="flex min-w-0 flex-col">
                    <span className="text-h4 font-semibold text-foreground-invert">
                      {city.name}
                    </span>
                    <span className="text-sm text-foreground-invert-muted tabular">
                      {count > 0
                        ? `${count} ${count === 1 ? "home" : "homes"} for sale`
                        : "Coming soon"}
                    </span>
                  </span>

                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-5 shrink-0 text-gold-400 transition-transform duration-(--dur-fast) ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                  />
                </div>
              </MediaFrame>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
