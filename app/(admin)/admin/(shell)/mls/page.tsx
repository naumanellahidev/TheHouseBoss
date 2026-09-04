import { AlertTriangle, Database, PlugZap } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveTable } from "@/components/site/responsive-table";
import { Badge } from "@/components/ui/badge";
import { getMlsSources, getMlsSyncRuns } from "@/lib/queries/platform";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * The MLS sync centre.
 *
 * **This screen must never claim a connection that does not exist.**
 * `mls_sources.is_connected` is written only by a real connection test, never
 * by hand and never by a seed, so "Not connected" here is the truth about
 * Stellar MLS rather than a placeholder waiting to be flipped.
 *
 * There is deliberately no "Sync now" button while a source is disconnected. A
 * button that cannot work is worse than no button: it invites a click, fails,
 * and teaches the person using it that the dashboard lies.
 *
 * The architecture behind it is real and ready — `lib/listings/` has the
 * provider abstraction, `listings` carries `source`, `source_id`, `mls_number`,
 * `synced_at`, `is_locked` and `raw`, and `mls_sync_runs` / `mls_sync_errors`
 * are the history those jobs will write. What is missing is credentials and
 * brokerage approval, which is a paperwork problem, not a code one
 * (docs/11-mls-future.md).
 */
export default async function MlsPage() {
  const [sources, runs] = await Promise.all([getMlsSources(), getMlsSyncRuns()]);

  const stellar = sources.find((s) => s.slug === "stellar_mls");

  return (
    <>
      <AdminPageHeader
        title="MLS"
        description="Listing sources and their synchronisation history."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {sources.map((source) => (
          <div
            key={source.slug}
            className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5 shadow-xs"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex flex-col gap-1">
                <span className="text-h4 font-semibold">{source.label}</span>
                <span className="text-xs text-foreground-subtle">
                  {source.slug}
                </span>
              </span>
              <Badge tone={source.isConnected ? "active" : "neutral"}>
                {source.isConnected ? "Connected" : "Not connected"}
              </Badge>
            </div>

            <p className="text-sm text-foreground-muted">
              {source.slug === "manual"
                ? "Listings entered by hand in this dashboard. This is the live source today."
                : "Requires brokerage-level IDX credentials and a compliance review before it can be enabled."}
            </p>

            {source.lastTestedAt ? (
              <p className="text-xs text-foreground-subtle tabular">
                Last tested {formatDateTime(source.lastTestedAt)}
              </p>
            ) : null}
          </div>
        ))}
      </div>

      {!stellar?.isConnected ? (
        <div className="flex gap-3 rounded-lg border border-border bg-warning-bg p-4">
          <AlertTriangle
            className="mt-0.5 size-5 shrink-0 text-warning"
            aria-hidden="true"
          />
          <div className="flex flex-col gap-1.5 text-sm">
            <p className="font-semibold text-foreground">
              Stellar MLS is not connected, and nothing here pretends otherwise.
            </p>
            <p className="text-foreground-muted">
              IDX access is granted to the brokerage rather than to an individual
              agent, and takes two to four weeks of paperwork and compliance
              review. The database, the provider abstraction and this sync
              history are already in place, so enabling it later is a
              configuration change rather than a rebuild — see{" "}
              <code className="rounded-sm bg-surface px-1 py-0.5 text-xs">
                docs/11-mls-future.md
              </code>
              .
            </p>
          </div>
        </div>
      ) : null}

      <section className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold">Sync history</h2>

        {runs.length === 0 ? (
          <EmptyState
            icon={Database}
            title="No syncs have run"
            description="Once a source is connected, every run appears here with what it created, updated, removed and failed."
          />
        ) : (
          <ResponsiveTable
            caption="MLS synchronisation runs, newest first"
            columns={[
              { key: "started", header: "Started", primary: true },
              { key: "source", header: "Source" },
              { key: "status", header: "Status" },
              { key: "counts", header: "Records" },
              { key: "duration", header: "Duration", hideOnCard: true },
            ]}
            rows={runs}
            getRowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "started":
                  return (
                    <span className="text-sm whitespace-nowrap tabular">
                      {formatDateTime(row.startedAt)}
                    </span>
                  );
                case "source":
                  return <span className="text-sm">{row.sourceSlug}</span>;
                case "status":
                  return (
                    <Badge
                      tone={
                        row.status === "succeeded"
                          ? "active"
                          : row.status === "failed"
                            ? "sold"
                            : "pending"
                      }
                    >
                      {row.status}
                    </Badge>
                  );
                case "counts":
                  return (
                    <span className="text-xs text-foreground-muted tabular">
                      {row.created} new · {row.updated} updated ·{" "}
                      {row.removed} removed
                      {row.failed > 0 ? ` · ${row.failed} failed` : ""}
                    </span>
                  );
                case "duration":
                  return (
                    <span className="text-xs text-foreground-subtle tabular">
                      {row.durationMs
                        ? `${(row.durationMs / 1000).toFixed(1)}s`
                        : "—"}
                    </span>
                  );
                default:
                  return null;
              }
            }}
          />
        )}
      </section>

      <p className="flex items-center gap-2 text-sm text-foreground-subtle">
        <PlugZap className="size-4" aria-hidden="true" />
        Manual listings are unaffected by any of this and continue to work
        normally.
      </p>
    </>
  );
}
