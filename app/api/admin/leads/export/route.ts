import { NextResponse, type NextRequest } from "next/server";

import { getLeads } from "@/lib/queries/leads";
import { requireAdmin } from "@/lib/supabase/server";
import type { Lead, LeadType } from "@/types/domain";

/**
 * CSV export of the current filtered lead set — docs/06 § 8.
 *
 * Admin only, and the filters come from the same query string the inbox uses,
 * so "export what I am looking at" needs no separate UI.
 */

export const runtime = "nodejs";

const COLUMNS = [
  "created_at",
  "name",
  "email",
  "phone",
  "lead_type",
  "status",
  "source_page",
  "listing_id",
  "message",
  "notes",
] as const;

/**
 * RFC 4180 quoting, plus a leading apostrophe on anything a spreadsheet would
 * treat as a formula. A lead whose name starts with "=" is a CSV injection
 * vector the moment the file is opened in Excel.
 */
function cell(value: unknown): string {
  const text = value == null ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const leads = await getLeads({
    status: (params.get("status") as Lead["status"]) || undefined,
    leadType: (params.get("type") as LeadType) || undefined,
    search: params.get("q") || undefined,
    limit: 5000,
  });

  const rows = leads.map((lead) =>
    [
      lead.createdAt,
      lead.name,
      lead.email,
      lead.phone,
      lead.leadType,
      lead.status,
      lead.sourcePage,
      lead.listingId,
      lead.message,
      lead.notes,
    ]
      .map(cell)
      .join(","),
  );

  // The BOM makes Excel read this as UTF-8 rather than as the local codepage,
  // which is what mangles accented names.
  const csv = `﻿${COLUMNS.join(",")}\n${rows.join("\n")}\n`;
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="house-boss-leads-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
