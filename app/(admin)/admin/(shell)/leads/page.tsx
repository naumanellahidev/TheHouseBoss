import Link from "next/link";
import { Inbox } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { LeadDetail } from "@/components/admin/leads/lead-detail";
import { LeadFilters } from "@/components/admin/leads/lead-filters";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/site/empty-state";
import { leadTypeLabel } from "@/lib/email/templates";
import { getLeadById, getLeads } from "@/lib/queries/leads";
import { getAdminListingById } from "@/lib/queries/admin";
import { relativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";
import type { Lead, LeadType } from "@/types/domain";

export const metadata = { title: "Leads" };

/**
 * Leads inbox — docs/06 § 8.
 *
 * List on the left, detail on the right, stacked below 1024px. The selection
 * lives in `?lead=<id>` rather than in component state, so a specific lead is
 * a shareable link — which is exactly what the notification email needs to
 * point at.
 *
 * This is one of the three screens that must be fully usable at 360px
 * (docs/06 § 11 rule 8): the client reads leads on her phone.
 */
export default async function AdminLeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const leads = await getLeads({
    status: (params.status as Lead["status"]) || undefined,
    leadType: (params.type as LeadType) || undefined,
    search: params.q || undefined,
    limit: 200,
  });

  const selected = params.lead
    ? ((await getLeadById(params.lead)) ?? null)
    : (leads[0] ?? null);

  // Only fetched when the lead actually references a listing, so the common
  // case costs nothing.
  const listing = selected?.listingId
    ? await getAdminListingById(selected.listingId)
    : null;

  const newCount = leads.filter((lead) => lead.status === "new").length;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Leads"
        description={
          leads.length > 0
            ? `${leads.length} ${leads.length === 1 ? "enquiry" : "enquiries"}${newCount > 0 ? `, ${newCount} unopened` : ""}.`
            : undefined
        }
      />

      <LeadFilters />

      {leads.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={
            params.q || params.status || params.type
              ? "No leads match these filters"
              : "No enquiries yet"
          }
          description={
            params.q || params.status || params.type
              ? "Try clearing the search or the status filter."
              : "Every form on the public site writes here — the contact page, each guide, and every listing enquiry. You will also get an email the moment one arrives."
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          {/* ── List ─────────────────────────────────────────────────── */}
          <ul className="flex flex-col gap-2 lg:col-span-2">
            {leads.map((lead) => {
              const active = selected?.id === lead.id;
              return (
                <li key={lead.id}>
                  <Link
                    href={`/admin/leads?${new URLSearchParams({
                      ...(params.status ? { status: params.status } : {}),
                      ...(params.type ? { type: params.type } : {}),
                      ...(params.q ? { q: params.q } : {}),
                      lead: lead.id,
                    }).toString()}`}
                    scroll={false}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "flex flex-col gap-1.5 rounded-lg border p-4 shadow-xs",
                      "transition-colors duration-(--dur-fast)",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                      active
                        ? "border-accent bg-accent-wash"
                        : "border-border bg-surface hover:bg-surface-sunken",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "text-sm text-foreground",
                          // Unopened leads are highlighted until read
                          // (docs/06 § 8).
                          lead.status === "new" ? "font-bold" : "font-medium",
                        )}
                      >
                        {lead.name}
                      </span>
                      {lead.status === "new" ? (
                        <Badge tone="accent">New</Badge>
                      ) : null}
                    </div>
                    <p className="truncate text-xs text-foreground-muted">
                      {leadTypeLabel(lead.leadType)} · {relativeTime(lead.createdAt)}
                    </p>
                    {lead.message ? (
                      <p className="line-clamp-2 text-xs text-foreground-subtle">
                        {lead.message}
                      </p>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* ── Detail ───────────────────────────────────────────────── */}
          <div className="lg:col-span-3">
            {selected ? (
              <LeadDetail lead={selected} listingAddress={listing?.address ?? null} />
            ) : (
              <EmptyState
                icon={Inbox}
                title="Select a lead"
                description="Choose an enquiry from the list to see the full message and contact details."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
