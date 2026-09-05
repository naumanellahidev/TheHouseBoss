"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { recordAudit } from "@/lib/auth/audit";
import { requireAdmin } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * Landing-page section editing (brief §34, §35).
 *
 * ── Why a section saves on its own ────────────────────────────────────────
 *
 * Each section is a row, so each one saves independently. That is the point of
 * §36's rule against one giant content field: an operator changing the FAQ
 * should not be able to lose an unrelated edit to the hero because both were
 * carried in the same submission.
 */

export type PageActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

const sectionSchema = z.object({
  pageSlug: z.string().trim().min(1).max(120),
  sectionKey: z.string().trim().min(1).max(60),
  /*
    The content shape differs per section and is owned by the rendering
    component, so it is validated as "an object" here and merged over a typed
    default at render. Enumerating eleven shapes in this file would put the
    contract in two places and let them drift.
  */
  content: z.record(z.string(), z.unknown()),
  enabled: z.boolean().default(true),
});

export async function savePageSection(raw: unknown): Promise<PageActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const parsed = sectionSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "That section could not be read." };
  const v = parsed.data;

  const db = createServiceClient();
  const { error } = await db.from("page_sections").upsert(
    {
      page_slug: v.pageSlug,
      section_key: v.sectionKey,
      /*
        Cast at the boundary. The generated column type is `Json`, and a zod
        `record(string, unknown)` is structurally the same thing without
        Supabase's recursive definition — a `Json` schema in zod would be a
        recursive type for no benefit, since the shape is validated at render
        against a typed default anyway.
      */
      content: v.content as never,
      enabled: v.enabled,
      updated_at: new Date().toISOString(),
    },
    /*
      A real, non-partial unique constraint, so ON CONFLICT can name it.
      Targeting an index PostgREST cannot name has silently written zero rows
      twice in this codebase; `unique (page_slug, section_key)` is a plain
      constraint and is safe to use this way.
    */
    { onConflict: "page_slug,section_key" },
  );

  if (error) {
    console.error(`[savePageSection] ${error.message}`);
    return { ok: false, error: "That section could not be saved." };
  }

  await recordAudit({
    action: "settings_updated",
    entityType: "page_sections",
    entityId: `${v.pageSlug}/${v.sectionKey}`,
    metadata: { enabled: v.enabled },
  });

  revalidatePath(`/${v.pageSlug}`);
  revalidatePath("/admin/pages");

  /*
    §47. The page's content changed, so its SEO is re-evaluated. Wrapped: a copy
    edit must not fail because the engine is switched off or unconfigured.
  */
  try {
    const { runStaticPageSeo } = await import("@/lib/seo/engine/run");
    const { servicePageKeywords } = await import("@/lib/seo/engine/keywords");
    const { SERVICE_PAGES } = await import("@/lib/seo/engine/service-pages");
    const page = SERVICE_PAGES.find((p) => p.path === `/${v.pageSlug}`);
    if (page) {
      await runStaticPageSeo(
        page.path,
        page.citySlug,
        (geo) =>
          servicePageKeywords(
            { services: page.services, primaryService: page.primaryService },
            geo,
          ),
        "content_change",
      );
    }
  } catch (error) {
    console.error("[savePageSection] seo re-run", error);
  }

  return { ok: true, message: "Saved. The page updates on its next load." };
}

/**
 * Reset a section to the copy the site ships with.
 *
 * Deleting the row IS the reset: with no override the route falls back to
 * `DEFAULT_CONTENT`. Storing a copy of the defaults instead would mean a later
 * improvement to the shipped copy never reached anybody who had pressed save.
 */
export async function resetPageSection(
  pageSlug: string,
  sectionKey: string,
): Promise<PageActionResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  const db = createServiceClient();
  const { error } = await db
    .from("page_sections")
    .delete()
    .eq("page_slug", pageSlug)
    .eq("section_key", sectionKey);

  if (error) return { ok: false, error: "That section could not be reset." };

  revalidatePath(`/${pageSlug}`);
  revalidatePath("/admin/pages");
  return { ok: true, message: "Reset to the original wording." };
}
