import { createServiceClient } from "@/lib/supabase/service";
import type { Lead, LeadType } from "@/types/domain";

/**
 * Lead reads and writes.
 *
 * Reads are admin-only and use the service client — RLS blocks every SELECT on
 * `leads` for anon and for non-admins, which is deliberate: a visitor must
 * never be able to read a lead, not even their own.
 *
 * Callers must have passed `requireAdmin()` first. Phase 2 builds the inbox UI
 * on top of these.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toLead(row: Record<string, any>): Lead {
  return {
    id: row.id,
    name: row.name ?? "",
    email: row.email ?? "",
    phone: row.phone ?? null,
    message: row.message ?? null,
    leadType: (row.lead_type ?? "general") as LeadType,
    sourcePage: row.source_page ?? null,
    listingId: row.listing_id ?? null,
    utm: row.utm ?? null,
    status: row.status ?? "new",
    notes: row.notes ?? null,
    createdAt: row.created_at,
  };
}

const COLUMNS =
  "id, name, email, phone, message, lead_type, source_page, listing_id, utm, status, notes, created_at";

export async function getLeads(opts: {
  status?: Lead["status"];
  leadType?: LeadType;
  search?: string;
  limit?: number;
} = {}): Promise<Lead[]> {
  const db = createServiceClient();
  let q = db
    .from("leads")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 100);

  if (opts.status) q = q.eq("status", opts.status);
  if (opts.leadType) q = q.eq("lead_type", opts.leadType);
  if (opts.search) {
    const term = opts.search.replace(/[%,()]/g, " ").trim();
    if (term) {
      q = q.or(
        `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
      );
    }
  }

  const { data, error } = await q;
  if (error) throw new Error(`getLeads: ${error.message}`);
  return (data ?? []).map(toLead);
}

/** Drives the sidebar badge and the dashboard tile. */
export async function countNewLeads(): Promise<number> {
  const db = createServiceClient();
  const { count, error } = await db
    .from("leads")
    .select("id", { count: "exact", head: true })
    .eq("status", "new");

  if (error) throw new Error(`countNewLeads: ${error.message}`);
  return count ?? 0;
}

export async function getLeadById(id: string): Promise<Lead | null> {
  const db = createServiceClient();
  const { data, error } = await db
    .from("leads")
    .select(COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getLeadById(${id}): ${error.message}`);
  return data ? toLead(data) : null;
}
