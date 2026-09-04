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
  Settings,
  Star,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/permissions";

/**
 * Admin sidebar — docs/06-admin-dashboard-spec.md § 2.
 *
 * The full set from the spec, in the spec's order. Every entry has a screen —
 * a nav item pointing at a route that does not exist is worse than one that
 * arrives with its screen, which is why Articles, Cities, Communities and
 * Reviews were held back until Phase 4 built them.
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which key on the badge counts feeds this item, if any. */
  badge?: "leads";
  /**
   * Hide the item unless the signed-in user holds this permission.
   *
   * Hiding is a courtesy, not authorization — the route checks the permission
   * itself and RLS refuses the rows regardless. This only stops the sidebar
   * offering a door that will not open.
   */
  permission?: Permission;
  /** A visual break above this item in the sidebar. */
  startsGroup?: string;
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Building2 },
  { href: "/admin/articles", label: "Articles", icon: FileText },
  { href: "/admin/cities", label: "Cities", icon: MapPin },
  { href: "/admin/communities", label: "Communities", icon: MapPinned },
  { href: "/admin/reviews", label: "Reviews", icon: Star },
  { href: "/admin/leads", label: "Leads", icon: Inbox, badge: "leads" },
  { href: "/admin/media", label: "Media", icon: ImageIcon },

  {
    href: "/admin/mls",
    label: "MLS",
    icon: Database,
    startsGroup: "Integrations",
  },
  { href: "/admin/seo", label: "SEO", icon: Globe, permission: "manage_seo" },

  {
    href: "/admin/users",
    label: "Users",
    icon: Users,
    permission: "manage_users",
    startsGroup: "System",
  },
  {
    href: "/admin/audit-logs",
    label: "Audit logs",
    icon: ScrollText,
    permission: "view_audit_logs",
  },
  { href: "/admin/settings", label: "Settings", icon: Settings },
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
