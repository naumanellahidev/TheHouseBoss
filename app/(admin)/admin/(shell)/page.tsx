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
import { getSeoSnapshot } from "@/lib/queries/platform";
import { getDashboardPulse, getRecentActivity } from "@/lib/queries/admin";
import { ActivityFeed } from "@/components/admin/dashboard/activity";
import { BreakdownBar, PulseTile } from "@/components/admin/dashboard/pulse";
import { formatPrice } from "@/lib/utils";
import type { AttentionItem } from "@/types/domain";

/**
 * Dashboard — docs/06 § 3.
 *
 * The "Needs attention" panel is the point of this screen. It is what keeps the
 * site healthy without the client needing to understand SEO, so it is computed
 * from real rows and it is given the most space.
 */
/*
  Status labels and colours, in the operator's words rather than the database's.

  `new`, `contacted`, `qualified` are column values; "Waiting on you" is what
  the person reading the bar needs to know. The tones come from the theme so the
  bar cannot drift away from the rest of the palette (HR23).
*/
const LEAD_STATUS_LABEL: Record<string, string> = {
  new: "Waiting on you",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
  spam: "Spam",
};

const LEAD_STATUS_TONE: Record<string, string> = {
  new: "bg-accent",
  contacted: "bg-azure-400",
  qualified: "bg-success",
  closed: "bg-slate-500",
  spam: "bg-slate-300",
};

const LISTING_STATUS_LABEL: Record<string, string> = {
  active: "Active",
  coming_soon: "Coming soon",
  pending: "Under contract",
  sold: "Sold",
  off_market: "Off market",
};

const LISTING_STATUS_TONE: Record<string, string> = {
  active: "bg-success",
  coming_soon: "bg-azure-400",
  pending: "bg-warning",
  sold: "bg-slate-500",
  off_market: "bg-slate-300",
};

export default async function AdminDashboardPage() {
  const [stats, attention, recentLeads, seo, pulse, activity] = await Promise.all([
    getDashboardStats(),
    getNeedsAttention(),
    getLeads({ limit: 5 }),
    // §105. Four counts, no audit — this page is opened many times a day.
    getSeoSnapshot().catch(() => null),
    getDashboardPulse().catch(() => null),
    getRecentActivity(8).catch(() => []),
  ]);

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

      {/* ── Headline tiles ─────────────────────────────────────────────── */}
      {/*
        Six flat totals became four tiles that mean something. The leads tile
        carries a week-on-week direction because that is the only one where the
        comparison is informative; the rest state a total and what it is for.
        See the note in `PulseTile` on why a delta is not put on every tile.
      */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <PulseTile
          label="New enquiries"
          value={stats.newLeads7d}
          href="/admin/leads"
          emphasis
          delta={
            pulse
              ? { current: pulse.leadsThisWeek, previous: pulse.leadsLastWeek }
              : undefined
          }
          hint="Last seven days"
        />

        <PulseTile
          label="Live listings"
          value={stats.publishedListings}
          href="/admin/listings?published=true"
          hint={
            stats.draftListings > 0
              ? `${stats.draftListings} still in draft`
              : "Nothing waiting in draft"
          }
        />

        <PulseTile
          label="For sale"
          value={
            pulse && pulse.activeInventoryValue > 0
              ? formatPrice(pulse.activeInventoryValue, { compact: true })
              : "—"
          }
          href="/admin/listings?status=active"
          hint="Total asking price, live listings"
        />

        <PulseTile
          label="Published writing"
          value={stats.publishedArticles}
          href="/admin/articles"
          hint={
            pulse && pulse.draftArticles > 0
              ? `${pulse.draftArticles} in draft`
              : "Articles and market updates"
          }
        />
      </div>

      {/*
        §105. The SEO snapshot.

        A strip rather than a panel, and only where there is something to say:
        a permanent row of zeroes is noise on the screen an operator opens most
        often. Every number is a count and each links to where it is acted on —
        the same rule as §30, which forbids inventing a score.
      */}
      {seo && (seo.pendingLinks > 0 || seo.queued > 0 || seo.failedJobs > 0) ? (
        <Link
          href="/admin/seo"
          className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="font-semibold text-foreground">Search visibility</span>

          {seo.pendingLinks > 0 ? (
            <span className="text-foreground-muted">
              <span className="tabular font-semibold text-foreground">
                {seo.pendingLinks}
              </span>{" "}
              suggested {seo.pendingLinks === 1 ? "link" : "links"} waiting
            </span>
          ) : null}

          {seo.queued > 0 ? (
            <span className="text-foreground-muted">
              <span className="tabular font-semibold text-foreground">
                {seo.queued}
              </span>{" "}
              queued
            </span>
          ) : null}

          {seo.failedJobs > 0 ? (
            <span className="text-danger">
              <span className="tabular font-semibold">{seo.failedJobs}</span> failed
            </span>
          ) : null}

          <span className="ml-auto text-xs text-foreground-subtle">
            {seo.keywords} search phrases written · open SEO
          </span>
        </Link>
      ) : null}

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

          {/*
            The column under "Needs attention" was empty whenever there was
            little to attend to — which is most days, and is exactly when the
            dashboard looked least like a system being run. These two bars are
            counted from real rows and answer the questions the totals above
            cannot: where the enquiries are stuck, and what the inventory is
            actually made of.
          */}
          {pulse ? (
            <div className="grid gap-4 md:grid-cols-2">
              <BreakdownBar
                title="Enquiry pipeline"
                href="/admin/leads"
                emptyLabel="No enquiries yet. They appear here the moment one arrives."
                segments={pulse.leadsByStatus.map((row) => ({
                  label: LEAD_STATUS_LABEL[row.status] ?? row.status,
                  count: row.count,
                  tone: LEAD_STATUS_TONE[row.status] ?? "bg-slate-400",
                }))}
              />

              <BreakdownBar
                title="Live inventory"
                href="/admin/listings"
                emptyLabel="Nothing published yet."
                segments={pulse.listingsByStatus.map((row) => ({
                  label: LISTING_STATUS_LABEL[row.status] ?? row.status,
                  count: row.count,
                  tone: LISTING_STATUS_TONE[row.status] ?? "bg-slate-400",
                }))}
              />
            </div>
          ) : null}
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
                    {formatBytes(stats.upcomingPurge.freesBytes)}. 
                  </>
                ) : (
                  "Nothing waiting to purge."
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
            Recent enquiries
          </h3>
          <Link
            href="/admin/leads"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            All enquiries
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {recentLeads.length === 0 ? (
          <EmptyState
            icon={Info}
            title="No enquiries yet"
            description="Every form on the site lands here."
          />
        ) : (
          /*
            Cards, not full-width rows.

            A lead is four short facts — who, what about, when, and whether it
            has been answered. Stretched across a 1440px row those four facts
            sit in the left quarter with a button marooned at the far right, and
            the eye has to travel the whole width to connect them. Three to a
            row keeps each one readable as a unit and shows more of them at once.
          */
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {recentLeads.map((lead) => (
              <li
                key={lead.id}
                className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/admin/leads?lead=${lead.id}`}
                    className="rounded-sm text-body font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {lead.name}
                  </Link>
                  <Badge tone={lead.status === "new" ? "accent" : "neutral"}>
                    {lead.status}
                  </Badge>
                </div>

                <p className="text-sm text-foreground-muted">
                  {leadTypeLabel(lead.leadType)}
                  <span className="block text-xs text-foreground-subtle">
                    {relativeTime(lead.createdAt)}
                  </span>
                </p>

                {lead.status === "new" ? (
                  <div className="mt-auto pt-1">
                    <MarkContactedButton leadId={lead.id} />
                  </div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Recent activity, last ──────────────────────────────────────── */}
      {/*
        The bottom of the page, deliberately.

        It is a record of what already happened, so it answers "what changed"
        rather than "what needs me". Everything above is actionable and this is
        not, which is the order they belong in.
      */}
      <ActivityFeed entries={activity} />

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
