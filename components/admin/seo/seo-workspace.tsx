"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Gauge, Link2, ListChecks, Settings2, SignpostBig } from "lucide-react";

import { SeoEnginePanel, type EngineSettings, type QueueCounts } from "@/components/admin/seo/seo-engine-panel";
import { SeoLinksPanel, type PendingLink } from "@/components/admin/seo/seo-links-panel";
import { SeoOverview } from "@/components/admin/seo/seo-overview";
import { SeoPagesPanel } from "@/components/admin/seo/seo-pages-panel";
import { SeoRedirectsPanel } from "@/components/admin/seo/seo-redirects-panel";
import type { Redirect, SeoCoverage, SeoPage } from "@/lib/queries/platform";
import { cn } from "@/lib/utils";

/**
 * The SEO workspace — docs/06 § 12.
 *
 * Five tabs rather than one long scroll. The old screen stacked health, link
 * review, a metadata table, redirects and the sitemap summary on a single
 * page, which meant the answer to "what is wrong" was somewhere above the
 * answer to "where do I fix it", and both were below a table nobody reads
 * daily.
 *
 * The tab lives in the URL hash, so a link to the links queue is a link
 * somebody can send. It is a client component because every panel under it is
 * buttons; the data comes from the server page above.
 */

const TABS = [
  { id: "overview", label: "Overview", icon: Gauge },
  { id: "pages", label: "Pages", icon: ListChecks },
  { id: "links", label: "Links", icon: Link2 },
  { id: "redirects", label: "Redirects", icon: SignpostBig },
  { id: "engine", label: "Engine", icon: Settings2 },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function SeoWorkspace({
  pages,
  redirects,
  coverage,
  engineSettings,
  pendingLinks,
  queue,
  modelName,
  lastSitemapRefresh,
  sitemapStale,
  sitemapUrlCount,
}: {
  pages: SeoPage[];
  redirects: Redirect[];
  coverage: SeoCoverage;
  engineSettings: EngineSettings;
  pendingLinks: PendingLink[];
  queue: QueueCounts;
  modelName: string | null;
  lastSitemapRefresh: string | null;
  sitemapStale: boolean;
  sitemapUrlCount: number;
}) {
  const router = useRouter();
  const [tab, setTab] = React.useState<TabId>("overview");

  // Open the tab named in the hash, once, so a shared link lands in the right
  // place. Deferred by a frame: reading location during render would differ
  // between the server and the client pass.
  React.useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const hash = window.location.hash.replace("#", "");
      if (TABS.some((item) => item.id === hash)) setTab(hash as TabId);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const go = React.useCallback((next: string) => {
    if (!TABS.some((item) => item.id === next)) return;
    setTab(next as TabId);
    window.history.replaceState(null, "", `#${next}`);
  }, []);

  const refresh = React.useCallback(() => router.refresh(), [router]);

  const badges: Partial<Record<TabId, number>> = {
    pages: pages.filter(
      (page) =>
        !page.title?.trim() ||
        !page.description?.trim() ||
        (page.title?.length ?? 0) > 60 ||
        (page.description?.length ?? 0) > 158,
    ).length,
    links: pendingLinks.length,
  };

  return (
    <div className="flex flex-col gap-5">
      <nav aria-label="SEO sections" className="scroll-row gap-1 self-start rounded-full border border-border bg-surface p-1 shadow-card">
        {TABS.map(({ id, label, icon: Icon }) => {
          const count = badges[id] ?? 0;
          const active = tab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                "transition-colors duration-(--dur-fast)",
                "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                active
                  ? "bg-primary text-primary-fg"
                  : "text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
              {count > 0 ? (
                <span
                  className={cn(
                    "inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-overline font-semibold tabular",
                    active ? "bg-surface text-primary" : "bg-accent text-accent-fg",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </button>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <SeoOverview
          pages={pages}
          coverage={coverage}
          queue={queue}
          pendingLinks={pendingLinks.length}
          sitemapUrlCount={sitemapUrlCount}
          lastSitemapRefresh={lastSitemapRefresh}
          sitemapStale={sitemapStale}
          modelName={modelName}
          onGoToTab={go}
          onRefresh={refresh}
        />
      ) : null}

      {tab === "pages" ? <SeoPagesPanel pages={pages} onRefresh={refresh} /> : null}

      {tab === "links" ? <SeoLinksPanel links={pendingLinks} onRefresh={refresh} /> : null}

      {tab === "redirects" ? (
        <SeoRedirectsPanel redirects={redirects} onRefresh={refresh} />
      ) : null}

      {tab === "engine" ? (
        <SeoEnginePanel
          initialSettings={engineSettings}
          queue={queue}
          modelName={modelName}
          onRefresh={refresh}
        />
      ) : null}
    </div>
  );
}
