"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Lead mutations.
 *
 * Every action starts with requireAdmin() (admin-crud skill) — RLS is the
 * second layer, never the first. `leads` has no public SELECT policy at all, so
 * these use the service client; the authorisation decision has already been
 * made one line above.
 *
 * Actions return `{ ok, error? }` rather than throwing: the client turns the
 * result into a toast, and a raw Postgres message must never reach a browser.
 */

export type ActionResult = { ok: true } | { ok: false; error: string };

const LEAD_STATUSES = ["new", "contacted", "qualified", "closed", "spam"] as const;

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(LEAD_STATUSES),
});

const notesSchema = z.object({
  id: z.string().uuid(),
  notes: z.string().trim().max(5000),
});

export async function setLeadStatus(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = statusSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That status is not valid." };

  const db = createServiceClient();
  const { error } = await db
    .from("leads")
    .update({ status: parsed.data.status })
    .eq("id", parsed.data.id);

  if (error) {
    console.error(`[setLeadStatus] ${error.message}`);
    return { ok: false, error: "The status could not be saved. Try again." };
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}

export async function setLeadNotes(raw: unknown): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = notesSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That note is too long." };

  const db = createServiceClient();
  const { error } = await db
    .from("leads")
    .update({ notes: parsed.data.notes || null })
    .eq("id", parsed.data.id);

  if (error) {
    console.error(`[setLeadNotes] ${error.message}`);
    return { ok: false, error: "The note could not be saved. Try again." };
  }

  revalidatePath("/admin/leads");
  return { ok: true };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!z.string().uuid().safeParse(id).success) {
    return { ok: false, error: "That lead could not be found." };
  }

  const db = createServiceClient();
  const { error } = await db.from("leads").delete().eq("id", id);

  if (error) {
    console.error(`[deleteLead] ${error.message}`);
    return { ok: false, error: "The lead could not be deleted. Try again." };
  }

  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: true };
}
