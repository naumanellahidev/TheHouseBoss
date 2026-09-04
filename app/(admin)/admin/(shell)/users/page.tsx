import { ShieldAlert, Users } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveTable } from "@/components/site/responsive-table";
import { Badge } from "@/components/ui/badge";
import {
  getAdminIdentity,
  PERMISSION_LABELS,
  ROLE_LABELS,
  type Permission,
} from "@/lib/auth/permissions";
import { getAdminUsers, getRoleMatrix } from "@/lib/queries/platform";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * User management.
 *
 * Gated on `manage_users`, which only `super_admin` holds — an `admin` can run
 * the whole product but cannot change who else has access. That separation is
 * the point of having two administrative roles at all.
 *
 * **No password is displayed, and none can be.** They live hashed in
 * `auth.users` and are not readable by anything in this application, including
 * the service role. Resetting one is `npm run admin:credentials`, which sets a
 * new value through the Auth Admin API and prints it once.
 */
export default async function UsersPage() {
  const identity = await getAdminIdentity();

  if (!identity?.permissions.includes("manage_users")) {
    return (
      <>
        <AdminPageHeader title="Users" />
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to user management"
          description="Managing administrators needs the manage_users permission, which only a super admin holds."
        />
      </>
    );
  }

  const [users, matrix] = await Promise.all([getAdminUsers(), getRoleMatrix()]);

  return (
    <>
      <AdminPageHeader
        title="Users"
        description="Who can sign in to this dashboard, and what each role allows."
      />

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No accounts yet" />
      ) : (
        <ResponsiveTable
          caption="Administrator accounts"
          columns={[
            { key: "who", header: "Account", primary: true },
            { key: "role", header: "Role" },
            { key: "status", header: "Status" },
            { key: "last", header: "Last signed in", hideOnCard: true },
          ]}
          rows={users}
          getRowKey={(row) => row.id}
          renderCell={(row, column) => {
            switch (column.key) {
              case "who":
                return (
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold">
                      {row.displayName ?? row.fullName ?? "Unnamed"}
                    </span>
                    <span className="text-xs text-foreground-subtle">
                      {row.username ? `@${row.username}` : "no username set"}
                    </span>
                  </span>
                );
              case "role":
                return <Badge tone="neutral">{ROLE_LABELS[row.role]}</Badge>;
              case "status":
                return (
                  <Badge tone={row.status === "active" ? "active" : "sold"}>
                    {row.status === "active" ? "Active" : "Suspended"}
                  </Badge>
                );
              case "last":
                return (
                  <span className="text-xs text-foreground-subtle tabular">
                    {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : "Never"}
                  </span>
                );
              default:
                return null;
            }
          }}
        />
      )}

      {/*
        The grant matrix, read from `role_permissions` rather than restated
        here. If the matrix and this screen disagreed, this screen would be the
        one that is wrong — so it does not get its own copy.
      */}
      <section className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold">What each role allows</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(matrix) as (keyof typeof matrix)[])
            .filter((role) => matrix[role]?.length)
            .map((role) => (
              <div
                key={role}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4 shadow-xs"
              >
                <h3 className="text-sm font-semibold">{ROLE_LABELS[role]}</h3>
                <ul className="flex flex-col gap-1">
                  {matrix[role].map((permission: Permission) => (
                    <li key={permission} className="text-xs text-foreground-muted">
                      {PERMISSION_LABELS[permission] ?? permission}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </div>
      </section>

      <p className="text-sm text-foreground-subtle">
        Passwords are stored hashed by Supabase Auth and cannot be read by this
        dashboard or by anyone using it. To set or reset one, run{" "}
        <code className="rounded-sm bg-surface-sunken px-1.5 py-0.5">
          npm run admin:credentials
        </code>
        .
      </p>
    </>
  );
}
