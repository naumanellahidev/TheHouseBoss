import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Permission checks for the admin platform.
 *
 * `server-only` at the top is load-bearing: importing this from a Client
 * Component becomes a build error rather than a runtime surprise. Authorization
 * that can be reached from the browser is decoration.
 *
 * THIS IS LAYER TWO OF THREE. The layers, in order of authority:
 *
 *   1. `proxy.ts`      — turns an anonymous visitor away from /admin
 *   2. these functions — refuse the action in the server component or action
 *   3. RLS             — refuses the query even if 1 and 2 are bypassed
 *
 * Layer 3 is the one that actually protects the data. `has_permission()` in
 * migration 014 is the same predicate the policies use, so this cannot drift
 * from what the database will allow: if the check here passes and the policy
 * denies, the query still fails. They are two readings of one rule, not two
 * rules.
 */

export const PERMISSIONS = [
  "manage_properties",
  "manage_articles",
  "manage_communities",
  "manage_reviews",
  "manage_media",
  "manage_leads",
  "manage_users",
  "manage_seo",
  "manage_settings",
  "manage_integrations",
  "view_analytics",
  "view_audit_logs",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  "super_admin",
  "admin",
  "editor",
  "content_manager",
  "viewer",
] as const;

export type Role = (typeof ROLES)[number];

/** Human labels for the admin UI. Kept beside the values so they cannot drift. */
export const ROLE_LABELS: Record<Role, string> = {
  super_admin: "Super admin",
  admin: "Administrator",
  editor: "Editor",
  content_manager: "Content manager",
  viewer: "Viewer",
};

export const PERMISSION_LABELS: Record<Permission, string> = {
  manage_properties: "Manage properties",
  manage_articles: "Manage articles",
  manage_communities: "Manage communities",
  manage_reviews: "Manage reviews",
  manage_media: "Manage media",
  manage_leads: "Manage leads",
  manage_users: "Manage users",
  manage_seo: "Manage SEO",
  manage_settings: "Manage settings",
  manage_integrations: "Manage integrations",
  view_analytics: "View analytics",
  view_audit_logs: "View audit logs",
};

export type AdminIdentity = {
  id: string;
  username: string | null;
  displayName: string | null;
  email: string | null;
  role: Role;
  status: "active" | "suspended";
  permissions: Permission[];
};

/**
 * Who is signed in, and what may they do?
 *
 * One round trip: the profile and its role's grants come back together, so a
 * page that renders eight permission-gated panels does not make eight calls.
 * Returns null for a signed-out visitor and for a suspended account — a
 * suspended admin is treated as no admin at all, which is why `status` is
 * checked here as well as inside `has_permission()`.
 */
export async function getAdminIdentity(): Promise<AdminIdentity | null> {
  const db = await createSupabaseServerClient();

  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return null;

  const { data: profile } = await db
    .from("profiles")
    .select("id, username, display_name, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.status !== "active") return null;

  const role = profile.role as Role;

  const { data: grants } = await db
    .from("role_permissions")
    .select("permission")
    .eq("role", role);

  return {
    id: profile.id,
    username: profile.username,
    displayName: profile.display_name,
    email: user.email ?? null,
    role,
    status: profile.status as "active" | "suspended",
    permissions: (grants ?? []).map((g) => g.permission as Permission),
  };
}

/** Non-throwing check, for deciding whether to render a control. */
export async function can(permission: Permission): Promise<boolean> {
  const identity = await getAdminIdentity();
  return identity?.permissions.includes(permission) ?? false;
}

export class PermissionError extends Error {
  constructor(readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "PermissionError";
  }
}

/**
 * Throwing check, for the top of a server action.
 *
 * Every mutating action begins with this. Hiding a button is a courtesy to the
 * person using the UI; it is not authorization, because the action is reachable
 * without the button.
 */
export async function requirePermission(
  permission: Permission,
): Promise<AdminIdentity> {
  const identity = await getAdminIdentity();
  if (!identity || !identity.permissions.includes(permission)) {
    throw new PermissionError(permission);
  }
  return identity;
}
