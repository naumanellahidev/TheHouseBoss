"use server";

import { getAdminIdentity } from "@/lib/auth/permissions";
import { getNotifications, type AdminNotification } from "@/lib/queries/notifications";

/**
 * The bell's refresh.
 *
 * ── Why the bell polls at all ─────────────────────────────────────────────
 *
 * The admin shell is a server component, so its counts are as old as the last
 * navigation. On a desktop that is usually fine. Installed on a phone it is
 * not: the app is left open on one screen for hours, and an enquiry that
 * arrived in that time is invisible until something else causes a render —
 * which is exactly the situation the bell exists for.
 *
 * ── Why not `router.refresh()` ────────────────────────────────────────────
 *
 * That re-renders the whole layout: the storage meter, the navigation, the
 * identity lookup, every query behind them. This reads two small tables, and
 * only while the tab is actually visible.
 *
 * ── Why it checks the session every time ──────────────────────────────────
 *
 * A server action is a public endpoint. Polling makes it one that is called
 * every minute, for hours, from a phone that may have been locked, suspended
 * and woken on a different network. `getAdminIdentity()` is the same check the
 * layout makes, and an expired session gets an empty list rather than a leak.
 */
export async function fetchNotifications(): Promise<AdminNotification[]> {
  const identity = await getAdminIdentity();
  if (!identity) return [];

  try {
    return await getNotifications();
  } catch (error) {
    console.error("[notifications] refresh failed:", error);
    return [];
  }
}
