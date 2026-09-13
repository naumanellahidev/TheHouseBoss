import {
  FileText,
  Home,
  KeyRound,
  Settings as SettingsIcon,
  Sparkles,
  Upload,
  UserRound,
} from "lucide-react";

/**
 * What has been happening, from the audit log (brief §78, §105), in words.
 *
 * ── Why this is not an invented "activity" widget ─────────────────────────
 *
 * Every row the dashboard shows is an `audit_logs` entry written when the thing
 * actually happened — a publish, a settings change, a password change, an SEO
 * run. None of it is generated for display, which matters because an activity
 * feed is precisely the component most often faked to make a dashboard look
 * alive.
 *
 * ── Why the sentences are written out ─────────────────────────────────────
 *
 * The stored `action` is a machine string: `property_published`,
 * `seo_auto_applied`. Rendering those raw would be honest and unreadable. Each
 * one is mapped to a sentence a person would say — and an action with no
 * mapping falls back to its own name with the underscores removed rather than
 * being hidden, so a new action type shows up as slightly ugly text instead of
 * silently vanishing from the record.
 *
 * The list itself is drawn by the dashboard's time rail
 * (`components/admin/dashboard/visuals.tsx`). The old standalone feed that used
 * to live here was removed with the redesign; only the vocabulary remains.
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

  // Migration 025: the per-city home page switch on Admin → Cities.
  city_shown_on_home: { text: "put a city on the home page", icon: Home },
  city_hidden_from_home: { text: "took a city off the home page", icon: Home },

  settings_updated: { text: "changed settings", icon: SettingsIcon },
  password_changed: { text: "changed their password", icon: KeyRound },
  password_change_failed: { text: "failed a password change", icon: KeyRound },
  username_changed: { text: "changed their username", icon: KeyRound },
  email_changed: { text: "changed their email", icon: KeyRound },
  session_revoked: { text: "signed out every device", icon: KeyRound },
  user_login: { text: "signed in", icon: UserRound },
  user_logout: { text: "signed out", icon: UserRound },
};

/** The sentence and icon for an audit action, used by the dashboard's time rail. */
export function describeActivity(action: string): { text: string; icon: typeof Home } {
  const mapped = VERB[action];
  return {
    text: mapped?.text ?? action.replace(/_/g, " "),
    icon: mapped?.icon ?? Sparkles,
  };
}
