import { manualProvider } from "@/lib/listings/providers/manual";
import type { ListingReader, ProviderName } from "@/lib/listings/types";

/**
 * Provider registry.
 *
 * `LISTING_SOURCE` is unset today, so everything resolves to `manual`. When the
 * Stellar feed clears the broker's IDX paperwork:
 *
 *   1. add providers/stellar.ts implementing ListingReader + ListingSyncProvider
 *   2. register it below
 *   3. add app/api/cron/sync-listings/route.ts
 *   4. set LISTING_SOURCE=stellar
 *
 * Nothing in search, filters, cards or detail pages changes. That is the whole
 * return on this indirection — docs/11-mls-future.md § 5 estimates 5–6 sessions
 * with no schema migration.
 */

const registry: Partial<Record<ProviderName, ListingReader>> = {
  manual: manualProvider,
};

export function getListingReader(): ListingReader {
  // `||`, not `??`: a variable declared in the Vercel dashboard and left
  // empty arrives as "", which `??` passes straight through to the registry
  // lookup and throws. Exactly how STORAGE_DRIVER broke a deploy.
  const requested = (process.env.LISTING_SOURCE?.trim() ||
    "manual") as ProviderName;
  const provider = registry[requested];

  if (!provider) {
    throw new Error(
      `LISTING_SOURCE="${requested}" has no registered provider. ` +
        `Available: ${Object.keys(registry).join(", ")}. ` +
        `See docs/11-mls-future.md before adding one.`,
    );
  }

  return provider;
}

export const listings = getListingReader();

export * from "@/lib/listings/types";
