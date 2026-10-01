import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ARTICLE_KIND_LABELS,
  articleFacets,
  articleQuery,
  isFiltered,
  type ArticleParams,
} from "@/lib/validation/article-params";
import { cn } from "@/lib/utils";
import type { ArticleCard } from "@/types/domain";

/**
 * Search and filter for the article index.
 *
 * ── A form, not a client component ────────────────────────────────────────
 *
 * `<form method="get">` with a submit button. No `use client`, no state, no
 * effects — the URL is the state and the server does the filtering, so this
 * works with JavaScript switched off, survives a shared link, and cannot get out
 * of step with the results underneath it.
 *
 * The topic chips are anchors rather than checkboxes for the same reason: a chip
 * is one link that keeps every other filter, which `articleQuery` builds. That
 * also means a crawler can see the topics exist, which a form control does not
 * expose.
 *
 * ── Why every option is derived ───────────────────────────────────────────
 *
 * `articleFacets` reads the options out of the articles, so a city or a topic
 * appears the moment something is written about it and never before. A hardcoded
 * list goes stale on the first new city, and an option that matches nothing is a
 * dead end a visitor has to press to discover — the same rule as the listing
 * filters (CLAUDE.md § 3 rule 22).
 */
export function ArticleFilters({
  /** Everything published in scope — the set the options are derived from. */
  all,
  params,
  /** Where the form submits. The city page keeps its own path. */
  basePath,
  /** Set on a per-city page: the city control is dropped and the value kept. */
  lockedCity,
  /** How many articles the current parameters matched. */
  resultCount,
}: {
  all: ArticleCard[];
  params: ArticleParams;
  basePath: string;
  lockedCity?: string;
  resultCount: number;
}) {
  const facets = articleFacets(all);
  const filtered = isFiltered(params);

  /*
    `text-body`, not `text-sm`.

    Sixteen pixels is the threshold below which iOS Safari zooms the page when a
    form control takes focus, and it does it for a <select> as readily as an
    input. The zoom does not undo itself: the visitor is left on a page scrolled
    sideways, which on the filter bar means the results they were filtering are
    off screen. docs/04 § 5.
  */
  const selectClass = cn(
    "min-h-11 rounded-full border border-border bg-surface px-4 text-body font-medium text-foreground",
    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
  );

  return (
    <div className="flex flex-col gap-4">
      <form
        method="get"
        action={basePath}
        // The landmark, so a screen-reader user can jump straight to it.
        role="search"
        aria-label="Search articles"
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-card"
      >
        {/*
          The locked city travels as a hidden field.

          On `/articles/sanford` the path already says which city it is, but the
          form posts back to that same path and the parameter has to survive a
          text search — otherwise searching inside a city silently widens to all
          of them.
        */}
        {lockedCity ? <input type="hidden" name="city" value={lockedCity} /> : null}

        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <label htmlFor="article-q" className="text-sm font-semibold text-foreground">
              Search
            </label>
            <div className="flex items-center gap-2 rounded-full border border-border-strong bg-surface px-4">
              <Search className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
              <input
                id="article-q"
                name="q"
                type="search"
                defaultValue={params.q}
                placeholder="Roof age, assumable, schools, closing costs…"
                className="h-11 min-w-0 flex-1 bg-transparent text-body text-foreground focus-visible:outline-none"
              />
            </div>
          </div>

          {!lockedCity && facets.cities.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="article-city" className="text-sm font-semibold text-foreground">
                City
              </label>
              <select
                id="article-city"
                name="city"
                defaultValue={params.city}
                className={selectClass}
              >
                <option value="">Every city</option>
                {facets.cities.map((city) => (
                  <option key={city.slug} value={city.slug}>
                    {city.name} ({city.count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {facets.kinds.length > 1 ? (
            <div className="flex flex-col gap-1.5">
              <label htmlFor="article-kind" className="text-sm font-semibold text-foreground">
                Type
              </label>
              <select
                id="article-kind"
                name="kind"
                defaultValue={params.kind}
                className={selectClass}
              >
                <option value="">Every type</option>
                {facets.kinds.map(({ kind, count }) => (
                  <option key={kind} value={kind}>
                    {ARTICLE_KIND_LABELS[kind]} ({count})
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="article-sort" className="text-sm font-semibold text-foreground">
              Order
            </label>
            <select
              id="article-sort"
              name="sort"
              defaultValue={params.sort}
              className={selectClass}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>

          {/*
            An explicit submit, because the selects do not auto-submit without
            JavaScript. It also means one navigation for a search plus two
            dropdowns instead of three.
          */}
          <Button type="submit" className="rounded-full md:self-end">
            Show articles
          </Button>
        </div>

        {/* The active topic rides along, so searching does not drop it. */}
        {params.tag ? <input type="hidden" name="tag" value={params.tag} /> : null}
      </form>

      {facets.tags.length > 0 ? (
        <div className="flex flex-col gap-2">
          <p id="article-topics" className="text-sm font-semibold text-foreground">
            Topics
          </p>
          <nav aria-labelledby="article-topics" className="scroll-row gap-2 md:flex-wrap">
            {facets.tags.map(({ tag, count }) => {
              const on = params.tag === tag;
              return (
                <Link
                  key={tag}
                  href={`${basePath}${articleQuery(params, { tag: on ? "" : tag })}`}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium",
                    "transition-colors duration-(--dur-fast)",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                    on
                      ? "border-accent bg-accent text-accent-fg"
                      : "border-border bg-surface text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
                  )}
                >
                  {tag}
                  <span className={cn("text-xs tabular", on ? "text-accent-fg/80" : "text-foreground-subtle")}>
                    {count}
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-foreground-muted" aria-live="polite">
          {resultCount === all.length
            ? `${all.length} ${all.length === 1 ? "article" : "articles"}`
            : `${resultCount} of ${all.length} ${all.length === 1 ? "article" : "articles"}`}
        </p>

        {filtered ? (
          <Link
            href={basePath}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold",
              "text-accent-quiet hover:bg-accent-wash",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
            )}
          >
            <X className="size-4" aria-hidden="true" />
            Clear filters
          </Link>
        ) : null}
      </div>
    </div>
  );
}
