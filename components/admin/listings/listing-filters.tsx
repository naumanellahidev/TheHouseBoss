"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { City } from "@/types/domain";

/**
 * Listing list filters — docs/06 § 4.
 *
 * State lives in `searchParams`, never in local state (admin-crud skill). That
 * makes a filtered view shareable, survives a refresh, and makes Back and
 * Forward behave the way the browser promises.
 *
 * The search box is debounced and pushes with `scroll: false`, so typing does
 * not yank the page back to the top on every keystroke.
 */

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "active", label: "Active" },
  { value: "coming_soon", label: "Coming soon" },
  { value: "pending", label: "Pending" },
  { value: "sold", label: "Sold" },
  { value: "off_market", label: "Off market" },
];

const TYPES = [
  { value: "", label: "Any type" },
  { value: "resale", label: "Resale" },
  { value: "new_construction", label: "New construction" },
  { value: "assumable", label: "Assumable" },
  { value: "va_eligible", label: "VA eligible" },
  { value: "land", label: "Land" },
];

const PUBLISHED = [
  { value: "", label: "Live and draft" },
  { value: "true", label: "Live only" },
  { value: "false", label: "Drafts only" },
];

const SORTS = [
  { value: "updated", label: "Recently updated" },
  { value: "created", label: "Newest first" },
  { value: "price_desc", label: "Price, high to low" },
  { value: "price_asc", label: "Price, low to high" },
];

const selectClass = cn(
  "h-11 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
);

export function ListingFilters({ cities }: { cities: City[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [search, setSearch] = React.useState(params.get("q") ?? "");

  const push = React.useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      // Any filter change resets paging: page 3 of the old result set is
      // meaningless against the new one.
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  // Debounce the text field only. Selects fire immediately — they are discrete
  // choices, and waiting 400ms after a click feels broken.
  React.useEffect(() => {
    const current = params.get("q") ?? "";
    if (search === current) return;
    const timer = setTimeout(() => push({ q: search || null }), 400);
    return () => clearTimeout(timer);
  }, [search, params, push]);

  const active = ["status", "city", "type", "published", "hasPhotos", "q"].filter(
    (key) => params.get(key),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-foreground-subtle"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Address or MLS number"
            aria-label="Search listings"
            className={cn(selectClass, "w-full pl-9")}
          />
        </div>

        <select
          value={params.get("status") ?? ""}
          onChange={(event) => push({ status: event.target.value })}
          aria-label="Filter by status"
          className={selectClass}
        >
          {STATUSES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("city") ?? ""}
          onChange={(event) => push({ city: event.target.value })}
          aria-label="Filter by city"
          className={selectClass}
        >
          <option value="">Any city</option>
          {cities.map((city) => (
            <option key={city.id} value={city.slug}>
              {city.name}
            </option>
          ))}
        </select>

        <select
          value={params.get("type") ?? ""}
          onChange={(event) => push({ type: event.target.value })}
          aria-label="Filter by listing type"
          className={selectClass}
        >
          {TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("published") ?? ""}
          onChange={(event) => push({ published: event.target.value })}
          aria-label="Filter by publication state"
          className={selectClass}
        >
          {PUBLISHED.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={params.get("sort") ?? "updated"}
          onChange={(event) => push({ sort: event.target.value })}
          aria-label="Sort listings"
          className={cn(selectClass, "sm:ml-auto")}
        >
          {SORTS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {active.length > 0 ? (
        <div className="flex items-center gap-2">
          <p className="text-xs text-foreground-muted">
            {active.length} {active.length === 1 ? "filter" : "filters"} applied
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              router.push(pathname, { scroll: false });
            }}
          >
            <X aria-hidden="true" />
            Clear all
          </Button>
        </div>
      ) : null}
    </div>
  );
}
