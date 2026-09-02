"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";

import { runOrphanSweep } from "@/app/(admin)/admin/(shell)/media/actions";
import { formatBytes } from "@/lib/storage/budget";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

/**
 * The orphans tab — docs/06 § 9.
 *
 * "Orphan" is jargon, so the panel never uses the word on its own: it explains
 * what these files are (uploads whose listing was deleted, or an upload that
 * failed halfway) before offering to remove them.
 *
 * The 24-hour safety window is stated, because otherwise a photo uploaded five
 * minutes ago not appearing here looks like a bug.
 */
export function OrphanPanel({
  strayObjects,
  strayRows,
  reclaimableBytes,
  skippedRecent,
}: {
  strayObjects: number;
  strayRows: number;
  reclaimableBytes: number;
  skippedRecent: number;
}) {
  const toast = useToast();
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  const total = strayObjects + strayRows;

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-5 shadow-xs">
      <div className="flex flex-col gap-1.5">
        <h3 className="text-h4">Unused files</h3>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Files in storage that nothing on the site points at any more — usually
          a listing that was deleted, or an upload that failed halfway through.
          They cost storage and nothing else.
        </p>
      </div>

      {total === 0 ? (
        <p className="text-sm text-foreground-muted">
          Nothing to clean up. Every stored file is accounted for.
          {skippedRecent > 0 ? (
            <>
              {" "}
              {skippedRecent} recent {skippedRecent === 1 ? "upload was" : "uploads were"}{" "}
              skipped — anything under 24 hours old is left alone in case it is
              still being worked on.
            </>
          ) : null}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-3">
              <dt className="text-xs text-foreground-subtle">Files with no record</dt>
              <dd className="text-h4 font-semibold text-foreground tabular">
                {strayObjects}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-3">
              <dt className="text-xs text-foreground-subtle">Records with no owner</dt>
              <dd className="text-h4 font-semibold text-foreground tabular">
                {strayRows}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded-md bg-surface-sunken p-3">
              <dt className="text-xs text-foreground-subtle">Would free</dt>
              <dd className="text-h4 font-semibold text-foreground tabular">
                {formatBytes(reclaimableBytes)}
              </dd>
            </div>
          </dl>

          <Button
            variant="outline"
            loading={pending}
            className="self-start"
            onClick={async () => {
              setPending(true);
              const result = await runOrphanSweep();
              setPending(false);

              if (!result.ok) {
                toast.error(result.error);
                return;
              }
              const summary = `${result.message ?? "Done."} Freed about ${formatBytes(result.freedBytes ?? 0)}.`;
              setDone(summary);
              toast.success(summary);
            }}
          >
            <Sparkles aria-hidden="true" />
            Clean up now
          </Button>
        </>
      )}

      {done ? (
        <p role="status" className="text-sm text-success">
          {done}
        </p>
      ) : null}
    </div>
  );
}
