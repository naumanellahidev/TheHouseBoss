import type { Listing, ListingCard, SearchResult } from "@/types/domain";
import type { SearchParams } from "@/lib/validation/search-params";

/**
 * Listing provider abstraction.
 *
 * There is exactly one provider today (`manual`), and that is the point: every
 * listing read already goes through this interface, so adding Stellar MLS later
 * is a new file plus a cron route — not a refactor of search, filters, cards
 * and detail pages. See docs/11-mls-future.md.
 *
 * DO NOT DELETE THIS MODULE as unused code. The `phase-review` skill checks
 * that it still exists.
 */

export type ProviderName = "manual" | "stellar" | "simplyrets";

/** Read side — what the site calls to render listings. */
export interface ListingReader {
  readonly name: ProviderName;
  getBySlug(slug: string): Promise<Listing | null>;
  search(params: SearchParams): Promise<SearchResult>;
  featured(limit?: number): Promise<ListingCard[]>;
  sold(citySlug?: string, limit?: number): Promise<ListingCard[]>;
}

/** Sync side — implemented only by feed-backed providers. */
export interface SyncParams {
  /** Incremental pull: ModificationTimestamp > since. */
  since?: Date;
  limit?: number;
  cursor?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  removed: number;
  cursor?: string;
  /** Slugs whose pages need revalidating. */
  changedSlugs: string[];
}

export interface ListingSyncProvider {
  readonly name: ProviderName;
  /**
   * Pulls, normalises and upserts on (source, source_id). A feed row that has
   * disappeared is marked off_market — NEVER deleted, because a published URL
   * is permanent (hard rule 11).
   */
  sync(params: SyncParams): Promise<SyncResult>;
}

/** True when a listing is owned by an external feed and must not be edited. */
export function isFeedOwned(listing: Pick<Listing, "source" | "isLocked">) {
  return listing.source !== "manual" || listing.isLocked;
}

/**
 * Whether an IDX disclaimer must render on this listing.
 *
 * False for every listing today — they are all hers. The moment a Stellar row
 * exists this flips, and `<IdxDisclaimer />` renders. Rendering it now, with no
 * MLS feed connected, would itself be misleading (docs/09 § 4).
 */
export function needsIdxDisclaimer(listing: Pick<Listing, "source">) {
  return listing.source !== "manual" && listing.source !== "seed";
}
