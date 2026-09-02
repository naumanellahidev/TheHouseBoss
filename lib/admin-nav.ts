import {
  Building2,
  FileText,
  Image as ImageIcon,
  Inbox,
  LayoutDashboard,
  MapPin,
  MapPinned,
  Settings,
  Star,
  type LucideIcon,
} from "lucide-react";

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
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

/** `/admin` must match exactly; every other entry matches its subtree. */
export function isActiveAdminRoute(pathname: string, href: string): boolean {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}
