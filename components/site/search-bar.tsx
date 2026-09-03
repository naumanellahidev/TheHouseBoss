import Link from "next/link";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel, Select } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { City } from "@/types/domain";

/**
 * The home hero's search entry point.
 *
 * The client's brief says, in her own words, "the main page should focus on
 * property search" — and until now the home page had no search on it at all.
 *
 * Deliberately a plain `<form method="get" action="/search">`, not a client
 * component:
 *
 *  - It submits with JavaScript disabled, and it is server-rendered, so a
 *    crawler sees the real control rather than an empty div.
 *  - The browser builds the query string from the field `name`s, which means
 *    the URL it produces is exactly the URL `/search` already parses. There is
 *    no second serialisation to drift out of sync with
 *    `lib/validation/search-params.ts` — URL-is-the-state, honoured for free.
 *  - Empty selects submit as `?city=&beds=` etc., which the parser already
 *    drops tolerantly, so no cleanup step is needed.
 *
 * New construction is a link rather than a filter control here — see the
 * comment at the bottom of the form for why.
 */

/** Price steps, in dollars. Deliberately coarse — this is a starting point, not the filter bar. */
const PRICE_STEPS = [
  200_000, 300_000, 400_000, 500_000, 600_000, 750_000, 1_000_000, 1_500_000,
] as const;

const usd = (n: number) =>
  n >= 1_000_000 ? `$${n / 1_000_000}M` : `$${Math.round(n / 1000)}k`;

export function SearchBar({
  cities,
  variant = "hero",
  className,
}: {
  /** From `getSearchCities()`. Never hardcode a city list — HR22. */
  cities: City[];
  /** `hero` is the home page card; `compact` is the header strip. */
  variant?: "hero" | "compact";
  className?: string;
}) {
  const hero = variant === "hero";

  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label="Search homes"
      className={cn(
        hero
          ? "float-card grid w-full gap-3 p-4 sm:p-5 md:grid-cols-[1fr_1fr_auto_auto] md:items-end"
          : "flex w-full flex-wrap items-end gap-2",
        className,
      )}
    >
      <Field id="search-city">
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

      <Button type="submit" variant="accent" size={hero ? "lg" : "md"}>
        <Search className="size-5" aria-hidden="true" />
        Search
      </Button>

      {/*
        New construction is a LINK to its own page, not a checkbox on this
        form. Three reasons, in order of weight:

        1. `/search/new-construction` already exists, carries written content
           about why a buyer needs their own representation at a builder's
           sales office, and is indexable. A checkbox would instead produce
           `?type=new_construction` on the generic search page — the same
           results with none of the content and no ranking value.
        2. A native checkbox cannot be grown to the 44x44 minimum touch target
           reliably; the browser paints the widget at its intrinsic size and
           ignores the box we give it. Measured, not assumed.
        3. It is more discoverable as a labelled destination than as an
           unchecked box someone has to notice.
      */}
      {hero ? (
        <p className="text-sm text-foreground-muted md:col-span-4">
          Looking for a new build?{" "}
          <Link
            href="/search/new-construction"
            className="font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Search new-construction homes
          </Link>
        </p>
      ) : null}
    </form>
  );
}
