import {
  Building2,
  Database,
  FileText,
  Globe,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MapPin,
  MapPinned,
  ScrollText,
  LayoutTemplate,
  Settings,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

/**
 * Admin navigation — docs/06-admin-dashboard-spec.md § 2.
 *
 * Every entry has a screen — a nav item pointing at a route that does not exist
 * is worse than one that arrives with its screen.
 *
 * `section` decides where an item sits in the top pill navigation:
 *
 *   main     a pill of its own in the bar
 *   content  inside the "Content" menu
 *   system   inside the "Settings" menu
 *
 * Fourteen pills do not fit a bar; seven do. The grouping follows how often she
 * opens each screen, not how the database is laid out.
 */
export type AdminNavSection = "main" | "content" | "system";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  section: AdminNavSection;
  /** Which key on the badge counts feeds this item, if any. */
  badge?: "leads" | "reviews";
  /**
   * Hide the item unless the signed-in user holds this permission.
   *
   * Hiding is a courtesy, not authorization — the route checks the permission
   * itself and RLS refuses the rows regardless. This only stops the navigation
   * offering a door that will not open.
   */
  permission?: Permission;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, section: "main" },
  { href: "/admin/listings", label: "Listings", icon: Building2, section: "main" },
  /*
    "Enquiries", not "Leads". It is what the dashboard already calls them and
    what she calls them; the route and the screen's own heading are unchanged.
  */
  { href: "/admin/leads", label: "Enquiries", icon: Inbox, section: "main", badge: "leads" },

  { href: "/admin/articles", label: "Articles", icon: FileText, section: "content" },
  { href: "/admin/cities", label: "Cities", icon: MapPin, section: "content" },
  { href: "/admin/communities", label: "Communities", icon: MapPinned, section: "content" },
  {
    href: "/admin/pages",
    label: "Pages",
    icon: LayoutTemplate,
    section: "content",
    permission: "manage_settings",
  },

  { href: "/admin/reviews", label: "Reviews", icon: Star, section: "main", badge: "reviews" },
  { href: "/admin/media", label: "Media", icon: ImageIcon, section: "main" },
  { href: "/admin/seo", label: "SEO", icon: Globe, section: "main", permission: "manage_seo" },

  { href: "/admin/settings", label: "Settings", icon: Settings, section: "system" },
  { href: "/admin/mls", label: "MLS", icon: Database, section: "system" },
  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    section: "system",
    permission: "manage_users",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit logs",
    icon: ScrollText,
    section: "system",
    permission: "view_audit_logs",
  },
];

/**
 * The items this user should actually see.
 *
 * An entry with no `permission` is visible to anyone who reached the dashboard
 * at all — reaching it already required passing the proxy and the layout's
 * admin check.
 */
export function visibleAdminNav(permissions: readonly Permission[]): AdminNavItem[] {
  return adminNav.filter(
    (item) => !item.permission || permissions.includes(item.permission),
  );
}

/** `/admin` must match exactly; every other entry matches its subtree. */
export function isActiveAdminRoute(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
