import "server-only";

import { createServiceClient } from "@/lib/supabase/service";
import type { LeadType } from "@/types/domain";

/**
 * The notification feed behind the bell.
 *
 * ── Why there is no notifications table ───────────────────────────────────
 *
 * A notification here is not a record of something that happened. It is a piece
 * of work that is still waiting: an enquiry nobody has answered, a review nobody
 * has approved. That state already exists — `leads.status = 'new'` and a review
 * with `published = false` and a `submitted_at` — and deriving the feed from it
 * means the bell cannot disagree with the screens it links to.
 *
 * A table would need a row written on every insert, a row updated on every
 * status change, and a backfill for everything that happened before it existed.
 * Three places to drift, in exchange for storing a fact the database already
 * holds.
 *
 * It also decides what "read" means. There is no dismiss button, deliberately:
 * an item leaves the bell when the work is done — the enquiry is marked
 * contacted, the review is approved or rejected. A notification you can hide
 * without doing anything is a notification that stops being true, and on an
 * enquiry from a buyer that is the one failure that costs money.
 *
 * ── Service client, like every other admin read ───────────────────────────
 *
 * `leads` and unpublished `reviews` are invisible to the public role by RLS.
 * The route that calls this checks the session first (`app/(admin)/layout.tsx`
 * and the proxy), which is the same shape as every other query in `admin.ts`.
 */

export type NotificationPriority = "urgent" | "high" | "normal";

export type AdminNotification = {
  /** Stable across refetches: "lead:<uuid>" or "review:<uuid>". */
  id: string;
  kind: "lead" | "review";
  priority: NotificationPriority;
  /** Who, and what kind of thing it is. */
  title: string;
  /** One line of what they actually said. */
  detail: string;
  href: string;
  createdAt: string;
  /** Why it is ranked where it is. Null when the ranking is obvious. */
  reason: string | null;
};

/* ── Priority ─────────────────────────────────────────────────────────────── */

/**
 * How long a new enquiry may sit before it is late.
 *
 * Four hours, not twenty-four. The industry number everyone quotes is that a
 * lead contacted inside five minutes converts several times better than one
 * contacted an hour later; four hours is already well past that and is the
 * point at which the bell should be saying so rather than listing it politely
 * among the others.
 */
const LATE_AFTER_MS = 4 * 60 * 60 * 1000;

/**
 * What each kind of enquiry is worth answering first.
 *
 * A showing request has a date attached to it and stops being useful once the
 * date passes, so it outranks everything. The financing enquiries come next:
 * somebody who typed "assumable" or "VA" has already self-selected into the two
 * things this business is built around (brief § 1), and they are the hardest
 * enquiries to win back if they go unanswered.
 */
const LEAD_RANK: Record<LeadType, { priority: NotificationPriority; label: string }> = {
  showing_request: { priority: "urgent", label: "Showing request" },
  va: { priority: "high", label: "VA enquiry" },
  assumable: { priority: "high", label: "Assumable enquiry" },
  new_construction: { priority: "high", label: "New-construction enquiry" },
  seller: { priority: "high", label: "Seller enquiry" },
  listing_inquiry: { priority: "normal", label: "Listing enquiry" },
  general: { priority: "normal", label: "Enquiry" },
};

const PRIORITY_ORDER: Record<NotificationPriority, number> = {
  urgent: 0,
  high: 1,
  normal: 2,
};

/** "2 days", "3 hours", "just now" — for the overdue line, not the timestamp. */
function waitedFor(createdAt: string, now: number): string {
  const ms = now - new Date(createdAt).getTime();
  const hours = Math.floor(ms / 3_600_000);
  if (hours < 1) return "under an hour";
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  const days = Math.floor(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/** The first line of a message, short enough to read at a glance. */
function firstLine(value: string | null, max = 90): string {
  const clean = (value ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/* ── The feed ─────────────────────────────────────────────────────────────── */

export async function getNotifications(limit = 12): Promise<AdminNotification[]> {
  const db = createServiceClient();
  const now = Date.now();

  /*
    Both reads are capped and both degrade on their own.

    A failure fetching reviews must not empty the bell of enquiries: the bell is
    the only place an unanswered enquiry is visible from every screen, and a
    silent empty state would read as "nothing waiting".
  */
  const [leadRows, reviewRows] = await Promise.all([
    db
      .from("leads")
      .select("id, name, message, lead_type, created_at")
      .eq("status", "new")
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[notifications] leads: ${error.message}`);
          return [];
        }
        return data ?? [];
      }),
    db
      .from("reviews")
      .select("id, author_name, body, rating, submitted_at")
      .eq("published", false)
      .not("submitted_at", "is", null)
      .order("submitted_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (error) {
          console.error(`[notifications] reviews: ${error.message}`);
          return [];
        }
        return data ?? [];
      }),
  ]);

  const items: AdminNotification[] = [];

  for (const row of leadRows) {
    const rank = LEAD_RANK[row.lead_type as LeadType] ?? LEAD_RANK.general;
    const waited = now - new Date(row.created_at).getTime();
    const late = waited > LATE_AFTER_MS;

    items.push({
      id: `lead:${row.id}`,
      kind: "lead",
      // Age promotes, never demotes. A showing request that is also late is
      // still urgent; a general enquiry that has sat for two days becomes one.
      priority: late ? "urgent" : rank.priority,
      title: `${rank.label} — ${row.name}`,
      detail: firstLine(row.message) || "No message — contact details only.",
      /*
        The leads screen keeps the open lead in the query string rather than on
        its own route, so this is the link that actually opens it. A path that
        does not exist would 404 from the one place she taps most.
      */
      href: `/admin/leads?lead=${row.id}`,
      createdAt: row.created_at,
      reason: late ? `Unanswered for ${waitedFor(row.created_at, now)}` : null,
    });
  }

  for (const row of reviewRows) {
    const rating = typeof row.rating === "number" ? row.rating : null;

    /*
      A low rating is ranked up, not down.

      The instinct is to treat a one-star review as something to deal with
      later. It is the opposite: it is public once it is approved, it is the one
      a reply matters most on, and leaving it sitting unapproved does not make
      it go away — the person who wrote it is waiting to see whether it appears.
    */
    const unhappy = rating !== null && rating <= 3;

    items.push({
      id: `review:${row.id}`,
      kind: "review",
      priority: unhappy ? "high" : "normal",
      title: `Review to approve — ${row.author_name}`,
      detail: firstLine(row.body),
      href: "/admin/reviews",
      createdAt: row.submitted_at as string,
      reason: unhappy ? `${rating} out of 5 — worth reading before you decide` : null,
    });
  }

  /*
    Priority first, then newest.

    Not newest first with a colour on the side: a feed sorted by time asks the
    operator to scan it and rank it herself every time she opens it, which is
    the job the priority is meant to have already done.
  */
  return items
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, limit);
}

/** Counts for the badge, without fetching the bodies. */
export type NotificationCounts = { total: number; urgent: number };

export function countNotifications(items: AdminNotification[]): NotificationCounts {
  return {
    total: items.length,
    urgent: items.filter((item) => item.priority === "urgent").length,
  };
}
