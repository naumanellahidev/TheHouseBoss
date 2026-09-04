import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * The public read for generated SEO overrides.
 *
 * `seo_pages` has existed since migration 014 with a public read policy and has
 * been read by nothing — the admin listed it, no page consulted it. This is the
 * missing half.
 *
 * Uses the COOKIE-FREE public client, deliberately. The session client would
 * opt every page that calls this out of static rendering, which is the exact
 * trap the listing queries hit in Phase 3 and the reason `lib/supabase/public.ts`
 * exists at all.
 *
 * Returns null for a missing row, a failed query, or an unconfigured database.
 * A missing override is the normal case, not an error: `buildMetadata()` falls
 * back to the page's own title and description, so nothing can regress if this
 * returns nothing.
 */

export type SeoOverride = {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
};

export async function getSeoOverride(path: string): Promise<SeoOverride | null> {
  try {
    const db = createSupabasePublicClient();
    const { data, error } = await db
      .from("seo_pages")
      .select("title, description, canonical_url, noindex, nofollow")
      .eq("path", path)
      .maybeSingle();

    if (error || !data) return null;

    return {
      title: data.title,
      description: data.description,
      canonicalUrl: data.canonical_url,
      noindex: data.noindex,
      nofollow: data.nofollow,
    };
  } catch {
    // Metadata generation must never throw. A page with a fallback description
    // is fine; a page that 500s because its meta tag was unavailable is not.
    return null;
  }
}
