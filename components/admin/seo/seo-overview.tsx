"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";

import {
  bulkAnalyseListings,
  drainQueueNow,
  generateMissingSeo,
  refreshSitemap,
  retryFailedJobs,
  runAudit,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { SeoCoverage, SeoPage } from "@/lib/queries/platform";
import { cn } from "@/lib/utils";
import { formatDateTime, relativeTime } from "@/lib/utils/date";

/**
 * SEO → Overview (docs/06 § 12).
 *
 * The screen answers one question first: what is wrong, and what do I press.
 * Everything here is either a count over real rows or a button that does one
 * thing. There is no score: a single number invented from weighted counts is
 * the kind of figure §30 rules out, because nobody can act on it.
 */

export type QueueCounts = {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
};

type Finding = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  action?: { label: string; onRun: () => Promise<void> };
  href?: string;
};

const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 158;

export function SeoOverview({
  pages,
  coverage,
  queue,
  pendingLinks,
  sitemapUrlCount,
  lastSitemapRefresh,
  sitemapStale,
  modelName,
  onGoToTab,
  onRefresh,
}: {
  pages: SeoPage[];
  coverage: SeoCoverage;
  queue: QueueCounts;
  pendingLinks: number;
  sitemapUrlCount: number;
  lastSitemapRefresh: string | null;
  /** Computed on the server: more than thirty days since the last ping. */
  sitemapStale: boolean;
  modelName: string | null;
  onGoToTab: (tab: string) => void;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function run(key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(key);
    try {
      const result = await fn();
      if (result.ok) {
        toast.success(result.message ?? "Done.");
        onRefresh();
      } else {
        toast.error(result.error ?? "That did not work.");
      }
    } finally {
      setBusy(null);
    }
  }

  /* ── Counts over the rows in front of us ──────────────────────────────── */

  const missingTitle = pages.filter((page) => !page.title?.trim()).length;
  const missingDescription = pages.filter((page) => !page.description?.trim()).length;
  const longTitles = pages.filter((page) => (page.title?.length ?? 0) > TITLE_MAX).length;
  const shortDescriptions = pages.filter(
    (page) => (page.description?.length ?? 0) > 0 && (page.description?.length ?? 0) < DESC_MIN,
  ).length;
  const longDescriptions = pages.filter(
    (page) => (page.description?.length ?? 0) > DESC_MAX,
  ).length;
  const noindexed = pages.filter((page) => page.noindex).length;
  const uncovered = coverage.total - coverage.covered;
  const coveragePercent =
    coverage.total === 0 ? 100 : Math.round((coverage.covered / coverage.total) * 100);

  /* ── What needs a person ──────────────────────────────────────────────── */

  const findings: Finding[] = [];

  if (uncovered > 0) {
    findings.push({
      id: "uncovered",
      severity: "high",
      title: `${uncovered} published ${uncovered === 1 ? "page has" : "pages have"} no metadata`,
      detail:
        "A page with no title or description is written by the search engine instead of by you. Generate them, then review.",
      action: {
        label: "Generate the missing ones",
        onRun: () => run("generate", generateMissingSeo),
      },
    });
  }

  if (queue.failed > 0) {
    findings.push({
      id: "failed",
      severity: "high",
      title: `${queue.failed} generation ${queue.failed === 1 ? "job" : "jobs"} failed`,
      detail:
        "A failed job means that record still carries whatever metadata it had before. Retrying is safe; it re-reads the record.",
      action: { label: "Retry failed jobs", onRun: () => run("retry", retryFailedJobs) },
    });
  }

  if (missingDescription > 0 || missingTitle > 0) {
    findings.push({
      id: "blank",
      severity: "medium",
      title: `${Math.max(missingTitle, missingDescription)} ${
        Math.max(missingTitle, missingDescription) === 1 ? "row is" : "rows are"
      } missing a title or description`,
      detail: "These rows exist but are blank, so the page falls back to its built-in copy.",
      href: "pages",
    });
  }

  if (longTitles + longDescriptions + shortDescriptions > 0) {
    findings.push({
      id: "length",
      severity: "medium",
      title: `${longTitles + longDescriptions + shortDescriptions} out of length`,
      detail: `Titles over ${TITLE_MAX} characters get truncated; descriptions outside ${DESC_MIN}–${DESC_MAX} get rewritten by the search engine.`,
      href: "pages",
    });
  }

  if (pendingLinks > 0) {
    findings.push({
      id: "links",
      severity: "medium",
      title: `${pendingLinks} internal ${pendingLinks === 1 ? "link" : "links"} waiting for a decision`,
      detail: "Suggested links are never added to a page until you accept them.",
      href: "links",
    });
  }

  if (coverage.orphaned.length > 0) {
    findings.push({
      id: "orphaned",
      severity: "low",
      title: `${coverage.orphaned.length} metadata ${
        coverage.orphaned.length === 1 ? "row points" : "rows point"
      } at nothing`,
      detail:
        "The record behind these was deleted or unpublished. They are harmless and worth tidying.",
      href: "pages",
    });
  }

  /*
    Staleness is decided by the server page, not here.

    "A month ago" needs a clock, and a clock read during render makes the
    component produce a different tree from identical props — which is what
    React means by impure. The server has a clock and renders once, so it does
    the subtraction and this renders the answer.
  */
  if (!lastSitemapRefresh || sitemapStale) {
    findings.push({
      id: "sitemap",
      severity: "low",
      title: lastSitemapRefresh ? "The sitemap has not been pinged in a month" : "The sitemap has never been pinged",
      detail:
        "Search engines re-read the sitemap on their own schedule; a ping asks them to look sooner. It costs nothing.",
      action: { label: "Ping search engines", onRun: () => run("sitemap", refreshSitemap) },
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {/* ── The numbers ───────────────────────────────────────────────── */}
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tile
          label="Metadata coverage"
          value={`${coveragePercent}%`}
          hint={`${coverage.covered} of ${coverage.total} published records`}
          tone={coveragePercent >= 95 ? "good" : coveragePercent >= 70 ? "warn" : "bad"}
        />
        <Tile
          label="Pages with metadata"
          value={pages.length}
          hint={noindexed > 0 ? `${noindexed} deliberately noindexed` : "All indexable"}
        />
        <Tile
          label="In the queue"
          value={queue.queued + queue.processing}
          hint={
            queue.failed > 0
              ? `${queue.failed} failed`
              : queue.completed > 0
                ? `${queue.completed} completed`
                : "Nothing waiting"
          }
          tone={queue.failed > 0 ? "bad" : "neutral"}
        />
        <Tile
          label="Sitemap"
          value={sitemapUrlCount}
          hint={
            lastSitemapRefresh
              ? `Pinged ${relativeTime(lastSitemapRefresh)}`
              : "Never pinged"
          }
        />
      </ul>

      {/* ── What needs you ────────────────────────────────────────────── */}
      <section aria-labelledby="needs-you" className="admin-card flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="needs-you" className="text-h4">
            What needs you
          </h3>
          {modelName ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-foreground-muted">
              <Sparkles className="size-3.5 text-accent-quiet" aria-hidden="true" />
              Writing with {modelName}
            </span>
          ) : (
            <span className="text-xs text-foreground-muted">
              Deterministic writer — no model configured
            </span>
          )}
        </div>

        {findings.length === 0 ? (
          <p className="flex items-start gap-3 rounded-2xl bg-success-bg p-4 text-sm text-foreground">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
            Every published page has metadata, nothing failed, and no links are waiting.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {findings.map((finding) => (
              <li
                key={finding.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 rounded-2xl p-4",
                  finding.severity === "high"
                    ? "bg-danger-bg"
                    : finding.severity === "medium"
                      ? "bg-warning-bg"
                      : "bg-info-bg",
                )}
              >
                {finding.severity === "high" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                ) : finding.severity === "medium" ? (
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                ) : (
                  <Info className="mt-0.5 size-4 shrink-0 text-info" aria-hidden="true" />
                )}

                <span className="flex min-w-50 flex-1 flex-col gap-1">
                  <span className="text-sm font-semibold text-foreground">{finding.title}</span>
                  <span className="text-xs leading-relaxed text-foreground-muted">
                    {finding.detail}
                  </span>
                </span>

                {finding.action ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    loading={busy !== null}
                    onClick={() => void finding.action!.onRun()}
                  >
                    {finding.action.label}
                  </Button>
                ) : finding.href ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full"
                    onClick={() => onGoToTab(finding.href!)}
                  >
                    Open
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Coverage by kind ──────────────────────────────────────────── */}
      <section aria-labelledby="coverage" className="admin-card flex flex-col gap-4 p-5">
        <h3 id="coverage" className="text-h4">
          Coverage by kind
        </h3>
        <ul className="flex flex-col gap-3">
          {coverage.groups.map((group) => {
            const percent =
              group.total === 0 ? 100 : Math.round((group.covered / group.total) * 100);
            return (
              <li key={group.label} className="flex flex-col gap-1.5">
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-medium text-foreground">{group.label}</span>
                  <span className="text-foreground-muted tabular">
                    {group.covered} / {group.total}
                  </span>
                </div>
                <div
                  className="h-2 overflow-hidden rounded-full bg-surface-sunken"
                  role="progressbar"
                  aria-valuenow={percent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${group.label}: ${percent} percent covered`}
                >
                  <div
                    className={cn(
                      "h-full rounded-full",
                      percent >= 95 ? "bg-success" : percent >= 70 ? "bg-warning" : "bg-danger",
                    )}
                    style={{ width: `${Math.max(percent, 2)}%` }}
                  />
                </div>
                {group.missing.length > 0 ? (
                  <p className="text-xs text-foreground-subtle">
                    Missing: {group.missing.slice(0, 3).join(", ")}
                    {group.missing.length > 3 ? ` and ${group.missing.length - 3} more` : ""}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {/* ── Everything you can run ────────────────────────────────────── */}
      <section aria-labelledby="actions" className="admin-card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h3 id="actions" className="text-h4">
            Run something
          </h3>
          <p className="text-sm text-foreground-muted">
            Each of these reads real records and reports what it changed. None of them
            publishes anything on its own unless the engine is set to apply automatically.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Action
            icon={Wand2}
            label="Generate missing metadata"
            busy={busy === "generate"}
            disabled={busy !== null}
            onClick={() => void run("generate", generateMissingSeo)}
          />
          <Action
            icon={FileText}
            label="Audit the site"
            busy={busy === "audit"}
            disabled={busy !== null}
            onClick={() =>
              void run("audit", async () => {
                const report = await runAudit();
                return {
                  ok: true,
                  message: `Audit finished: ${report?.findings?.length ?? 0} findings.`,
                };
              })
            }
          />
          <Action
            icon={Sparkles}
            label="Analyse every listing"
            busy={busy === "listings"}
            disabled={busy !== null}
            onClick={() => void run("listings", bulkAnalyseListings)}
          />
          <Action
            icon={RefreshCw}
            label="Work the queue now"
            busy={busy === "drain"}
            disabled={busy !== null}
            onClick={() => void run("drain", drainQueueNow)}
          />
          <Action
            icon={RefreshCw}
            label="Ping search engines"
            busy={busy === "sitemap"}
            disabled={busy !== null}
            onClick={() => void run("sitemap", refreshSitemap)}
          />
        </div>

        <dl className="grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-foreground-subtle">Queue</dt>
            <dd className="text-foreground">
              {queue.queued} queued · {queue.processing} running · {queue.failed} failed
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-foreground-subtle">Last sitemap ping</dt>
            <dd className="text-foreground">
              {lastSitemapRefresh ? formatDateTime(lastSitemapRefresh) : "Never"}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-foreground-subtle">Public files</dt>
            <dd className="flex flex-wrap gap-3">
              <Link
                href="/sitemap.xml"
                target="_blank"
                className="text-accent-quiet underline underline-offset-4"
              >
                sitemap.xml
              </Link>
              <Link
                href="/robots.txt"
                target="_blank"
                className="text-accent-quiet underline underline-offset-4"
              >
                robots.txt
              </Link>
              <Link
                href="/llms.txt"
                target="_blank"
                className="text-accent-quiet underline underline-offset-4"
              >
                llms.txt
              </Link>
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "good" | "warn" | "bad" | "neutral";
}) {
  return (
    <li className="admin-card flex flex-col gap-1 p-5">
      <span className="text-overline font-semibold tracking-[0.12em] text-foreground-subtle uppercase">
        {label}
      </span>
      <span
        className={cn(
          "font-display text-h2 leading-none tabular",
          tone === "good" && "text-success",
          tone === "warn" && "text-warning",
          tone === "bad" && "text-danger",
          tone === "neutral" && "text-foreground",
        )}
      >
        {value}
      </span>
      {hint ? <span className="text-xs text-foreground-muted">{hint}</span> : null}
    </li>
  );
}

function Action({
  icon: Icon,
  label,
  busy,
  disabled,
  onClick,
}: {
  icon: typeof Wand2;
  label: string;
  busy: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      className="rounded-full"
      loading={busy}
      disabled={disabled && !busy}
      onClick={onClick}
    >
      <Icon aria-hidden="true" />
      {label}
    </Button>
  );
}

