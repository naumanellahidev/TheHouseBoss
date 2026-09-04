import Link from "next/link";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { City, Facets } from "@/types/domain";

/**
 * The home hero's search.
 *
 * The client's brief asks for property search to lead the page, and for the
 * filters to be genuinely capable rather than three dropdowns.
 *
 * Still a plain `<form method="get" action="/search">` and still a server
 * component, which is worth defending because it looks like the less ambitious
 * choice and is not:
 *
 *  - It submits with JavaScript disabled, and a crawler sees real controls
 *    rather than an empty div.
 *  - The browser builds the query string from the field `name`s, so the URL it
 *    produces is exactly the URL `/search` already parses. There is no second
 *    serialisation to drift out of sync with `lib/validation/search-params.ts`.
 *  - Empty selects submit as `?city=&beds=`, which that parser already drops.
 *
 * **Progressive disclosure without JavaScript.** The extra filters live inside a
 * native `<details>`. That gives a real disclosure widget — keyboard operable,
 * announced correctly, remembered by the browser on back-navigation — with no
 * client component, no hydration and no bundle. A React panel here would have
 * bought nothing except weight on the page whose Performance score is already
 * short of target.
 *
 * Options and counts come from `listing_facets` via `getFacets()`; nothing here
 * hardcodes a city or a property type (HR22). A zero-count option renders
 * disabled with its count rather than vanishing, matching `filter-bar.tsx`.
 */

/** Coarse on purpose — the hero is a starting point, `/search` has the fine control. */
const PRICE_STEPS = [
  200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000,
  2_000_000,
] as const;

const usd = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${Math.round(n / 1000)}k`;

export function SearchBar({
  cities,
  facets,
  variant = "hero",
  className,
}: {
  /** From `getSearchCities()`. Never hardcode a city list — HR22. */
  cities: City[];
  /** From `getFacets()`. Drives the counts and the property-type options. */
  facets: Facets;
  /** `hero` is the home page card; `compact` is the header strip. */
  variant?: "hero" | "compact";
  className?: string;
}) {
  const hero = variant === "hero";
  const countFor = (slug: string) =>
    facets.cities.find((c) => c.value === slug)?.total ?? 0;

  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label="Search homes"
      className={cn(
        hero ? "glass rounded-xl p-4 sm:p-5 lg:p-6" : "flex flex-wrap items-end gap-2",
        className,
      )}
    >
      {hero ? (
        <>
          {/* Primary row. Everything most people need, visible without a click. */}
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_auto] lg:items-end">
            <Field id="search-city">
              <FieldLabel>City</FieldLabel>
              <Select name="city" defaultValue="">
                <option value="">All cities</option>
                {cities.map((city) => {
                  const total = countFor(city.slug);
                  return (
                    <option key={city.id} value={city.slug} disabled={total === 0}>
                      {city.name} ({total})
                    </option>
                  );
                })}
              </Select>
            </Field>

            <Field id="search-max">
              <FieldLabel>Max price</FieldLabel>
              <Select name="max" defaultValue="">
                <option value="">No maximum</option>
                {PRICE_STEPS.map((step) => (
                  <option key={step} value={step}>
                    Up to {usd(step)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field id="search-beds">
              <FieldLabel>Beds</FieldLabel>
              <Select name="beds" defaultValue="">
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}+
                  </option>
                ))}
              </Select>
            </Field>

            <Button type="submit" variant="accent" size="lg" className="lg:w-auto">
              <Search className="size-5" aria-hidden="true" />
              Search
            </Button>
          </div>

          {/*
            Native disclosure. `group` + `open:` variants animate the chevron
            without a line of JavaScript, and the panel's contents are in the
            DOM either way, so they submit correctly however it is rendered.
          */}
          <details className="group mt-3 border-t border-border pt-3">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 text-sm font-semibold text-accent-quiet focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              More filters
              <ChevronDown
                aria-hidden="true"
                className="size-4 transition-transform duration-(--dur-base) ease-(--ease-out) group-open:rotate-180"
              />
            </summary>

            <div className="grid gap-3 pt-4 md:grid-cols-2 lg:grid-cols-3">
              <Field id="search-min">
                <FieldLabel>Min price</FieldLabel>
                <Select name="min" defaultValue="">
                  <option value="">No minimum</option>
                  {PRICE_STEPS.map((step) => (
                    <option key={step} value={step}>
                      From {usd(step)}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="search-baths">
                <FieldLabel>Baths</FieldLabel>
                <Select name="baths" defaultValue="">
                  <option value="">Any</option>
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n}+
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="search-property">
                <FieldLabel>Property type</FieldLabel>
                <Select name="property" defaultValue="">
                  <option value="">Any type</option>
                  {facets.propertyTypes.map((type) => (
                    <option
                      key={type.value}
                      value={type.value}
                      disabled={type.total === 0}
                    >
                      {type.label} ({type.total})
                    </option>
                  ))}
                </Select>
              </Field>

              <Field id="search-sqft">
                <FieldLabel>Minimum size</FieldLabel>
                <Input
                  name="sqftMin"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={100}
                  placeholder={
                    facets.sqft ? `e.g. ${facets.sqft.min.toLocaleString()}` : "Any"
                  }
                />
              </Field>

              <Field id="search-year">
                <FieldLabel>Built after</FieldLabel>
                <Input
                  name="yearMin"
                  type="number"
                  inputMode="numeric"
                  min={1800}
                  max={2100}
                  placeholder={facets.year ? String(facets.year.min) : "Any year"}
                />
              </Field>

              {/*
                A select rather than a checkbox, deliberately. A native checkbox
                cannot be grown to the 44x44 minimum touch target — the browser
                paints the widget at its intrinsic size and ignores the box it is
                given. Measured when the new-construction toggle failed the
                responsive audit at all nine widths.
              */}
              <Field id="search-pool">
                <FieldLabel>Pool</FieldLabel>
                <Select name="pool" defaultValue="">
                  <option value="">Any</option>
                  <option value="1">Has a pool</option>
                </Select>
              </Field>
            </div>
          </details>

          <p className="mt-3 text-sm text-foreground-muted">
            Looking for a new build?{" "}
            <Link
              href="/search/new-construction"
              className="font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Search new-construction homes
            </Link>
          </p>
        </>
      ) : (
        <>
          <Field id="search-city-compact">
            <FieldLabel>City</FieldLabel>
            <Select name="city" defaultValue="">
              <option value="">All cities</option>
              {cities.map((city) => (
                <option key={city.id} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" variant="accent">
            <Search className="size-5" aria-hidden="true" />
            Search
          </Button>
        </>
      )}
    </form>
  );
}
