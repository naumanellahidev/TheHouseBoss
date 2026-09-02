"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, ExternalLink, Pencil, Trash2 } from "lucide-react";

import {
  bulkListingAction,
  deleteListing,
  duplicateListing,
  setListingFeatured,
  setListingPublished,
} from "@/app/(admin)/admin/(shell)/listings/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge, listingStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { ResponsiveTable, type Column } from "@/components/site/responsive-table";
import { photoUrl } from "@/lib/storage/url";
import { formatBaths, formatPrice, cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils/date";
import type { AdminListingRow } from "@/lib/queries/admin";

/**
 * The listings table — docs/06 § 4.
 *
 * Below 768px every row becomes a card via <ResponsiveTable />; a horizontally
 * scrolling table is never the mobile experience (docs/04 § 6). The client
 * checks listings on her phone, so this screen is one of the three that must
 * work at 360px (docs/06 § 11 rule 8).
 *
 * Publish and Feature are optimistic with rollback (rule 6). Delete is not:
 * it takes a typed confirmation and waits for the server, because an optimistic
 * delete that silently fails is unrecoverable from the user's point of view.
 */

const COLUMNS: Column[] = [
  { key: "photo", header: "Photo", hideOnCard: true, className: "w-20" },
  { key: "address", header: "Address", primary: true },
  { key: "city", header: "City" },
  { key: "price", header: "Price", align: "end" },
  { key: "beds", header: "Beds / baths" },
  { key: "status", header: "Status" },
  { key: "photos", header: "Photos", align: "end" },
  { key: "published", header: "Live" },
  { key: "updated", header: "Updated", hideOnCard: true },
];

export function ListingTable({ rows }: { rows: AdminListingRow[] }) {
  const router = useRouter();
  const toast = useToast();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [deleting, setDeleting] = React.useState<AdminListingRow | null>(null);
  const [bulkDelete, setBulkDelete] = React.useState(false);

  // Optimistic overlays. The server row stays the source of truth; these only
  // hold the pending value until the action resolves or rolls back.
  const [published, setPublished] = React.useState<Record<string, boolean>>({});
  const [featured, setFeatured] = React.useState<Record<string, boolean>>({});

  const isPublished = (row: AdminListingRow) => published[row.id] ?? row.published;
  const isFeatured = (row: AdminListingRow) => featured[row.id] ?? row.isFeatured;

  function toggleSelected(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function togglePublished(row: AdminListingRow, value: boolean) {
    setPublished((current) => ({ ...current, [row.id]: value }));
    const result = await setListingPublished({ id: row.id, value });
    if (!result.ok) {
      setPublished((current) => ({ ...current, [row.id]: !value }));
      toast.error(result.error);
      return;
    }
    router.refresh();
  }

  async function toggleFeatured(row: AdminListingRow, value: boolean) {
    setFeatured((current) => ({ ...current, [row.id]: value }));
    const result = await setListingFeatured({ id: row.id, value });
    if (!result.ok) {
      setFeatured((current) => ({ ...current, [row.id]: !value }));
      toast.error(result.error);
    }
  }

  async function duplicate(row: AdminListingRow) {
    const result = await duplicateListing(row.id);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Duplicated. Address, price and photos were cleared.");
    router.push(`/admin/listings/${result.data.id}/edit`);
  }

  async function runBulk(action: "publish" | "unpublish" | "feature" | "unfeature") {
    const ids = [...selected];
    const result = await bulkListingAction({ ids, action });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`${result.data.affected} listings updated.`);
    setSelected(new Set());
    router.refresh();
  }

  const selectedRows = rows.filter((row) => selected.has(row.id));
  const selectedPhotos = selectedRows.reduce((n, row) => n + row.photoCount, 0);

  function renderCell(row: AdminListingRow, column: Column): React.ReactNode {
    switch (column.key) {
      case "photo":
        return (
          <span className="relative block size-14 overflow-hidden rounded-md bg-surface-sunken">
            {row.cover ? (
              <Image
                src={photoUrl(row.cover, 400)}
                alt=""
                fill
                sizes="56px"
                className="object-cover"
                unoptimized
              />
            ) : null}
          </span>
        );

      case "address":
        return (
          <span className="flex flex-col gap-1">
            <Link
              href={`/admin/listings/${row.id}/edit`}
              className="rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {row.address}
              {row.unit ? `, ${row.unit}` : ""}
            </Link>
            {row.missingAlt > 0 ? (
              <span className="text-xs font-medium text-warning">
                {row.missingAlt} {row.missingAlt === 1 ? "photo" : "photos"} missing
                alt text
              </span>
            ) : null}
          </span>
        );

      case "city":
        return row.cityName;

      case "price":
        return <span className="tabular">{formatPrice(row.price)}</span>;

      case "beds":
        return (
          <span className="tabular">
            {row.beds ?? "—"} / {formatBaths(row.baths)}
          </span>
        );

      case "status": {
        const badge = listingStatusBadge[row.status];
        return <Badge tone={badge.tone}>{badge.label}</Badge>;
      }

      case "photos":
        return (
          <span className={cn("tabular", row.photoCount === 0 && "text-danger")}>
            {row.photoCount}
          </span>
        );

      case "published":
        return (
          <span className="flex items-center gap-2">
            <Switch
              checked={isPublished(row)}
              onCheckedChange={(value) => void togglePublished(row, value)}
              // Named per row: "Published" alone would give every switch in the
              // table the same accessible name.
              label={`Published — ${row.address}`}
            />
            <span aria-hidden="true" className="text-xs text-foreground-muted">
              {isPublished(row) ? "Live" : "Draft"}
            </span>
          </span>
        );

      case "updated":
        return (
          <span className="text-xs text-foreground-muted">
            {relativeTime(row.updatedAt)}
          </span>
        );

      default:
        return null;
    }
  }

  function renderActions(row: AdminListingRow) {
    return (
      <>
        <label className="inline-flex min-h-11 items-center gap-2 px-2 text-xs text-foreground-muted">
          <input
            type="checkbox"
            checked={selected.has(row.id)}
            onChange={() => toggleSelected(row.id)}
            className="size-4 accent-accent"
          />
          <span className="sr-only">Select {row.address}</span>
          <span aria-hidden="true">Select</span>
        </label>

        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/listings/${row.id}/edit`} aria-label={`Edit ${row.address}`}>
            <Pencil aria-hidden="true" />
          </Link>
        </Button>

        {isPublished(row) ? (
          <Button asChild variant="ghost" size="sm">
            <a
              href={`/listing/${row.slug}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`View ${row.address} on the site`}
            >
              <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        ) : null}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void duplicate(row)}
          aria-label={`Duplicate ${row.address}`}
        >
          <Copy aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => setDeleting(row)}
          aria-label={`Delete ${row.address}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => void toggleFeatured(row, !isFeatured(row))}
        >
          {isFeatured(row) ? "Unfeature" : "Feature"}
        </Button>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex flex-wrap items-center gap-2 rounded-lg border border-accent/40 bg-accent-wash p-3"
        >
          <p className="mr-auto text-sm font-medium text-foreground">
            {selected.size} selected
          </p>
          <Button variant="outline" size="sm" onClick={() => void runBulk("publish")}>
            Publish
          </Button>
          <Button variant="outline" size="sm" onClick={() => void runBulk("unpublish")}>
            Unpublish
          </Button>
          <Button variant="outline" size="sm" onClick={() => void runBulk("feature")}>
            Feature
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setBulkDelete(true)}
          >
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      <ResponsiveTable
        caption="Listings"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        renderActions={renderActions}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this listing"
        description="This cannot be undone."
        confirmPhrase={deleting?.address ?? ""}
        confirmHint="Type the street address exactly as it appears above."
        consequence={
          deleting ? (
            <>
              Deleting <strong>{deleting.address}</strong> also deletes{" "}
              <strong>
                {deleting.photoCount} {deleting.photoCount === 1 ? "photo" : "photos"}
              </strong>{" "}
              from storage. If this listing has ever been published, its URL will
              start returning a 404 — consider unpublishing instead.
            </>
          ) : null
        }
        onConfirm={async (typed) => {
          if (!deleting) return;
          const result = await deleteListing(deleting.id, typed);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Listing deleted.");
          setDeleting(null);
          router.refresh();
        }}
      />

      <ConfirmDialog
        open={bulkDelete}
        onOpenChange={setBulkDelete}
        title={`Delete ${selected.size} listings`}
        description="This cannot be undone."
        confirmPhrase={String(selected.size)}
        confirmHint="Type the number of listings to confirm."
        consequence={
          <>
            This deletes <strong>{selected.size} listings</strong> and{" "}
            <strong>{selectedPhotos} photos</strong> from storage. Published URLs
            among them will start returning a 404.
          </>
        }
        onConfirm={async (typed) => {
          const result = await bulkListingAction({
            ids: [...selected],
            action: "delete",
            confirmation: typed,
          });
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success(`${result.data.affected} listings deleted.`);
          setSelected(new Set());
          setBulkDelete(false);
          router.refresh();
        }}
      />
    </div>
  );
}
