import { ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { SeoWorkspace } from "@/components/admin/seo/seo-workspace";
import { EmptyState } from "@/components/site/empty-state";
import { ANSWERS } from "@/lib/content/answers";
import { getAdminIdentity } from "@/lib/auth/permissions";
import {
  getEngineSettings,
  getPendingLinks,
  getRedirects,
  getSeoCoverage,
  getSeoPages,
} from "@/lib/queries/platform";
import { getAdminSettings } from "@/lib/queries/settings";

/**
 * More than thirty days since the last sitemap ping.
 *
 * A plain function outside the component on purpose. Reading a clock while
 * rendering makes a component return different output from identical props,
 * which React calls impure and the lint rule refuses — so the subtraction is
 * done here and the component is handed a boolean. This page is dynamic, so it
 * is recomputed on every visit.
 */
function isSitemapStale(lastPing: string | null): boolean {
  if (!lastPing) return false;
  return Date.now() - new Date(lastPing).getTime() > 30 * 86_400_000;
}

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO" };

/**
 * The SEO centre — docs/06 § 12.
 *
 * This file fetches and checks the permission; every control lives in
 * `SeoWorkspace`, because almost all of it is buttons. That is the split every
 * other admin screen uses.
 *
 * The screen was one long scroll of five stacked panels. It is now five tabs
 * in the order somebody actually works: what is wrong, the pages themselves,
 * the link queue, redirects, then the engine that writes it all.
 */
export default async function SeoPage() {
  const identity = await getAdminIdentity();

  if (!identity?.permissions.includes("manage_seo")) {
    return (
      <>
        <AdminPageHeader title="SEO" />
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to SEO settings"
          description="Editing metadata and redirects needs the manage_seo permission."
        />
      </>
    );
  }

  const [pages, redirects, coverage, settings, engineSettings, pendingLinks, queue] =
    await Promise.all([
      getSeoPages(),
      getRedirects(),
      getSeoCoverage(),
      getAdminSettings(),
      getEngineSettings(),
      getPendingLinks(),
      // §36. Real counts, so the panel never animates a fictional progress bar.
      import("@/lib/seo/engine/queue").then((m) => m.jobCounts()),
    ]);

  /*
    What the sitemap carries, counted from the same rows it is built from
    rather than by fetching and parsing our own sitemap.xml.

    The static routes, the answer hub (its own page, nine categories and every
    published answer — docs/18 § 6), and one entry per published record.
  */
  const STATIC_ROUTES = 14;
  const ANSWER_ROUTES = 1 + 9 + ANSWERS.length;
  const sitemapUrlCount =
    STATIC_ROUTES +
    ANSWER_ROUTES +
    coverage.groups.reduce((total, group) => total + group.total, 0);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="SEO"
        description="What search engines and AI assistants read: page titles, descriptions, internal links, redirects and the sitemap."
      />

      <SeoWorkspace
        pages={pages}
        redirects={redirects}
        coverage={coverage}
        engineSettings={engineSettings}
        pendingLinks={pendingLinks}
        queue={queue}
        /*
          The model NAME, not whether a key exists. "gemma4:31b" tells the
          operator which writer produced the copy in front of them; a boolean
          tells them nothing they can act on. Server-side env, read in a server
          component and passed down — the key itself never crosses.
        */
        modelName={process.env.OLLAMA_API_KEY ? (process.env.OLLAMA_MODEL ?? null) : null}
        lastSitemapRefresh={settings.lastSitemapPing}
        /*
          The subtraction happens here, where there is a clock.

          A client component reading Date.now() during render produces a
          different tree from the same props, which React treats as a bug and the
          lint rule refuses outright. This page is already dynamic, so the answer
          is recomputed on every visit.
        */
        sitemapStale={isSitemapStale(settings.lastSitemapPing)}
        sitemapUrlCount={sitemapUrlCount}
      />
    </div>
  );
}
