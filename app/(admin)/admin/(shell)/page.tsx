import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CircleAlert,
  Info,
  Plus,
  Trash2,
} from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { MarkContactedButton } from "@/components/admin/leads/mark-contacted-button";
import { StorageMeter } from "@/components/admin/storage-meter";
import { formatBytes } from "@/lib/storage/budget";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { leadTypeLabel } from "@/lib/email/templates";
import { getDashboardStats, getNeedsAttention } from "@/lib/queries/admin";
import { getLeads } from "@/lib/queries/leads";
import { formatDateTime, relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/types/domain";

/**
 * Dashboard — docs/06 § 3.
 *
 * The "Needs attention" panel is the point of this screen. It is what keeps the
 * site healthy without the client needing to understand SEO, so it is computed
 * from real rows and it is given the most space.
 */
export default async function AdminDashboardPage() {
  const [stats, attention, recentLeads] = await Promise.all([
    getDashboardStats(),
    getNeedsAttention(),
    getLeads({ limit: 5 }),
  ]);

  const tiles = [
    { label: "New leads (7d)", value: stats.newLeads7d, href: "/admin/leads" },
    { label: "Published", value: stats.publishedListings, href: "/admin/listings?published=true" },
    { label: "Active", value: stats.activeListings, href: "/admin/listings?status=active" },
    { label: "Drafts", value: stats.draftListings, href: "/admin/listings?published=false" },
    { label: "Articles", value: stats.publishedArticles, href: "/admin/listings" },
    {
      label: "Storage used",
      value: formatBytes(stats.storage.totalBytes),
      href: "/admin/media",
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Dashboard"
        description="Everything that needs a decision today, in one place."
        actions={
          <>
            <Button asChild variant="accent">
              <Link href="/admin/listings/new">
                <Plus aria-hidden="true" />
                Add listing
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/leads">View leads</Link>
            </Button>
          </>
        }
      />

      {/* ── Stat tiles ─────────────────────────────────────────────────── */}
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className={cn(
                "flex h-full flex-col gap-1 rounded-lg border border-border bg-surface p-4 shadow-xs",
                "transition-shadow duration-(--dur-fast) hover:shadow-md",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              )}
            >
              <span className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                {tile.label}
              </span>
              <span className="text-h3 font-semibold text-foreground tabular">
                {tile.value}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Needs attention ──────────────────────────────────────────── */}
        <section
          aria-labelledby="attention-heading"
          className="flex flex-col gap-4 lg:col-span-2"
        >
          <h3 id="attention-heading" className="text-h4">
            Needs attention
          </h3>

          {attention.length === 0 ? (
            <EmptyState
              icon={Info}
              title="Nothing needs attention"
              description="No overdue purges, no missing alt text, no published listing without a meta description. This panel fills itself in as the site grows."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {attention.map((item) => (
                <li key={item.id}>
                  <AttentionRow item={item} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ── Storage detail ───────────────────────────────────────────── */}
        <section
          aria-labelledby="storage-heading"
          className="flex flex-col gap-4"
        >
          <h3 id="storage-heading" className="text-h4">
            Storage
          </h3>

          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5 shadow-xs">
            <StorageMeter usage={stats.storage} variant="panel" />

            <dl className="flex flex-col gap-2 border-t border-border pt-4 text-sm">
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-foreground-muted">Listings</dt>
                <dd className="font-medium text-foreground tabular">
                  {formatBytes(stats.storage.listingBytes)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-foreground-muted">Articles</dt>
                <dd className="font-medium text-foreground tabular">
                  {formatBytes(stats.storage.articleBytes)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-foreground-muted">Everything else</dt>
                <dd className="font-medium text-foreground tabular">
                  {formatBytes(stats.storage.otherBytes)}
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-4">
                <dt className="text-foreground-muted">Objects</dt>
                <dd className="font-medium text-foreground tabular">
                  {stats.storage.objectCount}
                </dd>
              </div>
            </dl>

            <div className="flex items-start gap-2.5 border-t border-border pt-4 text-xs text-foreground-muted">
              <Trash2 className="mt-0.5 size-4 shrink-0 text-accent-quiet" aria-hidden="true" />
              <p>
                {stats.upcomingPurge.count > 0 && stats.upcomingPurge.date ? (
                  <>
                    Next purge:{" "}
                    <span className="font-medium text-foreground">
                      {stats.upcomingPurge.count}{" "}
                      {stats.upcomingPurge.count === 1 ? "listing" : "listings"}
                    </span>{" "}
                    on {formatDateTime(stats.upcomingPurge.date, { dateOnly: true })}, freeing about{" "}
                    {formatBytes(stats.upcomingPurge.freesBytes)}. The page stays
                    live and keeps its ranking.
                  </>
                ) : (
                  "No sold listings are waiting to purge. Large photos are removed 7 days after a sale; the 400px version and the page itself are kept forever."
                )}
              </p>
            </div>

            <Button asChild variant="outline" size="sm" block>
              <Link href="/admin/media">Open the media library</Link>
            </Button>
          </div>
        </section>
      </div>

      {/* ── Recent leads ───────────────────────────────────────────────── */}
      <section aria-labelledby="recent-leads-heading" className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h3 id="recent-leads-heading" className="text-h4">
            Recent leads
          </h3>
          <Link
            href="/admin/leads"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            All leads
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <EmptyState
            icon={Info}
            title="No enquiries yet"
            description="Every form on the public site writes here. The contact page, each guide, and every listing enquiry all land in this inbox."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {recentLeads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/leads?lead=${lead.id}`}
                      className="rounded-sm text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {lead.name}
                    </Link>
                    <Badge tone={lead.status === "new" ? "accent" : "neutral"}>
                      {lead.status}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-foreground-muted">
                    {leadTypeLabel(lead.leadType)} · {relativeTime(lead.createdAt)}
                  </p>
                </div>

                {lead.status === "new" ? (
                  <MarkContactedButton leadId={lead.id} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

const SEVERITY = {
  high: { icon: CircleAlert, ring: "border-danger/30 bg-danger-bg", color: "text-danger" },
  medium: { icon: AlertTriangle, ring: "border-warning/30 bg-warning-bg", color: "text-warning" },
  low: { icon: Info, ring: "border-border bg-surface", color: "text-info" },
} as const;

function AttentionRow({ item }: { item: AttentionItem }) {
  const style = SEVERITY[item.severity];
  const Icon = style.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 shadow-xs",
        "transition-shadow duration-(--dur-fast) hover:shadow-md",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        style.ring,
      )}
    >
      <Icon className={cn("mt-0.5 size-5 shrink-0", style.color)} aria-hidden="true" />
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-sm font-semibold text-foreground">{item.label}</span>
        <span className="text-xs leading-relaxed text-foreground-muted">
          {item.detail}
        </span>
      </div>
      <ArrowRight
        className="mt-0.5 ml-auto size-4 shrink-0 text-foreground-subtle"
        aria-hidden="true"
      />
    </Link>
  );
}
