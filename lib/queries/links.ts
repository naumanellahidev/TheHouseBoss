import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * The internal links a page actually renders (brief §16).
 *
 * ── Why the cookie-free client ────────────────────────────────────────────
 *
 * Same reason `lib/queries/seo.ts` uses it: the session client opts a page out
 * of static rendering, and every listing page would become dynamic to fetch a
 * handful of links. `seo_internal_links` has a public read policy admitting
 * only `accepted` rows, so the anon key sees exactly what the page may show.
 *
 * ── Why the status filter is repeated here ────────────────────────────────
 *
 * RLS already restricts this to `accepted`. The filter is stated again anyway,
 * because a policy that changes for an unrelated reason should not silently
 * start rendering rejected proposals onto public pages. Two independent
 * statements of the same rule is the right amount for something that decides
 * what a licensed agent appears to recommend.
 */

export type RenderedLink = {
  href: string;
  anchor: string;
};

export async function getAcceptedLinks(
  owner: { listingId?: string; cityId?: string; communityId?: string; articleId?: string },
  limit = 6,
): Promise<RenderedLink[]> {
  const column = owner.listingId
    ? "listing_id"
    : owner.cityId
      ? "city_id"
      : owner.communityId
        ? "community_id"
        : "article_id";

  const value =
    owner.listingId ?? owner.cityId ?? owner.communityId ?? owner.articleId;
  if (!value) return [];

  try {
    const db = createSupabasePublicClient();
    const { data, error } = await db
      .from("seo_internal_links")
      .select("to_path, anchor")
      .eq(column, value)
      .eq("status", "accepted")
      .order("created_at")
      .limit(limit);

    if (error || !data) return [];

    return data.map((row) => ({ href: row.to_path, anchor: row.anchor }));
  } catch {
    // A page must not fail to render because its related links could not be
    // read. The block simply does not appear.
    return [];
  }
}
