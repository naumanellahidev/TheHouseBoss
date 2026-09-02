import {
  getFeaturedListings,
  getListingBySlug,
  getSoldListings,
  searchListings,
} from "@/lib/queries/listings";
import type { ListingReader } from "@/lib/listings/types";

/**
 * The only provider today: listings the client enters through the admin
 * dashboard. They are hers outright, which means no IDX display restrictions
 * and no crawler limits — the listing pages are fully AI-crawlable, which is
 * what the client actually asked for. See docs/11-mls-future.md § 1.
 *
 * It is a thin pass-through to `lib/queries/listings` on purpose. The value is
 * the seam, not the code.
 */
export const manualProvider: ListingReader = {
  name: "manual",
  getBySlug: getListingBySlug,
  search: searchListings,
  featured: getFeaturedListings,
  sold: getSoldListings,
};
