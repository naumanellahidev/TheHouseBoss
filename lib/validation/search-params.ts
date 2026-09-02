import { z } from "zod";

/**
 * The single parser for search URL state.
 *
 * Principle 2 in docs/01-architecture.md: the URL *is* the state. Every filter
 * combination has to be a shareable, crawlable link, which means the parser has
 * to be tolerant — a hand-edited or stale URL must degrade to sensible results,
 * never throw.
 *
 * Used by `/search`, `/search/new-construction`, `/[city]/homes-for-sale` and
 * the facets API, so they can never disagree about what a parameter means.
 */

/**
 * Comma-separated list of known values. Unknown entries are DROPPED rather than
 * failing the whole parameter — a stale bookmark with a retired property type
 * should still return homes.
 */
const csvOf = <T extends string>(values: readonly T[]) =>
  z.string().transform((v) =>
    v
      .split(",")
      .map((s) => s.trim())
      .filter((s): s is T => (values as readonly string[]).includes(s)),
  );

/** Comma-separated slugs. Same tolerance, validated by shape not by list. */
const csvSlugs = z.string().transform((v) =>
  v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9-]+$/.test(s)),
);

const int = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max);

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

export const searchParamsSchema = z.object({
  city: csvSlugs.optional(),
  min: int(0, 100_000_000).optional(),
  max: int(0, 100_000_000).optional(),
  beds: int(0, 20).optional(),
  baths: int(0, 20).optional(),
  type: csvOf(LISTING_TYPES).optional(),
  property: csvOf(PROPERTY_TYPES).optional(),
  sqftMin: int(0, 100_000).optional(),
  yearMin: int(1800, 2100).optional(),
  pool: z.enum(["1", "true"]).transform(() => true).optional(),
  q: z.string().trim().min(1).max(120).optional(),
  sort: z.enum(SORTS).default("newest"),
  page: int(1, 500).default(1),
});

export type SearchParams = z.infer<typeof searchParamsSchema>;

/**
 * Never throws. An unparseable value is dropped rather than 500ing the page —
 * a visitor who lands on a mangled link should still see homes.
 */
export function parseSearchParams(
  input: Record<string, string | string[] | undefined>,
): SearchParams {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(input)) {
    const value = Array.isArray(v) ? v.join(",") : v;
    if (value != null && value !== "") flat[k] = value;
  }

  const result = searchParamsSchema.safeParse(flat);
  if (result.success) return normalise(result.data);

  // Retry field by field, keeping whatever is valid.
  const salvaged: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) {
    const one = searchParamsSchema.safeParse({ [k]: v });
    if (one.success) salvaged[k] = v;
  }
  return normalise(searchParamsSchema.parse(salvaged));
}

/** A reversed price range is a typo, not an empty result set. */
function normalise(p: SearchParams): SearchParams {
  if (p.min != null && p.max != null && p.min > p.max) {
    return { ...p, min: p.max, max: p.min };
  }
  return p;
}

/** Serialises back to a canonical query string — stable key order. */
export function toSearchQuery(p: Partial<SearchParams>): string {
  const q = new URLSearchParams();
  const put = (k: string, v: unknown) => {
    if (v == null) return;
    if (Array.isArray(v)) {
      if (v.length) q.set(k, v.join(","));
    } else if (typeof v === "boolean") {
      if (v) q.set(k, "1");
    } else {
      q.set(k, String(v));
    }
  };

  for (const key of [
    "city", "min", "max", "beds", "baths", "type", "property",
    "sqftMin", "yearMin", "pool", "q",
  ] as const) {
    put(key, p[key]);
  }
  if (p.sort && p.sort !== "newest") q.set("sort", p.sort);
  if (p.page && p.page > 1) q.set("page", String(p.page));

  return q.toString();
}

/** True when nothing beyond sort/page is set — the canonical, indexable view. */
export function isUnfiltered(p: SearchParams): boolean {
  return (
    !p.city?.length && !p.type?.length && !p.property?.length &&
    p.min == null && p.max == null && p.beds == null && p.baths == null &&
    p.sqftMin == null && p.yearMin == null && !p.pool && !p.q
  );
}

/**
 * Canonical URL policy (docs/08-seo-ai-visibility.md § 5).
 *
 * A single-city or single-type view has a pretty URL and points at it. Anything
 * else is `noindex, follow` so filter permutations never dilute the index.
 */
export function canonicalFor(p: SearchParams): { path: string; index: boolean } {
  if (isUnfiltered(p)) return { path: "/search", index: true };

  const onlyCity =
    p.city?.length === 1 &&
    !p.type?.length && !p.property?.length &&
    p.min == null && p.max == null && p.beds == null && p.baths == null &&
    p.sqftMin == null && p.yearMin == null && !p.pool && !p.q;

  if (onlyCity) {
    return { path: `/${p.city![0]}/homes-for-sale`, index: true };
  }

  const onlyNewConstruction =
    p.type?.length === 1 &&
    p.type[0] === "new_construction" &&
    !p.city?.length && !p.property?.length &&
    p.min == null && p.max == null && p.beds == null && p.baths == null &&
    p.sqftMin == null && p.yearMin == null && !p.pool && !p.q;

  if (onlyNewConstruction) {
    return { path: "/search/new-construction", index: true };
  }

  return { path: "/search", index: false };
}
