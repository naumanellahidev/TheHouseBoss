"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { deleteArticle } from "@/app/(admin)/admin/(shell)/content-actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ResponsiveTable, type Column } from "@/components/site/responsive-table";
import { relativeTime } from "@/lib/utils/date";
import type { AdminArticleRow } from "@/lib/queries/admin";

/**
 * The articles table.
 *
 * Below 768px every row becomes a card, the same as the listings table — a
 * horizontally scrolling table is never the mobile experience (docs/04 § 6).
 *
 * Delete takes a typed confirmation of the title. It removes the article's
 * images from storage too, so it is not an action to make easy.
 */

const COLUMNS: Column[] = [
  { key: "title", header: "Title", primary: true },
  { key: "kind", header: "Kind" },
  { key: "city", header: "City" },
  { key: "status", header: "Status" },
  { key: "reading", header: "Length", align: "end" },
  { key: "updated", header: "Updated", hideOnCard: true },
];

const KIND_LABELS: Record<string, string> = {
  blog: "Blog post",
  market_update: "Market update",
  guide: "Guide",
};

export function ArticleTable({ rows }: { rows: AdminArticleRow[] }) {
  const router = useRouter();
  const toast = useToast();
  const [deleting, setDeleting] = React.useState<AdminArticleRow | null>(null);

  function renderCell(row: AdminArticleRow, column: Column): React.ReactNode {
    switch (column.key) {
      case "title":
        return (
          <span className="flex flex-col gap-1">
            <Link
              href={`/admin/articles/${row.id}/edit`}
              className="rounded-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              {row.title}
            </Link>
            {row.tags.length > 0 ? (
              <span className="text-xs text-foreground-subtle">
                {row.tags.slice(0, 4).join(" · ")}
              </span>
            ) : null}
          </span>
        );

      case "kind":
        return KIND_LABELS[row.kind] ?? row.kind;

      case "city":
        return row.cityName ?? "—";

      case "status":
        return (
          <Badge
            tone={
              row.status === "published"
                ? "active"
                : row.status === "archived"
                  ? "neutral"
                  : "pending"
            }
          >
            {row.status}
          </Badge>
        );

      case "reading":
        return (
          <span className="tabular">
            {row.readingMin ? `${row.readingMin} min` : "—"}
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

  function renderActions(row: AdminArticleRow) {
    return (
      <>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/articles/${row.id}/edit`} aria-label={`Edit ${row.title}`}>
            <Pencil aria-hidden="true" />
          </Link>
        </Button>

        <Button asChild variant="ghost" size="sm">
          <a
            href={`/admin/preview/article/${row.id}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Preview ${row.title}`}
          >
            <Eye aria-hidden="true" />
          </a>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-danger-bg hover:text-danger"
          onClick={() => setDeleting(row)}
          aria-label={`Delete ${row.title}`}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </>
    );
  }

  return (
    <>
      <ResponsiveTable
        caption="Articles"
        columns={COLUMNS}
        rows={rows}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        renderActions={renderActions}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this article"
        description="This cannot be undone."
        confirmPhrase={deleting?.title ?? ""}
        confirmHint="Type the title exactly as it appears above."
        consequence={
          deleting ? (
            <>
              Deleting <strong>{deleting.title}</strong> also removes every image
              in it from storage.
              {deleting.status === "published"
                ? " It is currently published, so its URL will start returning a 404 — consider moving it to Archived instead."
                : ""}
            </>
          ) : null
        }
        onConfirm={async (typed) => {
          if (!deleting) return;
          const result = await deleteArticle(deleting.id, typed);
          if (!result.ok) {
            toast.error(result.error);
            return;
          }
          toast.success("Article deleted.");
          setDeleting(null);
          router.refresh();
        }}
      />
    </>
  );
}
