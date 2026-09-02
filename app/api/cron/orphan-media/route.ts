import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron";
import { findOrphans, sweepOrphans } from "@/lib/images/orphans";
import { markMaintenanceRun } from "@/lib/queries/settings";

/**
 * Daily orphan sweep — docs/07 § 7.
 *
 * Deletes objects with no `media` row and rows nothing references. Anything
 * created in the last 24 hours is skipped, because an upload in progress is
 * indistinguishable from an orphan for the seconds between the object landing
 * and the row being written.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const startedAt = Date.now();

  try {
    const report = await findOrphans();

    if (report.strayObjects.length === 0 && report.strayRows.length === 0) {
      await markMaintenanceRun("last_orphan_sweep");
      return NextResponse.json({
        ok: true,
        objectsDeleted: 0,
        rowsDeleted: 0,
        bytesReclaimed: 0,
        skippedRecent: report.skippedRecent,
        ms: Date.now() - startedAt,
      });
    }

    const result = await sweepOrphans(report);
    await markMaintenanceRun("last_orphan_sweep");

    console.info(
      `[cron:orphans] ${result.objectsDeleted} objects, ${result.rowsDeleted} rows, ` +
        `~${Math.round(result.bytesReclaimed / 1024)} kB, ${Date.now() - startedAt}ms`,
    );

    return NextResponse.json({
      ok: true,
      ...result,
      skippedRecent: report.skippedRecent,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[cron:orphans] failed:", error);
    return NextResponse.json({ ok: false, error: "sweep failed" }, { status: 500 });
  }
}
