"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/auth/audit";
import { requirePermission } from "@/lib/auth/permissions";
import { markMaintenanceRun } from "@/lib/queries/settings";
import { inBand } from "@/lib/seo/auto/generate";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * SEO maintenance actions.
 *
 * ── What "refresh" actually means ─────────────────────────────────────────
 *
 * `app/sitemap.ts` and `app/llms.txt/route.ts` are generated from published
 * rows on request, but both carry `export const revalidate = 3600`. So they are
 * never STALE in the sense of being wrong — they are up to an hour behind. That
 * hour is the entire reason this button exists, and it is why the copy on the
 * page says "refresh now" rather than "regenerate": there is no file to rebuild.
 *
 * ── Why nothing is pinged ─────────────────────────────────────────────────
 *
 * Google retired the sitemap ping endpoint in 2023; it now returns 404 and the
 * documentation says to stop calling it. Bing's IndexNow works but requires a
 * key file served from the domain root, which is a separate decision and a
 * separate migration. Rather than fire a request that quietly fails, this
 * refreshes the cache and stamps when it happened. The UI says exactly that.
 */

export type SeoActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function refreshSitemap(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  try {
    revalidatePath("/sitemap.xml");
    revalidatePath("/llms.txt");
    revalidatePath("/robots.txt");

    await markMaintenanceRun("last_sitemap_ping");

    await recordAudit({
      action: "sitemap_refreshed",
      entityType: "site_settings",
      entityId: "1",
      metadata: { paths: ["/sitemap.xml", "/llms.txt", "/robots.txt"] },
    });

    revalidatePath("/admin/seo");
    return {
      ok: true,
      message:
        "Sitemap, llms.txt and robots.txt now rebuild on the next request. Search engines will pick the changes up on their own schedule.",
    };
  } catch (error) {
    console.error("[refreshSitemap]", error);
    return { ok: false, error: "The refresh did not finish. Try again." };
  }
}

/* ── Generation ───────────────────────────────────────────────────────────── */

/**
 * Regenerate metadata for one published record.
 *
 * The path IS the address here — it is what `seo_pages` is keyed on and what
 * the admin sees. Deriving the record back out of it keeps the button on the
 * row it belongs to instead of needing a record id the table does not carry.
 */
export async function generateForPath(path: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { syncListingSeo, syncArticleSeo, syncCitySeo, syncCommunitySeo } =
    await import("@/lib/seo/auto/apply");

  const listing = /^\/listing\/([^/]+)$/.exec(path);
  const community = /^\/communities\/([^/]+)$/.exec(path);
  const marketUpdate = /^\/market-updates\/([^/]+)$/.exec(path);
  const blog = /^\/lake-mary\/blog\/([^/]+)$/.exec(path);
  const city = /^\/([^/]+)$/.exec(path);

  try {
    if (listing) await syncListingSeo(listing[1]);
    else if (community) await syncCommunitySeo(community[1]);
    else if (marketUpdate) await syncArticleSeo(marketUpdate[1]);
    else if (blog) await syncArticleSeo(blog[1]);
    else if (city) await syncCitySeo(city[1]);
    else {
      return {
        ok: false,
        error: `Nothing is generated for ${path} — it is not a listing, article, city or community page.`,
      };
    }
  } catch (error) {
    console.error(`[generateForPath] ${path}`, error);
    return { ok: false, error: "Generation failed. Try again." };
  }

  revalidatePath(path);
  revalidatePath("/admin/seo");
  return { ok: true, message: `Regenerated ${path}.` };
}

/**
 * Fill every gap: generate for published pages that have no row yet.
 *
 * ── Why gaps only, and never a blanket overwrite ──────────────────────────
 *
 * Regenerating rows that already exist would silently replace a hand-written
 * override with a generated one — the admin's own words, discarded by a button
 * labelled "generate". Anything already covered is left alone; the per-row
 * Regenerate button is how a single page is deliberately redone.
 *
 * ── Why it is capped ──────────────────────────────────────────────────────
 *
 * Each record may make one model call at roughly a second and a half. A server
 * action that runs for minutes is one that times out on Vercel with half the
 * work done and no way to tell which half. The cap makes it resumable: the UI
 * says how many are left and the button runs again.
 */
const BATCH = 25;

export async function generateMissingSeo(): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const { getSeoCoverage } = await import("@/lib/queries/platform");
  const coverage = await getSeoCoverage();
  const targets = coverage.groups.flatMap((g) => g.missing);

  if (targets.length === 0) {
    return {
      ok: true,
      message: "Every published page already has generated metadata.",
    };
  }

  const batch = targets.slice(0, BATCH);

  /*
    Four at a time, not one. Sequentially this loop was 25 model calls at about
    a second and a half each — nearly forty seconds of a server action waiting
    on a socket, which on Vercel is close enough to the timeout to be a real
    risk. See `lib/seo/auto/pool.ts` for why four and not twenty-five.
  */
  const { mapWithConcurrency, SEO_CONCURRENCY } = await import(
    "@/lib/seo/auto/pool"
  );
  const outcomes = await mapWithConcurrency(batch, SEO_CONCURRENCY, (path) =>
    generateForPath(path),
  );
  const done = outcomes.filter((result) => result.ok).length;

  revalidatePath("/admin/seo");
  const left = targets.length - batch.length;
  return {
    ok: true,
    message:
      `Generated ${done} of ${batch.length}.` +
      (left > 0 ? ` ${left} still to do — press it again.` : " Nothing left."),
  };
}

/* ── Overrides ────────────────────────────────────────────────────────────── */

const overrideSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, "A path starts with a slash, e.g. /lake-mary"),
  title: z.string().trim().max(60).optional().or(z.literal("")),
  description: z.string().trim().optional().or(z.literal("")),
  canonicalUrl: z.string().trim().max(500).optional().or(z.literal("")),
  noindex: z.boolean().default(false),
  nofollow: z.boolean().default(false),
});

export async function saveSeoOverride(raw: unknown): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const parsed = overrideSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  const v = parsed.data;

  /*
    The 140–158 rule is a CHECK constraint, so a short description is rejected
    by Postgres with a message no one should have to read. Saying it here, in
    the admin's own words and with the actual count, is the difference between
    a correctable mistake and a mysterious failure.
  */
  if (v.description && !inBand(v.description)) {
    return {
      ok: false,
      error: `A description must be 140–158 characters. That one is ${v.description.length}. Leave it blank to have one generated instead.`,
    };
  }

  const db = createServiceClient();
  const { error } = await db.from("seo_pages").upsert(
    {
      path: v.path,
      title: v.title || null,
      description: v.description || null,
      canonical_url: v.canonicalUrl || null,
      noindex: v.noindex,
      nofollow: v.nofollow,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "path" },
  );

  if (error) {
    console.error(`[saveSeoOverride] ${error.message}`);
    return { ok: false, error: "That override could not be saved." };
  }

  await recordAudit({
    action: "seo_updated",
    entityType: "seo_pages",
    entityId: v.path,
    metadata: { manual: true, noindex: v.noindex, nofollow: v.nofollow },
  });

  revalidatePath(v.path);
  revalidatePath("/admin/seo");
  return { ok: true, message: `Saved the override for ${v.path}.` };
}

export async function deleteSeoOverride(path: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { error } = await db.from("seo_pages").delete().eq("path", path);
  if (error) return { ok: false, error: "That override could not be removed." };

  await recordAudit({
    action: "seo_updated",
    entityType: "seo_pages",
    entityId: path,
    metadata: { deleted: true },
  });

  revalidatePath(path);
  revalidatePath("/admin/seo");
  return {
    // Not destructive, and the copy should say so rather than sound like a loss.
    ok: true,
    message: `Removed. ${path} falls back to its generated metadata.`,
  };
}

/* ── Redirects ────────────────────────────────────────────────────────────── */

const redirectSchema = z.object({
  fromPath: z
    .string()
    .trim()
    .min(1)
    .max(300)
    .regex(/^\//, "The old path starts with a slash."),
  toPath: z.string().trim().min(1).max(500),
  statusCode: z.union([z.literal(301), z.literal(302)]).default(301),
});

export async function createRedirect(raw: unknown): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const parsed = redirectSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Check the fields.",
    };
  }
  const v = parsed.data;

  if (v.fromPath === v.toPath) {
    return { ok: false, error: "That would redirect a URL to itself." };
  }

  const db = createServiceClient();
  const { error } = await db.from("redirects").upsert(
    { from_path: v.fromPath, to_path: v.toPath, status_code: v.statusCode },
    { onConflict: "from_path" },
  );

  if (error) {
    console.error(`[createRedirect] ${error.message}`);
    return { ok: false, error: "That redirect could not be saved." };
  }

  await recordAudit({
    action: "redirect_created",
    entityType: "redirects",
    entityId: v.fromPath,
    metadata: { to: v.toPath, status: v.statusCode },
  });

  revalidatePath(v.fromPath);
  revalidatePath("/admin/seo");
  return { ok: true, message: `${v.fromPath} now redirects to ${v.toPath}.` };
}

export async function deleteRedirect(id: string): Promise<SeoActionResult> {
  try {
    await requirePermission("manage_seo");
  } catch {
    return { ok: false, error: "You do not have permission to do that." };
  }

  const db = createServiceClient();
  const { data, error } = await db
    .from("redirects")
    .delete()
    .eq("id", id)
    .select("from_path")
    .maybeSingle();

  if (error) return { ok: false, error: "That redirect could not be removed." };

  await recordAudit({
    action: "redirect_deleted",
    entityType: "redirects",
    entityId: id,
    metadata: { from: data?.from_path ?? null },
  });

  if (data?.from_path) revalidatePath(data.from_path);
  revalidatePath("/admin/seo");
  return {
    ok: true,
    /*
      HR11 is why this warns rather than merely confirming. A redirect written
      by the slug trigger is the only thing keeping an already-indexed URL from
      returning 404, and deleting one does not look destructive from in here.
    */
    message: data?.from_path
      ? `Removed. ${data.from_path} will now return 404 if anything still links to it.`
      : "Removed.",
  };
}
