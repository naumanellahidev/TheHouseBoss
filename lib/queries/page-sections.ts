import {
  PAGE_HEROES,
  type HeroPageSlug,
  type PageHeroContent,
} from "@/lib/content/page-heroes";
import { createSupabasePublicClient } from "@/lib/supabase/public";

/**
 * Structured landing-page content (brief §34).
 *
 * Reads through the cookie-free client so a page using this stays static, the
 * same reason `lib/queries/seo.ts` and `lib/queries/links.ts` do.
 *
 * ── Overrides are per FIELD, not per section ──────────────────────────────
 *
 * The database holds only what somebody changed. A section row that sets one
 * headline must not blank the rest of that section, so the merge is a shallow
 * spread of the stored object over the code default — which is what makes
 * editing one field in the admin safe.
 *
 * Anything unreadable falls back to the defaults entirely. A landing page that
 * renders its shipped copy because the database is unreachable is working; one
 * that renders empty sections is not.
 */

export type SectionRow = {
  sectionKey: string;
  content: Record<string, unknown>;
  position: number;
  enabled: boolean;
};

export async function getPageSections(pageSlug: string): Promise<SectionRow[]> {
  try {
    const db = createSupabasePublicClient();
    const { data, error } = await db
      .from("page_sections")
      .select("section_key, content, position, enabled")
      .eq("page_slug", pageSlug)
      .eq("enabled", true)
      .order("position");

    if (error || !data) return [];

    return data.map((row) => ({
      sectionKey: row.section_key,
      content: (row.content ?? {}) as Record<string, unknown>,
      position: row.position,
      enabled: row.enabled,
    }));
  } catch {
    return [];
  }
}

/**
 * Merge stored overrides over a code default.
 *
 * Shallow on purpose. A deep merge would let a stored `{ items: [...] }` blend
 * with the default items positionally, producing a list that is half edited and
 * half shipped — which is never what somebody replacing a services list meant.
 * Replacing an array wholesale is the predictable behaviour.
 */
export function mergeSection<T extends object>(
  fallback: T,
  stored: Record<string, unknown> | undefined,
): T {
  if (!stored || Object.keys(stored).length === 0) return fallback;
  return { ...fallback, ...stored } as T;
}

/** Which of a page's sections are switched off, so a route can skip them. */
export function disabledKeys(
  rows: SectionRow[],
  all: readonly string[],
): Set<string> {
  /*
    A key with no row is ENABLED, not disabled. The table holds edits and
    switches; a page that has never been touched has no rows at all, and it must
    render in full rather than render nothing.
  */
  const present = new Map(rows.map((r) => [r.sectionKey, r.enabled]));
  return new Set(all.filter((key) => present.get(key) === false));
}

/**
 * The hero of a list page (`/market-updates`, `/reviews`), with edits applied.
 *
 * Never throws and never returns a blank field: a stored empty string for a
 * headline falls back to the shipped headline, because a hero with no heading
 * is broken, not edited. `imageKey` is the one field where empty is meaningful —
 * it means "use the page's own fallback photograph".
 */
export async function getPageHero(pageSlug: HeroPageSlug): Promise<PageHeroContent> {
  const fallback = PAGE_HEROES[pageSlug];
  const rows = await getPageSections(pageSlug);
  const stored = rows.find((row) => row.sectionKey === "hero")?.content;
  const merged = mergeSection(fallback, stored);

  const text = (value: unknown, shipped: string) =>
    typeof value === "string" && value.trim() ? value.trim() : shipped;

  return {
    overline: text(merged.overline, fallback.overline),
    title: text(merged.title, fallback.title),
    lead: text(merged.lead, fallback.lead),
    imageKey: typeof merged.imageKey === "string" ? merged.imageKey.trim() : "",
  };
}
