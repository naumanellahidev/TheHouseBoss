import { ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { SeoConsole } from "@/components/admin/seo/seo-console";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { getRedirects, getSeoCoverage, getSeoPages } from "@/lib/queries/platform";
import { getAdminSettings } from "@/lib/queries/settings";

export const dynamic = "force-dynamic";

/**
 * The SEO centre.
 *
 * Read-only until now: it listed `seo_pages` and said, in as many words, that
 * there was deliberately no button. That was true while metadata was typed by
 * hand into each record and this table was a curiosity. Generation changed the
 * question — the useful one is "what is missing", and it has to be answerable
 * and fixable from one screen.
 *
 * The work lives in `SeoConsole`, a client component, because almost all of it
 * is buttons. This file stays a server component that fetches and checks the
 * permission, which is the split every other admin screen uses.
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

  const [pages, redirects, coverage, settings] = await Promise.all([
    getSeoPages(),
    getRedirects(),
    getSeoCoverage(),
    getAdminSettings(),
  ]);

  /*
    The static routes the sitemap always carries, plus one entry per published
    record. Counted here rather than by fetching /sitemap.xml and parsing it:
    the numbers come from the same rows the sitemap is built from, and an admin
    screen should not make an HTTP request to its own site to answer a question
    it already has the data for.
  */
  const STATIC_ROUTES = 14;
  const sitemapUrlCount =
    STATIC_ROUTES + coverage.groups.reduce((total, group) => total + group.total, 0);

  return (
    <>
      <AdminPageHeader
        title="SEO"
        description="What search engines and AI assistants read: page titles, descriptions, redirects and the sitemap."
      />

      <SeoConsole
        pages={pages}
        redirects={redirects}
        coverage={coverage}
        /*
          The model NAME, not whether a key exists. "gemma4:31b" tells the
          operator which writer produced the copy in front of them; a boolean
          tells them nothing they can act on. Server-side env, read in a server
          component and passed down — the key itself never crosses.
        */
        modelName={process.env.OLLAMA_API_KEY ? (process.env.OLLAMA_MODEL ?? null) : null}
        lastSitemapRefresh={settings.lastSitemapPing}
        sitemapUrlCount={sitemapUrlCount}
      />
    </>
  );
}
