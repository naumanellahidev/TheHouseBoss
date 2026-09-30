"use client";

import * as React from "react";
import { ExternalLink, Search, Trash2, Wand2, X } from "lucide-react";

import {
  deleteSeoOverride,
  generateForPath,
  saveSeoOverride,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Input, Textarea } from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import type { SeoPage } from "@/lib/queries/platform";
import { cn } from "@/lib/utils";
import { relativeTime } from "@/lib/utils/date";

/**
 * SEO → Pages.
 *
 * Every `seo_pages` row, filtered by what is wrong with it rather than by
 * type, because the reason to open this tab is always a problem. Editing
 * happens in a panel beside the list instead of a modal, so the row stays
 * visible while its title is being rewritten.
 */

const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 158;

type Filter = "all" | "problems" | "blank" | "length" | "noindex";

type Draft = {
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
};

const problemsOf = (page: SeoPage) => {
  const out: string[] = [];
  if (!page.title?.trim()) out.push("no title");
  else if (page.title.length > TITLE_MAX) out.push(`title ${page.title.length}`);
  if (!page.description?.trim()) out.push("no description");
  else if (page.description.length < DESC_MIN) out.push(`description ${page.description.length}`);
  else if (page.description.length > DESC_MAX) out.push(`description ${page.description.length}`);
  return out;
};

export function SeoPagesPanel({
  pages,
  onRefresh,
}: {
  pages: SeoPage[];
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("problems");
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const rows = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    return pages.filter((page) => {
      if (term && !`${page.path} ${page.title ?? ""}`.toLowerCase().includes(term)) return false;
      const problems = problemsOf(page);
      if (filter === "problems") return problems.length > 0;
      if (filter === "blank") return !page.title?.trim() || !page.description?.trim();
      if (filter === "length") {
        return problems.some((p) => /\d/.test(p));
      }
      if (filter === "noindex") return page.noindex;
      return true;
    });
  }, [pages, query, filter]);

  const counts = React.useMemo(
    () => ({
      all: pages.length,
      problems: pages.filter((page) => problemsOf(page).length > 0).length,
      blank: pages.filter((page) => !page.title?.trim() || !page.description?.trim()).length,
      length: pages.filter((page) => problemsOf(page).some((p) => /\d/.test(p))).length,
      noindex: pages.filter((page) => page.noindex).length,
    }),
    [pages],
  );

  async function save() {
    if (!draft) return;
    setBusy("save");
    const result = await saveSeoOverride({
      path: draft.path,
      title: draft.title || null,
      description: draft.description || null,
      canonicalUrl: draft.canonicalUrl || null,
      noindex: draft.noindex,
      nofollow: draft.nofollow,
    });
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Saved.");
      setDraft(null);
      onRefresh();
    } else toast.error(result.error ?? "That could not be saved.");
  }

  async function generate(path: string) {
    setBusy(`generate:${path}`);
    const result = await generateForPath(path);
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Generated.");
      onRefresh();
    } else toast.error(result.error ?? "Generation failed.");
  }

  async function remove(path: string) {
    setBusy(`delete:${path}`);
    const result = await deleteSeoOverride(path);
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Removed.");
      if (draft?.path === path) setDraft(null);
      onRefresh();
    } else toast.error(result.error ?? "That could not be removed.");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {/* ── The list ──────────────────────────────────────────────────── */}
      <section
        aria-labelledby="pages-heading"
        className={cn("admin-card flex flex-col gap-4 p-5", draft ? "xl:col-span-7" : "xl:col-span-12")}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id="pages-heading" className="text-h4">
            Page metadata
          </h3>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-foreground-subtle"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Path or title"
              aria-label="Search page metadata"
              className="h-11 w-full rounded-full border border-border-strong bg-surface pr-4 pl-10 text-body text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:w-64"
            />
          </div>
        </div>

        <nav aria-label="Filter pages" className="scroll-row gap-2">
          {(
            [
              ["problems", "Needs attention"],
              ["blank", "Blank fields"],
              ["length", "Out of length"],
              ["noindex", "Noindexed"],
              ["all", "Everything"],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold",
                "transition-colors duration-(--dur-fast)",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                filter === key
                  ? "bg-primary text-primary-fg"
                  : "bg-surface-sunken text-foreground-muted hover:text-foreground",
              )}
            >
              {label}
              <span className="tabular text-xs opacity-80">{counts[key]}</span>
            </button>
          ))}
        </nav>

        {rows.length === 0 ? (
          <p className="rounded-2xl bg-surface-sunken p-4 text-sm text-foreground-muted">
            Nothing matches that filter. That is usually good news.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((page) => {
              const problems = problemsOf(page);
              return (
                <li
                  key={page.id}
                  className={cn(
                    "flex flex-wrap items-start gap-3 rounded-2xl px-3 py-3",
                    draft?.path === page.path ? "bg-accent-wash" : "bg-surface-sunken",
                  )}
                >
                  <span className="flex min-w-60 flex-1 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <code className="text-sm font-semibold text-foreground">{page.path}</code>
                      {page.noindex ? <Badge tone="neutral">noindex</Badge> : null}
                      {problems.map((problem) => (
                        <Badge key={problem} tone="pending">
                          {problem}
                        </Badge>
                      ))}
                    </span>
                    <span className="line-clamp-1 text-xs text-foreground-muted">
                      {page.title || "No title"}
                    </span>
                    <span className="line-clamp-1 text-xs text-foreground-subtle">
                      {page.description || "No description"}
                    </span>
                    <span className="text-xs text-foreground-subtle">
                      Updated {relativeTime(page.updatedAt)}
                    </span>
                  </span>

                  <span className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full"
                      onClick={() =>
                        setDraft({
                          path: page.path,
                          title: page.title ?? "",
                          description: page.description ?? "",
                          canonicalUrl: page.canonicalUrl ?? "",
                          noindex: page.noindex,
                          nofollow: page.nofollow,
                        })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full"
                      loading={busy === `generate:${page.path}`}
                      onClick={() => void generate(page.path)}
                    >
                      <Wand2 aria-hidden="true" />
                      Rewrite
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full" asChild>
                      <a href={page.path} target="_blank" rel="noreferrer">
                        <ExternalLink aria-hidden="true" />
                        <span className="sr-only">Open {page.path} in a new tab</span>
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-danger hover:bg-danger-bg hover:text-danger"
                      loading={busy === `delete:${page.path}`}
                      onClick={() => void remove(page.path)}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">Remove the override for {page.path}</span>
                    </Button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ── The editor ────────────────────────────────────────────────── */}
      {draft ? (
        <section
          aria-labelledby="editor-heading"
          className="admin-card flex h-fit flex-col gap-4 p-5 xl:col-span-5"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h3 id="editor-heading" className="text-h4">
                Edit metadata
              </h3>
              <code className="text-xs text-foreground-muted">{draft.path}</code>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-full"
              onClick={() => setDraft(null)}
            >
              <X aria-hidden="true" />
              <span className="sr-only">Close the editor</span>
            </Button>
          </div>

          <Field>
            <FieldLabel>Title</FieldLabel>
            <Input
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
            />
            <FieldDescription>
              <Counter value={draft.title.length} max={TITLE_MAX} />
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Description</FieldLabel>
            <Textarea
              rows={4}
              value={draft.description}
              onChange={(event) => setDraft({ ...draft, description: event.target.value })}
            />
            <FieldDescription>
              <Counter value={draft.description.length} min={DESC_MIN} max={DESC_MAX} />
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel>Canonical URL</FieldLabel>
            <Input
              value={draft.canonicalUrl}
              placeholder="Leave empty to use this page"
              onChange={(event) => setDraft({ ...draft, canonicalUrl: event.target.value })}
            />
            <FieldDescription>
              Only set this when another URL should be treated as the original.
            </FieldDescription>
          </Field>

          <SwitchField
            label="Keep this page out of search results"
            description="noindex. The page still works for anyone with the link."
            checked={draft.noindex}
            onCheckedChange={(next) => setDraft({ ...draft, noindex: next })}
          />
          <SwitchField
            label="Do not follow links from this page"
            description="nofollow. Rarely the right answer on your own site."
            checked={draft.nofollow}
            onCheckedChange={(next) => setDraft({ ...draft, nofollow: next })}
          />

          <div className="flex flex-wrap gap-2 border-t border-border pt-4">
            <Button loading={busy === "save"} onClick={() => void save()}>
              Save
            </Button>
            <Button
              variant="outline"
              loading={busy === `generate:${draft.path}`}
              onClick={() => void generate(draft.path)}
            >
              <Wand2 aria-hidden="true" />
              Rewrite with the engine
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/** Character count with the target range said in words, not only in colour. */
function Counter({ value, min, max }: { value: number; min?: number; max: number }) {
  const short = min !== undefined && value > 0 && value < min;
  const long = value > max;
  const label = short
    ? `${value} characters — short, aim for ${min}–${max}`
    : long
      ? `${value} characters — over ${max}, it will be truncated`
      : value === 0
        ? `Empty — aim for ${min ? `${min}–${max}` : `up to ${max}`} characters`
        : `${value} characters`;

  return (
    <span className={cn(short || long ? "text-warning" : "text-foreground-subtle")}>{label}</span>
  );
}

