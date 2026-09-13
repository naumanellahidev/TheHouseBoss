import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";

import {
  BigNumber,
  EnquiryCalendar,
  EnquiryChart,
  PipelineStrip,
  RecentEnquiries,
  StorageDonut,
  TodayRail,
} from "@/components/admin/dashboard/visuals";
import { Button } from "@/components/ui/button";
import {
  getDashboardPulse,
  getDashboardStats,
  getLeadActivity,
  getNeedsAttention,
  getRecentActivity,
} from "@/lib/queries/admin";
import { getLeads } from "@/lib/queries/leads";
import { getSeoSnapshot } from "@/lib/queries/platform";
import { formatBytes } from "@/lib/storage/budget";
import { getAdminProfile } from "@/lib/supabase/server";
import { formatPrice } from "@/lib/utils";
import { formatDateTime, formatLongDay, hourInNewYork } from "@/lib/utils/date";

/**
 * Dashboard — docs/06 § 3.
 *
 * Laid out on the client's reference dashboard: a greeting with the enquiry
 * pipeline and three very large numbers, then a grid of cards — what needs her
 * and what happened, the latest enquiries, a calendar and a weekly chart of
 * enquiries, and storage against its ceiling.
 *
 * "Needs attention" still leads the grid. It is what keeps the site healthy
 * without the client needing to understand SEO.
 */
export default async function AdminDashboardPage() {
  const [stats, attention, recentLeads, seo, pulse, activity, leadActivity, admin] =
    await Promise.all([
      getDashboardStats(),
      getNeedsAttention(),
      getLeads({ limit: 5 }),
      // §105. Four counts, no audit — this page is opened many times a day.
      getSeoSnapshot().catch(() => null),
      getDashboardPulse().catch(() => null),
      getRecentActivity(5).catch(() => []),
      getLeadActivity().catch((error) => {
        console.error("[dashboard] lead activity", error);
        return null;
      }),
      getAdminProfile(),
    ]);

  const now = new Date();
  const hour = hourInNewYork(now);
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  /*
    A first name only when the profile holds a real one. The seeded account's
    full name is literally "admin", and "Good evening, admin" reads as a bug.
  */
  const fullName = (admin?.profile as { full_name?: string | null } | undefined)?.full_name?.trim();
  const firstName = fullName && !/^admin$/i.test(fullName) ? fullName.split(/\s+/)[0] : null;

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* ── Greeting, pipeline, big numbers ──────────────────────────────── */}
      <section
        aria-labelledby="greeting-heading"
        className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-10"
      >
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-7">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-foreground-muted">{formatLongDay(now)} · Lake Mary</p>
            <h2 id="greeting-heading" className="text-h1 font-normal">
              {greeting}
              {firstName ? `, ${firstName}` : ""}
            </h2>
          </div>
          <PipelineStrip counts={pulse?.leadsByStatus ?? []} />
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5 lg:items-end">
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <Button asChild variant="accent" className="rounded-full">
              <Link href="/admin/listings/new">
                <Plus aria-hidden="true" />
                Add listing
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/admin/articles/new">Write an article</Link>
            </Button>
          </div>

          <ul className="flex flex-wrap gap-x-10 gap-y-4 lg:justify-end">
            <li>
              <BigNumber
                label="Live listings"
                value={stats.publishedListings}
                href="/admin/listings?published=true"
              />
            </li>
            <li>
              <BigNumber
                label="Enquiries, 7 days"
                value={stats.newLeads7d}
                href="/admin/leads"
                delta={
                  pulse ? { current: pulse.leadsThisWeek, previous: pulse.leadsLastWeek } : undefined
                }
              />
            </li>
            <li>
              <BigNumber label="Published writing" value={stats.publishedArticles} href="/admin/articles" />
            </li>
          </ul>

          {pulse && pulse.activeInventoryValue > 0 ? (
            <p className="text-sm text-foreground-muted">
              <span className="font-semibold text-foreground tabular">
                {formatPrice(pulse.activeInventoryValue, { compact: true })}
              </span>{" "}
              for sale across live listings
              {stats.draftListings > 0 ? ` · ${stats.draftListings} in draft` : ""}
            </p>
          ) : null}
        </div>
      </section>

      {/*
        §105. The SEO snapshot — only when there is something to say, and every
        number links to where it is acted on.
      */}
      {seo && (seo.pendingLinks > 0 || seo.queued > 0 || seo.failedJobs > 0) ? (
        <Link
          href="/admin/seo"
          className="admin-card flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-sm transition-shadow duration-(--dur-fast) hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="font-semibold text-foreground">Search visibility</span>
          {seo.pendingLinks > 0 ? (
            <span className="text-foreground-muted">
              <span className="tabular font-semibold text-foreground">{seo.pendingLinks}</span>{" "}
              suggested {seo.pendingLinks === 1 ? "link" : "links"} waiting
            </span>
          ) : null}
          {seo.queued > 0 ? (
            <span className="text-foreground-muted">
              <span className="tabular font-semibold text-foreground">{seo.queued}</span> queued
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

      {/* ── The grid ─────────────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12 xl:gap-5">
        <TodayRail
          attention={attention}
          activity={activity}
          className="lg:col-span-4 xl:col-span-3 xl:row-span-2"
        />

        <RecentEnquiries leads={recentLeads} className="lg:col-span-8 xl:col-span-6" />

        {leadActivity ? (
          <>
            <EnquiryCalendar data={leadActivity} className="lg:col-span-5 xl:col-span-3" />
            <EnquiryChart data={leadActivity} className="lg:col-span-7 xl:col-span-6" />
          </>
        ) : null}

        <StorageDonut
          usage={stats.storage}
          className="lg:col-span-12 xl:col-span-3"
          footer={
            <div className="flex flex-col gap-3 border-t border-border pt-4">
              <p className="flex items-start gap-2.5 text-xs text-foreground-muted">
                <Trash2 className="mt-0.5 size-4 shrink-0 text-accent-quiet" aria-hidden="true" />
                {stats.upcomingPurge.count > 0 && stats.upcomingPurge.date ? (
                  <span>
                    Next purge:{" "}
                    <span className="font-medium text-foreground">
                      {stats.upcomingPurge.count}{" "}
                      {stats.upcomingPurge.count === 1 ? "listing" : "listings"}
                    </span>{" "}
                    on {formatDateTime(stats.upcomingPurge.date, { dateOnly: true })}, freeing about{" "}
                    {formatBytes(stats.upcomingPurge.freesBytes)}.
                  </span>
                ) : (
                  <span>Nothing waiting to purge.</span>
                )}
              </p>
              <Button asChild variant="outline" block className="rounded-full">
                <Link href="/admin/media">Open the media library</Link>
              </Button>
            </div>
          }
        />
      </div>
    </div>
  );
}
