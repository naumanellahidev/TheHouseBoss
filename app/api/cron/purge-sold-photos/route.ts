import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";

import { authorizeCron } from "@/lib/cron";
import { purgeSoldPhotos } from "@/lib/images/purge";
import { markMaintenanceRun } from "@/lib/queries/settings";

/**
 * Daily sold-photo purge — CLAUDE.md hard rule 10.
 *
 * Seven days after a sale the 1600w and 800w go and the 400w stays. The listing
 * row is never deleted and the page is never removed: it keeps its URL, its
 * ranking and its value as proof of track record.
 *
 * Node runtime: the storage provider and Supabase clients are not edge-safe.
 */

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const denied = authorizeCron(request);
  if (denied) return denied;

  const startedAt = Date.now();

  try {
    const result = await purgeSoldPhotos();
    await markMaintenanceRun("last_purge_run");

    // purgeSoldPhotos() stays free of cache concerns so it can be run from a
    // script; the request context lives here.
    for (const slug of result.purgedSlugs) revalidatePath(`/listing/${slug}`);
    if (result.listings > 0) {
      revalidatePath("/sold");
      revalidatePath("/admin/media");
    }

    console.info(
      `[cron:purge] ${result.listings} listings, ${result.objectsDeleted} objects, ` +
        `~${Math.round(result.bytesFreed / 1024)} kB, ${Date.now() - startedAt}ms`,
    );

    return NextResponse.json({
      ok: true,
      listings: result.listings,
      objectsDeleted: result.objectsDeleted,
      bytesFreed: result.bytesFreed,
      failures: result.failures,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    console.error("[cron:purge] failed:", error);
    return NextResponse.json({ ok: false, error: "purge failed" }, { status: 500 });
  }
}
