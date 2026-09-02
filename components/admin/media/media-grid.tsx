"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

import { deleteMediaKeys } from "@/app/(admin)/admin/(shell)/media/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { formatBytes } from "@/lib/storage/budget";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { keyUrl } from "@/lib/storage/url";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { MediaItem } from "@/types/domain";

/**
 * Media library grid — docs/06 § 9.
 *
 * Sorted by size descending by default, because the reason to open this screen
 * is almost always "what is using the space".
 *
 * Deleting something still referenced is blocked by the server action, and the
 * block comes back with a link to the listing that holds it. That link is the
 * whole point: "cannot delete" without saying what is holding it is a dead end.
 */
export function MediaGrid({ items }: { items: MediaItem[] }) {
  const router = useRouter();
  const toast = useToast();

  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [confirming, setConfirming] = React.useState(false);
  const [blocked, setBlocked] = React.useState<
    { key: string; label: string; href: string }[] | null
  >(null);

  const selectedItems = items.filter((item) => selected.has(item.key));
  const selectedBytes = selectedItems.reduce((n, item) => n + item.bytes, 0);

  function toggle(key: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {selected.size > 0 ? (
        <div
          role="region"
          aria-label="Media selection"
          className="flex flex-wrap items-center gap-3 rounded-lg border border-accent/40 bg-accent-wash p-3"
        >
          <p className="mr-auto text-sm font-medium text-foreground">
            {selected.size} selected · {formatBytes(selectedBytes)}
          </p>
          <Button variant="danger" size="sm" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Delete
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      ) : null}

      {blocked ? (
        <div
          role="alert"
          className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning-bg p-4"
        >
          <p className="text-sm font-semibold text-foreground">
            Some of those files are still in use
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {blocked.map((entry) => (
              <li key={entry.key}>
                <Link
                  href={entry.href}
                  className="text-accent-quiet underline underline-offset-4 hover:text-foreground"
                >
                  {entry.label}
                </Link>
              </li>
            ))}
          </ul>
          <Button
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => setBlocked(null)}
          >
            Dismiss
          </Button>
        </div>
      ) : null}

      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
        {items.map((item) => {
          const isSelected = selected.has(item.key);
          return (
            <li
              key={item.id}
              className={cn(
                "flex flex-col gap-2 rounded-lg border bg-surface p-3 shadow-xs",
                isSelected ? "border-accent" : "border-border",
              )}
            >
              <div className="relative aspect-4/3 overflow-hidden rounded-md bg-surface-sunken">
                <Image
                  src={keyUrl(item.key, 400)}
                  alt=""
                  fill
                  sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 45vw"
                  className="object-cover"
                  unoptimized
                />
              </div>

              <dl className="flex flex-col gap-0.5 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-foreground-subtle">Size</dt>
                  <dd className="font-medium text-foreground tabular">
                    {formatBytes(item.bytes)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-foreground-subtle">Dimensions</dt>
                  <dd className="text-foreground tabular">
                    {item.width && item.height ? `${item.width}×${item.height}` : "—"}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-foreground-subtle">Used by</dt>
                  <dd className="text-foreground capitalize">{item.entityType}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-foreground-subtle">Added</dt>
                  <dd className="text-foreground">{formatDate(item.createdAt)}</dd>
                </div>
              </dl>

              <label className="mt-auto inline-flex min-h-11 items-center gap-2 text-sm text-foreground-muted">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggle(item.key)}
                  className="size-4 accent-accent"
                />
                Select
              </label>
            </li>
          );
        })}
      </ul>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Delete ${selected.size} ${selected.size === 1 ? "file" : "files"}`}
        description="This cannot be undone."
        confirmPhrase={String(selected.size)}
        confirmHint="Type the number of files to confirm."
        consequence={
          <>
            This frees about <strong>{formatBytes(selectedBytes)}</strong>. Files
            still used by a listing are refused — you will be told which.
          </>
        }
        onConfirm={async () => {
          const result = await deleteMediaKeys([...selected]);
          if (!result.ok) {
            toast.error(result.error);
            setBlocked(result.blockedBy ?? null);
            setConfirming(false);
            return;
          }
          toast.success(`${selected.size} files deleted.`);
          setSelected(new Set());
          setConfirming(false);
          router.refresh();
        }}
      />
    </div>
  );
}
