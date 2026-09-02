import Link from "next/link";
import { Building2, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { ListingFilters } from "@/components/admin/listings/listing-filters";
import { ListingTable } from "@/components/admin/listings/listing-table";
import { AdminPagination } from "@/components/admin/pagination";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminListings } from "@/lib/queries/admin";
import { getCities } from "@/lib/queries/cities";
import type { ListingStatus, ListingType } from "@/types/domain";

/**
 * Listings list — docs/06 § 4.
 *
 * A server component; every filter is read from `searchParams`, so the URL is
 * the state and a filtered view is shareable.
 */
export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const [{ rows, total, page, pageCount }, cities] = await Promise.all([
    getAdminListings({
      status: (params.status as ListingStatus) || undefined,
      citySlug: params.city || undefined,
      listingType: (params.type as ListingType) || undefined,
      published:
        params.published === "true"
          ? true
          : params.published === "false"
            ? false
            : undefined,
      hasPhotos:
        params.hasPhotos === "true"
          ? true
          : params.hasPhotos === "false"
            ? false
            : undefined,
      search: params.q || undefined,
      sort: (params.sort as "updated" | "price_desc" | "price_asc" | "created") || "updated",
      page: Number(params.page) || 1,
    }),
    getCities(),
  ]);

  const filtered = Boolean(
    params.status || params.city || params.type || params.published || params.q,
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Listings"
        description={
          total > 0
            ? `${total} ${total === 1 ? "listing" : "listings"} in the database.`
            : undefined
        }
        actions={
          <Button asChild variant="accent">
            <Link href="/admin/listings/new">
              <Plus aria-hidden="true" />
              Add listing
            </Link>
          </Button>
        }
      />

      <ListingFilters cities={cities} />

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No listings match these filters"
            description="Try clearing one of them — the filters combine, so a city plus a status can easily leave nothing."
            actions={
              <Button asChild variant="outline">
                <Link href="/admin/listings">Clear all filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Building2}
            title="Add your first listing"
            description="A listing needs an address, a city, a price and at least one photo with alt text before it can go live. You can save a draft at any point."
            actions={
              <Button asChild variant="accent">
                <Link href="/admin/listings/new">Add a listing</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ListingTable rows={rows} />
          <AdminPagination page={page} pageCount={pageCount} total={total} />
        </>
      )}
    </div>
  );
}
