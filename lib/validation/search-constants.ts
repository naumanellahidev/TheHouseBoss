/**
 * Search vocabulary, with NO zod import.
 *
 * These lived in `search-params.ts`, which imports zod at the top and builds its
 * schema at module scope — and the filter bar, a client component, imported
 * `SORTS` from there. A module with top-level side effects cannot be
 * tree-shaken, so one constant pulled all of zod (375 kB raw, 78 kB gzipped)
 * into the public client bundle, where Lighthouse measured it 100% unused.
 *
 * Client components import from HERE. `search-params.ts` re-exports all of it,
 * so server code is unaffected. `npm run check:client-zod` fails the build if a
 * public client component reaches zod again.
 */

export const LISTING_TYPES = [
  "resale",
  "new_construction",
  "assumable",
  "va_eligible",
  "land",
] as const;

export const PROPERTY_TYPES = [
  "single_family",
  "townhouse",
  "condo",
  "villa",
  "multi_family",
  "land",
  "manufactured",
] as const;

export const SORTS = [
  "newest",
  "price_asc",
  "price_desc",
  "beds_desc",
  "sqft_desc",
] as const;

export type Sort = (typeof SORTS)[number];

export const PAGE_SIZE = 24;
