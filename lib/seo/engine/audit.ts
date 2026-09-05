import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * The SEO health audit (brief §24, §29, §30, §88, §89, §95).
 *
 * ── The rule this file is written under ───────────────────────────────────
 *
 * §30: "Do NOT invent scores. Calculate metrics from actual database/site
 * data." Every number below is a count of rows that match a condition, and
 * every finding names the specific pages it found. There is no health score,
 * no letter grade and no percentage of anything that was not counted — because
 * a fabricated 87/100 is worse than no number: it invites a decision, and the
 * decision has nothing behind it.
 *
 * ── Why findings carry their pages ────────────────────────────────────────
 *
 * "4 pages are missing metadata" is a statistic. "These four pages are missing
 * metadata, here they are" is a task. §31 asks for opportunities based on real
 * data, and a real opportunity is one you can click.
 */

export type Finding = {
  id: string;
  /** How much this matters. Not a score — a triage order. */
  severity: "high" | "medium" | "low";
  title: string;
  /** What it means and what to do, in a sentence. */
  detail: string;
  /** The specific pages. Capped for display; `total` is the true count. */
  pages: string[];
  total: number;
};

export type AuditReport = {
  generatedAt: string;
  /** Published pages the audit could see. The denominator for everything. */
  pagesAudited: number;
  findings: Finding[];
  /* Counts §95 asks for by name, each one a real query. */
  metadataComplete: number;
  keywordCoverage: number;
  internalLinksAccepted: number;
  internalLinksProposed: number;
};

const SAMPLE = 8;

export async function runSeoAudit(): Promise<AuditReport> {
  const db = createServiceClient();
  const findings: Finding[] = [];

  /* ── The published universe ───────────────────────────────────────────── */

  const [listings, articles, cities, communities, seoPages, keywords, links] =
    await Promise.all([
      db
        .from("listings")
        .select("id, slug, meta_desc, photos")
        .eq("published", true),
      db
        .from("articles")
        .select("id, slug, kind, meta_desc, excerpt, body_text, cities(slug)")
        .eq("status", "published"),
      db.from("cities").select("id, slug, intro_md").eq("published", true),
      db.from("communities").select("id, slug, intro_md").eq("published", true),
      db.from("seo_pages").select("path, title, description"),
      db.from("seo_keywords").select("listing_id, article_id, city_id, community_id"),
      db.from("seo_internal_links").select("to_path, status"),
    ]);

  const listingRows = listings.data ?? [];
  const articleRows = articles.data ?? [];
  const cityRows = cities.data ?? [];
  const communityRows = communities.data ?? [];

  const pagePaths = [
    ...listingRows.map((r) => `/listing/${r.slug}`),
    ...articleRows.map((r) => articlePath(r)),
    ...cityRows.map((r) => `/${r.slug}`),
    ...communityRows.map((r) => `/communities/${r.slug}`),
  ];

  const pagesAudited = pagePaths.length;
  const seoByPath = new Map((seoPages.data ?? []).map((r) => [r.path, r]));

  /* ── §24 missing metadata ─────────────────────────────────────────────── */

  const missingMeta = pagePaths.filter((path) => {
    const row = seoByPath.get(path);
    return !row?.description;
  });

  if (missingMeta.length > 0) {
    findings.push({
      id: "missing-metadata",
      severity: "high",
      title: "Pages with no written description",
      detail:
        "Search engines will pick their own text for these, usually the first sentence they find. Press Generate to write one from each page's own facts.",
      pages: missingMeta.slice(0, SAMPLE),
      total: missingMeta.length,
    });
  }

  /* ── §89 duplicate metadata ───────────────────────────────────────────── */

  const byTitle = new Map<string, string[]>();
  const byDescription = new Map<string, string[]>();

  for (const row of seoPages.data ?? []) {
    if (row.title) {
      byTitle.set(row.title, [...(byTitle.get(row.title) ?? []), row.path]);
    }
    if (row.description) {
      byDescription.set(row.description, [
        ...(byDescription.get(row.description) ?? []),
        row.path,
      ]);
    }
  }

  const duplicateTitles = [...byTitle.values()].filter((paths) => paths.length > 1);
  const duplicateDescriptions = [...byDescription.values()].filter(
    (paths) => paths.length > 1,
  );

  if (duplicateTitles.length > 0 || duplicateDescriptions.length > 0) {
    const affected = [...duplicateTitles, ...duplicateDescriptions].flat();
    findings.push({
      id: "duplicate-metadata",
      severity: "high",
      title: "Pages sharing a title or description",
      detail:
        "Two pages with the same title compete with each other for the same search, and search engines usually pick one and ignore the other. Rewrite one of each pair.",
      pages: [...new Set(affected)].slice(0, SAMPLE),
      total: new Set(affected).size,
    });
  }

  /* ── §31 keyword coverage ─────────────────────────────────────────────── */

  const withKeywords = new Set([
    ...(keywords.data ?? []).map((r) => r.listing_id).filter(Boolean),
    ...(keywords.data ?? []).map((r) => r.article_id).filter(Boolean),
    ...(keywords.data ?? []).map((r) => r.city_id).filter(Boolean),
    ...(keywords.data ?? []).map((r) => r.community_id).filter(Boolean),
  ]);

  const noKeywords = [
    ...listingRows.filter((r) => !withKeywords.has(r.id)).map((r) => `/listing/${r.slug}`),
    ...articleRows.filter((r) => !withKeywords.has(r.id)).map((r) => articlePath(r)),
    ...cityRows.filter((r) => !withKeywords.has(r.id)).map((r) => `/${r.slug}`),
    ...communityRows
      .filter((r) => !withKeywords.has(r.id))
      .map((r) => `/communities/${r.slug}`),
  ];

  if (noKeywords.length > 0) {
    findings.push({
      id: "no-keywords",
      severity: "medium",
      title: "Pages with no search phrases worked out",
      detail:
        "Nothing has analysed what these pages should be found for. They still work; they are just not being aimed at anything in particular.",
      pages: noKeywords.slice(0, SAMPLE),
      total: noKeywords.length,
    });
  }

  /* ── §29, §88 orphans and broken links ────────────────────────────────── */

  const acceptedLinks = (links.data ?? []).filter((l) => l.status === "accepted");
  const proposedLinks = (links.data ?? []).filter((l) => l.status === "proposed");

  const linkedTo = new Set(acceptedLinks.map((l) => l.to_path));
  const orphans = pagePaths.filter((path) => !linkedTo.has(path));

  if (orphans.length > 0) {
    findings.push({
      id: "orphan-pages",
      severity: "medium",
      title: "Pages nothing else links to",
      detail:
        "A page reachable only from the sitemap is a page readers rarely find. Accepting the suggested links below connects them to the rest of the site.",
      pages: orphans.slice(0, SAMPLE),
      total: orphans.length,
    });
  }

  /*
    §88. A link whose target is not among the published paths.

    Checked against the SET of published pages rather than by fetching each URL:
    a link to an unpublished listing resolves to a 404 for the public, and an
    HTTP check from the server would follow its own session and see a 200.
  */
  const known = new Set(pagePaths);
  const brokenLinks = acceptedLinks
    .filter((l) => l.to_path.startsWith("/listing/") || l.to_path.startsWith("/communities/"))
    .filter((l) => !known.has(l.to_path))
    .map((l) => l.to_path);

  if (brokenLinks.length > 0) {
    findings.push({
      id: "broken-links",
      severity: "high",
      title: "Accepted links pointing at pages that are gone",
      detail:
        "These were valid when they were accepted and their target has since been unpublished or deleted. Each one is a dead end for a reader.",
      pages: [...new Set(brokenLinks)].slice(0, SAMPLE),
      total: new Set(brokenLinks).size,
    });
  }

  /* ── §24 thin content ─────────────────────────────────────────────────── */

  const thinArticles = articleRows
    .filter((r) => (r.body_text ?? "").trim().split(/\s+/).length < 300)
    .map((r) => articlePath(r));

  if (thinArticles.length > 0) {
    findings.push({
      id: "thin-content",
      severity: "medium",
      title: "Articles under 300 words",
      detail:
        "Short pieces rarely answer the question that brought someone to them, and they are the pages search engines are most likely to leave out.",
      pages: thinArticles.slice(0, SAMPLE),
      total: thinArticles.length,
    });
  }

  const thinPlaces = [
    ...cityRows.filter((r) => !(r.intro_md ?? "").trim()).map((r) => `/${r.slug}`),
    ...communityRows
      .filter((r) => !(r.intro_md ?? "").trim())
      .map((r) => `/communities/${r.slug}`),
  ];

  if (thinPlaces.length > 0) {
    findings.push({
      id: "empty-place-pages",
      severity: "medium",
      title: "City or community pages with no introduction written",
      detail:
        "These render, and they say nothing specific about the place. That is the one thing an area page has to do.",
      pages: thinPlaces.slice(0, SAMPLE),
      total: thinPlaces.length,
    });
  }

  /* ── §24, §65 image alt text ──────────────────────────────────────────── */

  /*
    Read out of the `photos` jsonb rather than the `media` table, because alt
    text lives on the photo entry inside the listing — `media` records the
    stored object, not how a given listing describes it.
  */
  const missingAlt = listingRows
    .filter((r) => {
      const photos = Array.isArray(r.photos) ? r.photos : [];
      return photos.some(
        (p) => !String((p as { alt?: unknown })?.alt ?? "").trim(),
      );
    })
    .map((r) => `/listing/${r.slug}`);

  if (missingAlt.length > 0) {
    findings.push({
      id: "missing-alt",
      severity: "high",
      title: "Listings with photos that have no description",
      detail:
        "Alt text is what a blind visitor hears in place of the photograph, and what a search engine reads. This is an accessibility obligation before it is an SEO one.",
      pages: missingAlt.slice(0, SAMPLE),
      total: missingAlt.length,
    });
  }

  /* ── §31 opportunity, not a fault ─────────────────────────────────────── */

  if (proposedLinks.length > 0) {
    findings.push({
      id: "pending-links",
      severity: "low",
      title: "Suggested links waiting for you",
      detail:
        "Each one was checked against a page that exists. Accepting them is what connects the site together.",
      pages: [...new Set(proposedLinks.map((l) => l.to_path))].slice(0, SAMPLE),
      total: proposedLinks.length,
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    pagesAudited,
    findings: findings.sort(
      (a, b) => WEIGHT[b.severity] - WEIGHT[a.severity] || b.total - a.total,
    ),
    metadataComplete: pagesAudited - missingMeta.length,
    keywordCoverage: pagesAudited - noKeywords.length,
    internalLinksAccepted: acceptedLinks.length,
    internalLinksProposed: proposedLinks.length,
  };
}

const WEIGHT = { high: 3, medium: 2, low: 1 } as const;

/** The same routing rule `lib/utils/routes.ts` uses, against a raw row. */
function articlePath(row: { slug: string; kind: string; cities: unknown }): string {
  const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
  const citySlug = (city as { slug?: string } | null)?.slug;
  if (row.kind === "market_update") return `/market-updates/${row.slug}`;
  return citySlug === "lake-mary"
    ? `/lake-mary/blog/${row.slug}`
    : `/market-updates/${row.slug}`;
}
