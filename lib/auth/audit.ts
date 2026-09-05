import "server-only";

import { headers } from "next/headers";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Audit logging.
 *
 * Records who did what, to which record, from where. `audit_logs` has SELECT
 * and INSERT policies and deliberately no UPDATE or DELETE policy, so the trail
 * is append-only for every client — an audit log an administrator can edit is
 * not an audit log.
 *
 * WRITING A LOG MUST NEVER FAIL THE ACTION IT DESCRIBES. A failed log line is a
 * monitoring problem; a publish that fails because logging broke is a product
 * problem. Every function here swallows its own errors and reports them to the
 * server console instead.
 *
 * The service client is used rather than the session client so a log is written
 * even for an action taken by a role whose INSERT policy might later be
 * narrowed. `user_id` is still recorded explicitly, so nothing is anonymised by
 * that choice.
 */

export type AuditAction =
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_updated"
  | "user_deactivated"
  /*
    Account and security, brief §51. `password_change_failed` is here
    deliberately: a run of failures against one account is the signature of
    someone at an unlocked machine guessing, and it is invisible unless it is
    recorded.
  */
  | "password_changed"
  | "password_change_failed"
  | "username_changed"
  | "email_changed"
  | "session_revoked"
  | "property_created"
  | "property_updated"
  | "property_deleted"
  | "property_published"
  | "property_unpublished"
  | "article_created"
  | "article_updated"
  | "article_published"
  | "article_deleted"
  | "community_created"
  | "community_updated"
  | "community_deleted"
  | "review_created"
  | "review_updated"
  | "review_deleted"
  | "media_uploaded"
  | "media_deleted"
  | "lead_updated"
  | "seo_updated"
  /*
    The engine's own vocabulary, brief §78. `seo_generated` and
    `seo_auto_applied` are separated because they mean different things to
    whoever reads this log later: one produced a proposal a person still has to
    look at, the other changed the site without anyone looking.
  */
  | "seo_generated"
  | "seo_approved"
  | "seo_rejected"
  | "seo_auto_applied"
  | "sitemap_refreshed"
  | "redirect_created"
  | "redirect_deleted"
  | "settings_updated"
  | "mls_sync_started"
  | "mls_sync_completed"
  | "mls_sync_failed";

/**
 * JSON-safe metadata.
 *
 * Narrower than `Record<string, unknown>` on purpose. `metadata` is a Postgres
 * `jsonb` column, and `unknown` lets a Date, a Map or a class instance through
 * to `JSON.stringify`, which serialises each of them into something nobody can
 * read back. Constraining it here means the compiler rejects that at the call
 * site rather than the log recording `{}` in production.
 */
type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

type AuditInput = {
  action: AuditAction;
  userId?: string | null;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, JsonValue>;
};

/**
 * The caller's IP and user agent.
 *
 * `x-forwarded-for` is a comma-separated chain; the first entry is the original
 * client. It is trusted here only because Vercel rewrites the header at the
 * edge — behind an arbitrary proxy it would be attacker-controlled and worth
 * nothing.
 */
async function requestContext(): Promise<{ ip: string | null; agent: string | null }> {
  try {
    const h = await headers();
    const forwarded = h.get("x-forwarded-for");
    return {
      ip: forwarded?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
      agent: h.get("user-agent"),
    };
  } catch {
    // `headers()` throws outside a request scope — a cron, a script, a test.
    return { ip: null, agent: null };
  }
}

export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    const { ip, agent } = await requestContext();
    const db = createServiceClient();

    const { error } = await db.from("audit_logs").insert({
      user_id: input.userId ?? null,
      action: input.action,
      entity_type: input.entityType ?? null,
      entity_id: input.entityId ?? null,
      metadata: input.metadata ?? {},
      ip_address: ip,
      user_agent: agent,
    });

    if (error) {
      console.error(`[audit] ${input.action} not recorded: ${error.message}`);
    }
  } catch (error) {
    console.error(`[audit] ${input.action} threw:`, error);
  }
}

/**
 * Raise an admin notification.
 *
 * Same contract as the audit write: it must never be the reason an operation
 * fails. Site-wide rather than per-user, because there is one administrator and
 * a per-user fan-out would be machinery with no readers.
 */
export async function notify(input: {
  kind: "lead" | "mls_sync" | "content" | "system" | "warning";
  title: string;
  body?: string;
  href?: string;
  severity?: "info" | "success" | "warning" | "error";
}): Promise<void> {
  try {
    const db = createServiceClient();
    const { error } = await db.from("notifications").insert({
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
      severity: input.severity ?? "info",
    });
    if (error) console.error(`[notify] ${input.title}: ${error.message}`);
  } catch (error) {
    console.error("[notify] threw:", error);
  }
}
