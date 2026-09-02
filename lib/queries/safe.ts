import { isSupabaseConfigured } from "@/lib/env";
import type { Facets, SearchResult } from "@/types/domain";
export { EMPTY_SETTINGS } from "@/lib/queries/settings";

/**
 * Lets content pages be built and shipped before the database exists.
 *
 * Every page that shows listings, reviews or articles has a designed empty
 * state already (docs/05-page-specs.md). `safeQuery` routes to that empty state
 * when Supabase is not configured, or when a query fails, instead of throwing
 * a 500 at a visitor.
 *
 * This is NOT a way to swallow errors in production. A genuine query failure
 * with Supabase configured is logged loudly — it just does not take the whole
 * page down with it, because a guide page losing its "current assumable
 * listings" block is not a reason to lose the guide.
 */
export async function safeQuery<T>(
  fn: () => Promise<T>,
  fallback: T,
  label: string,
): Promise<T> {
  if (!isSupabaseConfigured) return fallback;

  try {
    return await fn();
  } catch (error) {
    console.error(`[safeQuery] ${label} failed:`, error);
    return fallback;
  }
}

/** True while there is no database — used to hide sections that need one. */
export const hasDatabase = isSupabaseConfigured;

/**
 * Empty shapes for the degraded path.
 *
 * A page whose query failed renders its designed empty state, which needs a
 * value of the right shape rather than a null check at every use site.
 */
export const EMPTY_RESULT: SearchResult = {
  listings: [],
  total: 0,
  page: 1,
  pageCount: 1,
};

export const EMPTY_FACETS: Facets = {
  cities: [],
  propertyTypes: [],
  listingTypes: [],
  price: null,
  beds: null,
  sqft: null,
  year: null,
  total: 0,
};
