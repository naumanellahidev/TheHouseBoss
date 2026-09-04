import { ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveTable } from "@/components/site/responsive-table";
import { Badge } from "@/components/ui/badge";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { getAuditLogs, type AuditEntry } from "@/lib/queries/platform";
import { formatDateTime } from "@/lib/utils/date";

export const dynamic = "force-dynamic";

/**
 * The audit trail.
 *
 * Read-only by construction, not by convention: `audit_logs` has SELECT and
 * INSERT policies and deliberately no UPDATE or DELETE policy, so there is no
 * edit control here because there is no way to edit a row. An audit trail an
 * administrator can amend is not an audit trail.
 *
 * Gated on `view_audit_logs`. The check below renders a useful message; RLS is
 * what actually refuses the rows, so a user without the grant sees an empty
 * result even if this page were reached another way.
 */

/** Colour and wording per action family. Never colour alone — always a label. */
function toneFor(action: string): "neutral" | "active" | "sold" | "pending" {
  if (action.startsWith("mls_")) return "pending";
  if (action.includes("deleted") || action.includes("deactivated")) return "sold";
  if (action.includes("published") || action.includes("created")) return "active";
  return "neutral";
}

function describe(entry: AuditEntry): string {
  const outcome = entry.metadata.outcome;
  if (entry.action === "user_login" && typeof outcome === "string") {
    return (
      {
        success: "Signed in",
        bad_password: "Failed — wrong password",
        unknown_or_suspended: "Failed — unknown or suspended account",
        rate_limited: "Blocked — too many attempts",
      }[outcome] ?? outcome
    );
  }
  return entry.action.replace(/_/g, " ");
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const identity = await getAdminIdentity();
  const params = await searchParams;

  if (!identity?.permissions.includes("view_audit_logs")) {
    return (
      <>
        <AdminPageHeader title="Audit logs" />
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to the audit log"
          description="Viewing the audit trail needs the view_audit_logs permission. Ask a super admin if you need it."
        />
      </>
    );
  }

  const page = Math.max(1, Number(params.page ?? 1) || 1);
  const { entries, total } = await getAuditLogs({ page, perPage: 50 });

  return (
    <>
      <AdminPageHeader
        title="Audit logs"
        description={`${total.toLocaleString()} recorded ${total === 1 ? "action" : "actions"}. This log cannot be edited or deleted by anyone, including a super admin.`}
      />

      {entries.length === 0 ? (
        <EmptyState
          icon={ShieldAlert}
          title="Nothing recorded yet"
          description="Sign-ins, publishes, deletions and MLS syncs appear here as they happen."
        />
      ) : (
        <ResponsiveTable
          caption="Administrative actions, newest first"
          columns={[
            { key: "when", header: "When", primary: true },
            { key: "who", header: "Who" },
            { key: "what", header: "Action" },
            { key: "entity", header: "Record" },
            { key: "ip", header: "IP", hideOnCard: true },
          ]}
          rows={entries}
          getRowKey={(row) => row.id}
          renderCell={(row, column) => {
            switch (column.key) {
              case "when":
                return (
                  <span className="text-sm whitespace-nowrap tabular">
                    {formatDateTime(row.createdAt)}
                  </span>
                );
              case "who":
                return (
                  <span className="text-sm">
                    {row.actor?.displayName ??
                      row.actor?.username ??
                      // A null actor is a deleted account, not an anonymous
                      // action — the row is kept precisely so that is visible.
                      (row.actor ? "Unnamed" : "Deleted account")}
                  </span>
                );
              case "what":
                return (
                  <Badge tone={toneFor(row.action)}>{describe(row)}</Badge>
                );
              case "entity":
                return row.entityType ? (
                  <span className="text-xs text-foreground-subtle">
                    {row.entityType}
                    {row.entityId ? ` · ${row.entityId.slice(0, 8)}` : ""}
                  </span>
                ) : (
                  <span className="text-xs text-foreground-subtle">—</span>
                );
              case "ip":
                return (
                  <span className="text-xs text-foreground-subtle tabular">
                    {row.ipAddress ?? "—"}
                  </span>
                );
              default:
                return null;
            }
          }}
        />
      )}
    </>
  );
}
