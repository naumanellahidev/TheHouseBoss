import {
  Building2,
  Image as ImageIcon,
  LayoutDashboard,
  Inbox,
  Settings,
  type LucideIcon,
} from "lucide-react";

/**
 * Admin sidebar — docs/06-admin-dashboard-spec.md § 2.
 *
 * Only sections that exist are listed. The spec's shell also shows Articles,
 * Cities, Communities and Reviews; those screens are Phase 4 (content system),
 * and a nav entry pointing at a route that does not exist is worse than a nav
 * entry that arrives with its screen. Add them here in P4, in this order:
 *
 *   Dashboard · Listings · Articles · Cities · Communities · Reviews · Leads ·
 *   Media · Settings
 */
export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Which key on the badge counts feeds this item, if any. */
  badge?: "leads";
};

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Building2 },
  { href: "/admin/leads", label: "Leads", icon: Inbox, badge: "leads" },
  { href: "/admin/media", label: "Media", icon: ImageIcon },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** `/admin` must match exactly; every other entry matches its subtree. */
export function isActiveAdminRoute(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
