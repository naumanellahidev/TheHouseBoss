"use server";

import { revalidatePath } from "next/cache";

import { deleteImages } from "@/lib/images/store";
import { findOrphans, sweepOrphans } from "@/lib/images/orphans";
import { getMediaReferences } from "@/lib/queries/admin";
import { markMaintenanceRun } from "@/lib/queries/settings";
import { requireAdmin } from "@/lib/supabase/server";

/**
 * Media mutations.
 *
 * The one rule that matters here: deleting media that is still referenced is
 * BLOCKED, with a link to the referencing entity (docs/06 § 9). Deleting a
 * photo out from under a live listing produces a broken image on a public page,
 * which is the one thing HR6 exists to prevent.
 */

export type MediaActionResult =
  | { ok: true; freedBytes?: number; message?: string }
  | { ok: false; error: string; blockedBy?: { key: string; label: string; href: string }[] };

export async function deleteMediaKeys(keys: string[]): Promise<MediaActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (keys.length === 0) return { ok: true };

  const references = await getMediaReferences(keys);
  if (references.size > 0) {
    return {
      ok: false,
      error:
        references.size === 1
          ? "That photo is still used by a listing. Remove it there first."
          : `${references.size} of these photos are still used by listings. Remove them there first.`,
      blockedBy: [...references.entries()].map(([key, reference]) => ({
        key,
        ...reference,
      })),
    };
  }

  await deleteImages(keys);

  revalidatePath("/admin/media");
  revalidatePath("/admin");
  return { ok: true };
}

/**
 * Manual orphan sweep. The same code the nightly cron runs — running it by hand
 * from Settings → Maintenance must not be a different, less-tested path.
 */
export async function runOrphanSweep(): Promise<MediaActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  try {
    const report = await findOrphans();

    if (report.strayObjects.length === 0 && report.strayRows.length === 0) {
      return {
        ok: true,
        freedBytes: 0,
        message:
          report.skippedRecent > 0
            ? `Nothing to clean up. ${report.skippedRecent} recent uploads were skipped — anything under 24 hours old is left alone in case it is still being worked on.`
            : "Nothing to clean up. Every stored file is accounted for.",
      };
    }

    const result = await sweepOrphans(report);
    await markMaintenanceRun("last_orphan_sweep");

    revalidatePath("/admin/media");
    revalidatePath("/admin");

    return {
      ok: true,
      freedBytes: result.bytesReclaimed,
      message: `Removed ${result.objectsDeleted} files and ${result.rowsDeleted} records.`,
    };
  } catch (error) {
    console.error("[runOrphanSweep]", error);
    return { ok: false, error: "The cleanup could not finish. Try again." };
  }
}
