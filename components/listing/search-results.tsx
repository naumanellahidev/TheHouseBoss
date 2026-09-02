import Link from "next/link";

import { FilterBar } from "@/components/listing/filter-bar";
import { ListingGrid, NoResults } from "@/components/listing/listing-grid";
import { JsonLd } from "@/components/site/json-ld";
import { listingItemListJsonLd } from "@/lib/seo/jsonld";
import { toSearchQuery, type SearchParams } from "@/lib/validation/search-params";
import { cn } from "@/lib/utils";
import type { Facets, SearchResult } from "@/types/domain";

/**
 * The results block shared by `/search`, `/search/new-construction` and every
 * `/[city]/homes-for-sale` page.
 *
 * One implementation on purpose: those four routes differ only in what is
 * pre-applied and what copy sits above the grid. Duplicating the filter bar,
 * the empty state and the pagination across them is how they drift apart.
 */
export function SearchResults({
  result,
  facets,
  params,
  basePath,
  lockedType,
  lockedCity,
  cityName,
}: {
  result: SearchResult;
  facets: Facets;
  params: SearchParams;
  /** The route these controls write back to. */
  basePath: string;
  lockedType?: string;
  lockedCity?: string;
  cityName?: string;
}) {
  const href = (overrides: Partial<SearchParams>) => {
    const query = toSearchQuery({ ...params, ...overrides });
    return query ? `${basePath}?${query}` : basePath;
  };

  /**
   * "Widen the price range" in one tap: halve the floor, double the ceiling.
   * Only offered when a price filter is what is actually narrowing things —
   * otherwise it is a button that changes nothing.
   */
  const widerPrice =
    params.min != null || params.max != null
      ? href({
          min: params.min != null ? Math.floor(params.min * 0.5) : undefined,
          max: params.max != null ? Math.ceil(params.max * 2) : undefined,
          page: 1,
        })
      : undefined;

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        facets={facets}
        total={result.total}
        lockedType={lockedType}
        lockedCity={lockedCity}
      />

      {result.listings.length === 0 ? (
        <NoResults
          widerPriceHref={widerPrice}
          clearHref={basePath}
          cityName={lockedCity ? undefined : cityName}
          cityHref={lockedCity ? undefined : cityName ? `/${lockedCity}` : undefined}
        />
      ) : (
        <>
          <JsonLd
            data={[
              listingItemListJsonLd(
                result.listings.map((l) => ({ slug: l.slug, address: l.address })),
                basePath,
              ),
            ]}
          />

          <ListingGrid listings={result.listings} />

          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            total={result.total}
            href={href}
          />
        </>
      )}
    </div>
  );
}

/**
 * Numbered pagination, as real links.
 *
 * Links rather than buttons so a result page is shareable, crawlable and
 * middle-clickable — the same reason the filters live in the URL. Every target
 * is 44px (docs/04 § 9 lists pagination as a common tap-target failure).
 */
function Pagination({
  page,
  pageCount,
  total,
  href,
}: {
  page: number;
  pageCount: number;
  total: number;
  href: (overrides: Partial<SearchParams>) => string;
}) {
  if (pageCount <= 1) return null;

  // A compact window: first, last, and two either side of the current page.
  const numbers = new Set<number>([1, pageCount, page]);
  for (let offset = 1; offset <= 2; offset++) {
    if (page - offset >= 1) numbers.add(page - offset);
    if (page + offset <= pageCount) numbers.add(page + offset);
  }
  const ordered = [...numbers].sort((a, b) => a - b);

  const linkClass = cn(
    "inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm font-medium",
    "transition-colors duration-(--dur-fast)",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <nav aria-label="Search results pages" className="flex flex-col gap-3">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        {page > 1 ? (
          <li>
            <Link
              href={href({ page: page - 1 })}
              rel="prev"
              className={cn(linkClass, "border-border-strong text-foreground hover:bg-surface-sunken")}
            >
              Previous
            </Link>
          </li>
        ) : null}

        {ordered.map((number, i) => {
          const previous = ordered[i - 1];
          const gap = previous != null && number - previous > 1;
          return (
            <li key={number} className="flex items-center gap-2">
              {gap ? (
                <span aria-hidden="true" className="px-1 text-foreground-subtle">
                  …
                </span>
              ) : null}
              <Link
                href={href({ page: number })}
                aria-current={number === page ? "page" : undefined}
                aria-label={`Page ${number}`}
                className={cn(
                  linkClass,
                  number === page
                    ? "border-accent bg-accent-wash text-foreground"
                    : "border-border-strong text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
                )}
              >
                {number}
              </Link>
            </li>
          );
        })}

        {page < pageCount ? (
          <li>
            <Link
              href={href({ page: page + 1 })}
              rel="next"
              className={cn(linkClass, "border-border-strong text-foreground hover:bg-surface-sunken")}
            >
              Next
            </Link>
          </li>
        ) : null}
      </ul>

      <p className="text-center text-xs text-foreground-subtle tabular">
        Page {page} of {pageCount} · {total} {total === 1 ? "home" : "homes"}
      </p>
    </nav>
  );
}
