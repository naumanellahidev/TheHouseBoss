import Link from "next/link";
import { FileText, Plus } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { AdminPagination } from "@/components/admin/pagination";
import { ArticleTable } from "@/components/admin/articles/article-table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminArticles } from "@/lib/queries/admin";
import { cn } from "@/lib/utils";
import type { ArticleKind } from "@/types/domain";

export const metadata = { title: "Articles" };

const KIND_TABS = [
  { value: "", label: "Everything" },
  { value: "blog", label: "Blog posts" },
  { value: "market_update", label: "Market updates" },
  { value: "guide", label: "Guides" },
];

const STATUS_TABS = [
  { value: "", label: "All" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Drafts" },
  { value: "archived", label: "Archived" },
];

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;

  const { rows, total, page, pageCount } = await getAdminArticles({
    kind: (params.kind as ArticleKind) || undefined,
    status: (params.status as "draft" | "published" | "archived") || undefined,
    search: params.q || undefined,
    page: Number(params.page) || 1,
  });

  const filtered = Boolean(params.kind || params.status || params.q);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Articles"
        description={
          total > 0
            ? `${total} ${total === 1 ? "article" : "articles"}, drafts included.`
            : undefined
        }
        actions={
          <Button asChild variant="accent">
            <Link href="/admin/articles/new">
              <Plus aria-hidden="true" />
              Write an article
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <nav aria-label="Filter by kind" className="flex flex-wrap gap-2">
          {KIND_TABS.map((tab) => (
            <FilterLink
              key={tab.value || "all"}
              href={buildHref(params, { kind: tab.value || null })}
              active={(params.kind ?? "") === tab.value}
            >
              {tab.label}
            </FilterLink>
          ))}
        </nav>

        <nav aria-label="Filter by status" className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <FilterLink
              key={tab.value || "all"}
              href={buildHref(params, { status: tab.value || null })}
              active={(params.status ?? "") === tab.value}
            >
              {tab.label}
            </FilterLink>
          ))}
        </nav>
      </div>

      {rows.length === 0 ? (
        filtered ? (
          <EmptyState
            title="No articles match these filters"
            description="Try clearing one of them."
            actions={
              <Button asChild variant="outline">
                <Link href="/admin/articles">Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={FileText}
            title="Write your first article"
            description="A market update, a neighbourhood piece, or an answer to a question you get asked every week. The last one is usually the most valuable — it is what an assistant can quote."
            actions={
              <Button asChild variant="accent">
                <Link href="/admin/articles/new">Write an article</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          <ArticleTable rows={rows} />
          <AdminPagination page={page} pageCount={pageCount} total={total} />
        </>
      )}
    </div>
  );
}

function buildHref(
  params: Record<string, string | undefined>,
  updates: Record<string, string | null>,
): string {
  const next = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "page") next.set(key, value);
  }
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `/admin/articles?${query}` : "/admin/articles";
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-md border px-4 text-sm font-medium",
        "transition-colors duration-(--dur-fast)",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        active
          ? "border-accent bg-accent-wash text-foreground"
          : "border-border-strong text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
      )}
    >
      {children}
    </Link>
  );
}
