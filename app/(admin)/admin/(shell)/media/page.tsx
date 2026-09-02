import Link from "next/link";
import { ImageIcon } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { MediaGrid } from "@/components/admin/media/media-grid";
import { OrphanPanel } from "@/components/admin/media/orphan-panel";
import { AdminPagination } from "@/components/admin/pagination";
import { StorageMeter } from "@/components/admin/storage-meter";
import { formatBytes } from "@/lib/storage/budget";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { findOrphans } from "@/lib/images/orphans";
import { getMediaItems } from "@/lib/queries/admin";
import { getStorageUsage } from "@/lib/queries/media";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types/domain";

export const metadata = { title: "Media" };

const ENTITY_TABS: { value: string; label: string }[] = [
  { value: "", label: "Everything" },
  { value: "listing", label: "Listings" },
  { value: "article", label: "Articles" },
  { value: "city", label: "Cities" },
  { value: "community", label: "Communities" },
  { value: "site", label: "Site" },
];

/**
 * Media library — docs/06 § 9.
 *
 * The storage projection is the useful part of the summary: "you reach 1 GB in
 * about 14 months" is actionable in a way that "37% used" is not.
 */
export default async function AdminMediaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const showOrphans = params.tab === "unused";

  const [usage, media, orphans] = await Promise.all([
    getStorageUsage(),
    getMediaItems({
      entityType: (params.entity as MediaItem["entityType"]) || undefined,
      sort: params.sort === "created" ? "created" : "bytes",
      page: Number(params.page) || 1,
    }),
    // Only computed on the unused tab — it lists the whole bucket, which is the
    // most expensive call on this screen.
    showOrphans
      ? findOrphans().catch(() => null)
      : Promise.resolve(null),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Media"
        description={`${usage.objectCount} stored images, ${formatBytes(usage.totalBytes)} of ${formatBytes(usage.limitBytes)} used.`}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs lg:col-span-1">
          <StorageMeter usage={usage} variant="panel" />
          <StorageProjection usage={usage} />
        </div>

        <div className="flex flex-col gap-3 lg:col-span-2">
          <nav aria-label="Media sections" className="flex flex-wrap gap-2">
            <TabLink href="/admin/media" active={!showOrphans}>
              All files
            </TabLink>
            <TabLink href="/admin/media?tab=unused" active={showOrphans}>
              Unused files
            </TabLink>
          </nav>

          {!showOrphans ? (
            <nav aria-label="Filter by type" className="flex flex-wrap gap-2">
              {ENTITY_TABS.map((tab) => (
                <TabLink
                  key={tab.value || "all"}
                  href={tab.value ? `/admin/media?entity=${tab.value}` : "/admin/media"}
                  active={(params.entity ?? "") === tab.value}
                >
                  {tab.label}
                </TabLink>
              ))}
            </nav>
          ) : null}
        </div>
      </div>

      {showOrphans ? (
        orphans ? (
          <OrphanPanel
            strayObjects={orphans.strayObjects.length}
            strayRows={orphans.strayRows.length}
            reclaimableBytes={orphans.reclaimableBytes}
            skippedRecent={orphans.skippedRecent}
          />
        ) : (
          <EmptyState
            title="The storage check could not run"
            description="The bucket listing failed. Try again in a moment — nothing was changed."
            actions={
              <Button asChild variant="outline">
                <Link href="/admin/media?tab=unused">Try again</Link>
              </Button>
            }
          />
        )
      ) : media.rows.length === 0 ? (
        <EmptyState
          icon={ImageIcon}
          title="No images yet"
          description="Photos appear here as soon as they are added to a listing. Every upload produces three sizes and one record."
        />
      ) : (
        <>
          <MediaGrid items={media.rows} />
          <AdminPagination
            page={media.page}
            pageCount={media.pageCount}
            total={media.total}
          />
        </>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent bg-accent-wash text-foreground"
          : "border-border-strong text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}

/**
 * "At the current rate you reach 1 GB in about 14 months" (docs/06 § 9).
 *
 * Deliberately coarse. A growth projection from a handful of listings is not a
 * forecast, so it is only shown once there is enough stored to mean something,
 * and it is phrased as an estimate.
 */
function StorageProjection({
  usage,
}: {
  usage: { totalBytes: number; limitBytes: number; objectCount: number };
}) {
  if (usage.objectCount < 20) {
    return (
      <p className="border-t border-border pt-4 text-xs text-foreground-muted">
        A usage projection appears here once there are enough photos for it to
        mean anything. As a guide: one listing with 15 photos is about 3 MB, so
        the free tier holds roughly 270 listings.
      </p>
    );
  }

  const perListing = 3.1 * 1_048_576;
  const remaining = usage.limitBytes - usage.totalBytes;
  const listingsLeft = Math.max(0, Math.floor(remaining / perListing));

  return (
    <p className="border-t border-border pt-4 text-xs text-foreground-muted">
      There is room for roughly{" "}
      <span className="font-semibold text-foreground">{listingsLeft} more listings</span>{" "}
      at 15 photos each. Sold listings give most of their space back
      automatically 7 days after the sale.
    </p>
  );
}
