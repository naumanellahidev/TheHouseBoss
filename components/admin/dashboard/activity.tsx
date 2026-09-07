import Link from "next/link";
import {
  ArrowRight,
  FileText,
  Home,
  KeyRound,
  Settings as SettingsIcon,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";

import { formatDateTime } from "@/lib/utils/date";
import type { ActivityEntry } from "@/lib/queries/admin";

/**
 * What has been happening, from the audit log (brief §78, §105).
 *
 * ── Why this is not an invented "activity" widget ─────────────────────────
 *
 * Every row is an `audit_logs` entry that was written when the thing actually
 * happened — a publish, a settings change, a password change, an SEO run. None
 * of it is generated for display, which matters because an activity feed is
 * precisely the component most often faked to make a dashboard look alive.
 *
 * ── Why the sentences are written out ─────────────────────────────────────
 *
 * The stored `action` is a machine string: `property_published`,
 * `seo_auto_applied`. Rendering those raw would be honest and unreadable. Each
 * one is mapped to a sentence a person would say — and an action with no
 * mapping falls back to its own name with the underscores removed rather than
 * being hidden, so a new action type shows up as slightly ugly text instead of
 * silently vanishing from the record.
 */

const VERB: Record<string, { text: string; icon: typeof Home }> = {
  property_created: { text: "added a listing", icon: Home },
  property_updated: { text: "updated a listing", icon: Home },
  property_published: { text: "put a listing live", icon: Home },
  property_unpublished: { text: "took a listing down", icon: Home },
  property_deleted: { text: "deleted a listing", icon: Home },

  article_created: { text: "started an article", icon: FileText },
  article_updated: { text: "edited an article", icon: FileText },
  article_published: { text: "published an article", icon: FileText },
  article_deleted: { text: "deleted an article", icon: FileText },

  media_uploaded: { text: "uploaded media", icon: Upload },
  media_deleted: { text: "removed media", icon: Upload },

  lead_updated: { text: "updated an enquiry", icon: UserRound },

  seo_generated: { text: "search phrases worked out", icon: Sparkles },
  seo_auto_applied: { text: "search phrases applied automatically", icon: Sparkles },
  seo_approved: { text: "approved an SEO suggestion", icon: Sparkles },
  seo_rejected: { text: "rejected an SEO suggestion", icon: Sparkles },
  seo_updated: { text: "updated page metadata", icon: Sparkles },
  sitemap_refreshed: { text: "refreshed the sitemap", icon: Sparkles },

  settings_updated: { text: "changed settings", icon: SettingsIcon },
  password_changed: { text: "changed their password", icon: KeyRound },
  password_change_failed: { text: "failed a password change", icon: KeyRound },
  username_changed: { text: "changed their username", icon: KeyRound },
  email_changed: { text: "changed their email", icon: KeyRound },
  session_revoked: { text: "signed out every device", icon: KeyRound },
  user_login: { text: "signed in", icon: UserRound },
  user_logout: { text: "signed out", icon: UserRound },
};

export function ActivityFeed({ entries }: { entries: ActivityEntry[] }) {
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="activity-heading" className="text-h4">
          Recent activity
        </h3>
        <Link
          href="/admin/audit-logs"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent-quiet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Full history
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>

      {entries.length === 0 ? (
        <p className="rounded-lg border border-border bg-surface p-5 text-sm text-foreground-muted">
          Nothing recorded yet. Every publish, upload and settings change appears
          here as it happens.
        </p>
      ) : (
        <ol className="flex flex-col">
          {entries.map((entry, index) => {
            const mapped = VERB[entry.action];
            const Icon = mapped?.icon ?? Sparkles;
            const text = mapped?.text ?? entry.action.replace(/_/g, " ");

            return (
              <li
                key={entry.id}
                className="relative flex gap-4 pb-5 last:pb-0"
              >
                {/*
                  The connecting rule, drawn behind the markers and stopped on
                  the last row so the timeline does not trail off into nothing.
                */}
                {index < entries.length - 1 ? (
                  <span
                    aria-hidden="true"
                    /*
                      `left-4` plus a half-width shift, rather than a hardcoded
                      offset. The marker is `size-8`, so its centre sits on the
                      `4` spacing step, and translating the rule back by half
                      its own width lands it exactly there. HR23 forbids the
                      arbitrary value, and this is more robust anyway: change
                      the marker size and the rule follows it.
                    */
                    className="absolute top-8 left-4 h-full w-px -translate-x-1/2 bg-border"
                  />
                ) : null}

                <span className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-surface">
                  <Icon className="size-4 text-accent-quiet" aria-hidden="true" />
                </span>

                <span className="flex min-w-0 flex-col gap-0.5 pt-1">
                  <span className="text-sm text-foreground">
                    {entry.actor ? (
                      <span className="font-semibold">{entry.actor}</span>
                    ) : (
                      <span className="font-semibold">The system</span>
                    )}{" "}
                    {text}
                  </span>
                  <span className="text-xs text-foreground-subtle">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
