"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SORTS, type Sort } from "@/lib/validation/search-params";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import type { Facets } from "@/types/domain";

/**
 * Search filters — docs/04 § 5 (Search) and docs/05 (`/search`).
 *
 * Two rules shape everything here:
 *
 *   1. **The URL is the state.** Every control writes to `searchParams`, so
 *      every filter combination is a shareable link and Back/Forward restore
 *      the previous result set for free. Nothing is held in local state except
 *      the mobile sheet's draft, which exists so the sheet can Apply once
 *      rather than refetch on every tap.
 *   2. **Options come from `listing_facets` (HR22).** Nothing here hardcodes a
 *      city, a price band or a property type, and a zero-count option renders
 *      DISABLED with its count rather than disappearing — a disabled option
 *      teaches what exists.
 *
 * Desktop applies on change. Mobile collects into a sheet and applies once,
 * because a phone refetching on every tap of a six-filter form is unusable.
 */

const SORT_LABELS: Record<Sort, string> = {
  newest: "Newest",
  price_asc: "Price, low to high",
  price_desc: "Price, high to low",
  beds_desc: "Most beds",
  sqft_desc: "Largest",
};

const BED_OPTIONS = [1, 2, 3, 4, 5];
const BATH_OPTIONS = [1, 2, 3];

type Draft = Record<string, string>;

function readDraft(params: URLSearchParams): Draft {
  const draft: Draft = {};
  for (const key of [
    "city",
    "min",
    "max",
    "beds",
    "baths",
    "type",
    "property",
    "sqftMin",
    "yearMin",
    "pool",
    "q",
  ]) {
    const value = params.get(key);
    if (value) draft[key] = value;
  }
  return draft;
}

export function FilterBar({
  facets,
  total,
  /** Set on /search/new-construction, where the type toggle is locked on. */
  lockedType,
  /** Set on a city page, where the city filter is the page itself. */
  lockedCity,
}: {
  facets: Facets;
  total: number;
  lockedType?: string;
  lockedCity?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>(() =>
    readDraft(new URLSearchParams(params.toString())),
  );

  // Opening the sheet re-reads the URL, so a Back navigation while it is shut
  // cannot leave a stale draft behind.
  function openSheet(open: boolean) {
    if (open) setDraft(readDraft(new URLSearchParams(params.toString())));
    setSheetOpen(open);
  }

  const apply = React.useCallback(
    (updates: Record<string, string | null>, options?: { replace?: boolean }) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) next.delete(key);
        else next.set(key, value);
      }
      // Any filter change invalidates the page number: page 3 of the old result
      // set has nothing to do with the new one.
      next.delete("page");

      const query = next.toString();
      const url = query ? `${pathname}?${query}` : pathname;
      // push, not replace: Back must return to the previous result set. That is
      // a Definition-of-Done item for this phase.
      if (options?.replace) router.replace(url, { scroll: false });
      else router.push(url, { scroll: false });
    },
    [params, pathname, router],
  );

  /** Multi-select values live as comma-separated lists, matching the parser. */
  function toggleInList(key: string, value: string, source: URLSearchParams | Draft) {
    const current =
      source instanceof URLSearchParams ? (source.get(key) ?? "") : (source[key] ?? "");
    const list = current ? current.split(",").filter(Boolean) : [];
    const next = list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
    return next.length ? next.join(",") : null;
  }

  const activeCount = [
    "city",
    "min",
    "max",
    "beds",
    "baths",
    "type",
    "property",
    "sqftMin",
    "yearMin",
    "pool",
    "q",
  ].filter((key) => params.get(key)).length;

  const chips = buildChips(params, facets, lockedCity, lockedType);

  return (
    <div className="flex flex-col gap-3">
      {/* ── Sticky control row ─────────────────────────────────────────── */}
      <div className="sticky top-(--header-h) z-30 -mx-5 border-b border-border bg-background/95 px-5 py-3 backdrop-blur-md md:top-(--header-h-lg)">
        <div className="flex items-center gap-3">
          {/* Mobile: one button into the sheet */}
          <Sheet open={sheetOpen} onOpenChange={openSheet}>
            <SheetTrigger asChild>
              <Button variant="outline" size="md" className="lg:hidden">
                <SlidersHorizontal aria-hidden="true" />
                Filters
                {activeCount > 0 ? (
                  <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-accent px-1.5 py-0.5 text-overline font-semibold text-accent-fg tabular">
                    {activeCount}
                  </span>
                ) : null}
              </Button>
            </SheetTrigger>

            <SheetContent
              side="bottom"
              title="Filter homes"
              description="Narrow the results, then apply"
              className="max-h-[92svh]"
            >
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <FilterFields
                  facets={facets}
                  value={draft}
                  lockedCity={lockedCity}
                  lockedType={lockedType}
                  onChange={(key, value) =>
                    setDraft((current) => {
                      const next = { ...current };
                      if (!value) delete next[key];
                      else next[key] = value;
                      return next;
                    })
                  }
                  onToggleList={(key, value) => {
                    const result = toggleInList(key, value, draft);
                    setDraft((current) => {
                      const next = { ...current };
                      if (!result) delete next[key];
                      else next[key] = result;
                      return next;
                    });
                  }}
                />
              </div>

              {/* The sheet must never trap: a close button above, and both
                  "Clear all" and "Show N homes" below (docs/04 § 5). */}
              <div className="flex gap-3 border-t border-border px-5 py-4 safe-bottom">
                <Button
                  variant="ghost"
                  onClick={() => {
                    setDraft({});
                    router.push(pathname, { scroll: false });
                    setSheetOpen(false);
                  }}
                >
                  Clear all
                </Button>
                <Button
                  variant="accent"
                  className="flex-1"
                  onClick={() => {
                    const next = new URLSearchParams();
                    for (const [key, value] of Object.entries(draft)) {
                      if (value) next.set(key, value);
                    }
                    const sort = params.get("sort");
                    if (sort) next.set("sort", sort);
                    const query = next.toString();
                    router.push(query ? `${pathname}?${query}` : pathname, {
                      scroll: false,
                    });
                    setSheetOpen(false);
                  }}
                >
                  Show homes
                </Button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Desktop: everything inline, applying on change */}
          <div className="hidden flex-wrap items-center gap-2 lg:flex">
            <FilterFields
              facets={facets}
              value={Object.fromEntries(params.entries())}
              lockedCity={lockedCity}
              lockedType={lockedType}
              inline
              onChange={(key, value) => apply({ [key]: value })}
              onToggleList={(key, value) =>
                apply({ [key]: toggleInList(key, value, params) })
              }
            />
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* The result count is announced, not just displayed. */}
            <p
              aria-live="polite"
              aria-atomic="true"
              className="hidden text-sm text-foreground-muted sm:block"
            >
              <span className="font-semibold text-foreground tabular">{total}</span>{" "}
              {total === 1 ? "home" : "homes"}
            </p>

            <label className="flex items-center gap-2">
              <span className="sr-only">Sort results</span>
              <select
                value={params.get("sort") ?? "newest"}
                onChange={(event) => apply({ sort: event.target.value })}
                className={cn(
                  "h-11 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {SORTS.map((sort) => (
                  <option key={sort} value={sort}>
                    {SORT_LABELS[sort]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      {/* ── Active chips ───────────────────────────────────────────────── */}
      {chips.length > 0 ? (
        <ul className="scroll-row gap-2 md:flex-wrap">
          {chips.map((chip) => (
            <li key={`${chip.key}:${chip.value ?? ""}`} className="shrink-0">
              <button
                type="button"
                onClick={() =>
                  apply({
                    [chip.key]: chip.remainder ?? null,
                  })
                }
                className={cn(
                  "inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border-strong bg-surface py-1 pr-2 pl-4 text-sm",
                  "text-foreground transition-colors duration-(--dur-fast) hover:bg-surface-sunken",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                )}
              >
                {chip.label}
                <span className="inline-flex size-7 items-center justify-center rounded-full text-foreground-muted">
                  <X className="size-3.5" aria-hidden="true" />
                </span>
                <span className="sr-only">Remove filter</span>
              </button>
            </li>
          ))}

          <li className="shrink-0">
            <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
              Clear all
            </Button>
          </li>
        </ul>
      ) : null}

      <p aria-live="polite" aria-atomic="true" className="text-sm text-foreground-muted sm:hidden">
        <span className="font-semibold text-foreground tabular">{total}</span>{" "}
        {total === 1 ? "home" : "homes"}
      </p>
    </div>
  );
}

/* ── The controls themselves, shared by the inline bar and the sheet ────── */

function FilterFields({
  facets,
  value,
  onChange,
  onToggleList,
  lockedCity,
  lockedType,
  inline = false,
}: {
  facets: Facets;
  value: Record<string, string>;
  onChange: (key: string, value: string | null) => void;
  onToggleList: (key: string, value: string) => void;
  lockedCity?: string;
  lockedType?: string;
  inline?: boolean;
}) {
  const selected = (key: string) => (value[key] ?? "").split(",").filter(Boolean);

  const controlClass = cn(
    "h-11 rounded-md border border-border-strong bg-surface px-3 text-body text-foreground",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <div className={cn(inline ? "flex flex-wrap items-center gap-2" : "flex flex-col gap-6")}>
      {/* ── City ─────────────────────────────────────────────────────── */}
      {!lockedCity ? (
        <FilterGroup label="City" inline={inline}>
          <div className={cn("flex flex-wrap gap-2", inline && "contents")}>
            {inline ? (
              <select
                aria-label="Filter by city"
                value={selected("city")[0] ?? ""}
                onChange={(event) => onChange("city", event.target.value || null)}
                className={controlClass}
              >
                <option value="">Any city</option>
                {facets.cities.map((city) => (
                  <option key={city.value} value={city.value} disabled={city.total === 0}>
                    {city.label} ({city.total})
                  </option>
                ))}
              </select>
            ) : (
              facets.cities.map((city) => (
                <Chip
                  key={city.value}
                  pressed={selected("city").includes(city.value)}
                  disabled={city.total === 0}
                  onClick={() => onToggleList("city", city.value)}
                >
                  {city.label}
                  <Count>{city.total}</Count>
                </Chip>
              ))
            )}
          </div>
        </FilterGroup>
      ) : null}

      {/* ── Price ────────────────────────────────────────────────────── */}
      <FilterGroup label="Price" inline={inline}>
        <div className={cn("flex items-center gap-2", inline && "contents")}>
          <label className="flex-1">
            <span className="sr-only">Minimum price</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={facets.price ? `${formatPrice(facets.price.min, { compact: true })}` : "No min"}
              defaultValue={value.min ?? ""}
              onBlur={(event) => onChange("min", event.target.value || null)}
              className={cn(controlClass, "w-full", inline && "w-28")}
            />
          </label>
          <span aria-hidden="true" className="text-foreground-subtle">
            to
          </span>
          <label className="flex-1">
            <span className="sr-only">Maximum price</span>
            <input
              type="number"
              inputMode="numeric"
              placeholder={facets.price ? `${formatPrice(facets.price.max, { compact: true })}` : "No max"}
              defaultValue={value.max ?? ""}
              onBlur={(event) => onChange("max", event.target.value || null)}
              className={cn(controlClass, "w-full", inline && "w-28")}
            />
          </label>
        </div>
      </FilterGroup>

      {/* ── Beds / baths ─────────────────────────────────────────────── */}
      <FilterGroup label="Beds" inline={inline}>
        <div className="flex flex-wrap gap-1.5">
          {BED_OPTIONS.map((n) => (
            <Chip
              key={n}
              pressed={value.beds === String(n)}
              onClick={() => onChange("beds", value.beds === String(n) ? null : String(n))}
            >
              {n}+
            </Chip>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Baths" inline={inline}>
        <div className="flex flex-wrap gap-1.5">
          {BATH_OPTIONS.map((n) => (
            <Chip
              key={n}
              pressed={value.baths === String(n)}
              onClick={() => onChange("baths", value.baths === String(n) ? null : String(n))}
            >
              {n}+
            </Chip>
          ))}
        </div>
      </FilterGroup>

      {/* ── Listing type ─────────────────────────────────────────────── */}
      {!lockedType ? (
        <FilterGroup label="Type" inline={inline}>
          <div className="flex flex-wrap gap-1.5">
            {facets.listingTypes.map((type) => (
              <Chip
                key={type.value}
                pressed={selected("type").includes(type.value)}
                disabled={type.total === 0}
                onClick={() => onToggleList("type", type.value)}
              >
                {type.label}
                <Count>{type.total}</Count>
              </Chip>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {/* ── Property type ────────────────────────────────────────────── */}
      {!inline ? (
        <FilterGroup label="Property type" inline={inline}>
          <div className="flex flex-wrap gap-1.5">
            {facets.propertyTypes.map((type) => (
              <Chip
                key={type.value}
                pressed={selected("property").includes(type.value)}
                disabled={type.total === 0}
                onClick={() => onToggleList("property", type.value)}
              >
                {type.label}
                <Count>{type.total}</Count>
              </Chip>
            ))}
          </div>
        </FilterGroup>
      ) : null}

      {/* ── Size, year, pool ─────────────────────────────────────────── */}
      {!inline ? (
        <>
          <FilterGroup label="Minimum size" inline={inline}>
            <label>
              <span className="sr-only">Minimum square feet</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Any"
                defaultValue={value.sqftMin ?? ""}
                onBlur={(event) => onChange("sqftMin", event.target.value || null)}
                className={cn(controlClass, "w-full")}
              />
            </label>
          </FilterGroup>

          <FilterGroup label="Built after" inline={inline}>
            <label>
              <span className="sr-only">Built no earlier than</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder={facets.year ? String(facets.year.min) : "Any year"}
                defaultValue={value.yearMin ?? ""}
                onBlur={(event) => onChange("yearMin", event.target.value || null)}
                className={cn(controlClass, "w-full")}
              />
            </label>
          </FilterGroup>

          <FilterGroup label="Features" inline={inline}>
            <Chip
              pressed={value.pool === "1"}
              onClick={() => onChange("pool", value.pool === "1" ? null : "1")}
            >
              Pool
            </Chip>
          </FilterGroup>
        </>
      ) : null}
    </div>
  );
}

function FilterGroup({
  label,
  inline,
  children,
}: {
  label: string;
  inline: boolean;
  children: React.ReactNode;
}) {
  if (inline) return <>{children}</>;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-sm font-semibold text-foreground">{label}</legend>
      {children}
    </fieldset>
  );
}

function Chip({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        // A zero-count option stays visible and disabled: it teaches what
        // exists rather than silently vanishing (HR22).
        "disabled:cursor-not-allowed disabled:opacity-50",
        pressed
          ? "border-accent bg-accent-wash text-foreground"
          : "border-border-strong bg-surface text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs text-foreground-subtle tabular">({children})</span>
  );
}

/* ── Active chips ───────────────────────────────────────────────────────── */

type ChipSpec = {
  key: string;
  value?: string;
  label: string;
  /** What the parameter becomes once this chip is removed. */
  remainder?: string | null;
};

function buildChips(
  params: URLSearchParams,
  facets: Facets,
  lockedCity?: string,
  lockedType?: string,
): ChipSpec[] {
  const chips: ChipSpec[] = [];

  const listChips = (key: string, options: { value: string; label: string }[]) => {
    const raw = params.get(key);
    if (!raw) return;
    const values = raw.split(",").filter(Boolean);
    for (const value of values) {
      chips.push({
        key,
        value,
        label: options.find((o) => o.value === value)?.label ?? value,
        remainder: values.filter((v) => v !== value).join(",") || null,
      });
    }
  };

  if (!lockedCity) listChips("city", facets.cities);
  if (!lockedType) listChips("type", facets.listingTypes);
  listChips("property", facets.propertyTypes);

  const single = (key: string, label: (value: string) => string) => {
    const value = params.get(key);
    if (value) chips.push({ key, label: label(value), remainder: null });
  };

  single("min", (v) => `From ${formatPrice(Number(v), { compact: true })}`);
  single("max", (v) => `Up to ${formatPrice(Number(v), { compact: true })}`);
  single("beds", (v) => `${v}+ beds`);
  single("baths", (v) => `${v}+ baths`);
  single("sqftMin", (v) => `${Number(v).toLocaleString("en-US")}+ sq ft`);
  single("yearMin", (v) => `Built ${v} or later`);
  single("pool", () => "Pool");
  single("q", (v) => `“${v}”`);

  return chips;
}
