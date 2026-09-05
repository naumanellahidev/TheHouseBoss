"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Eye, Save, Sparkles, X } from "lucide-react";

import {
  createArticle,
  saveArticle,
  suggestArticleSlug,
} from "@/app/(admin)/admin/(shell)/content-actions";
import {
  suggestArticleFaq,
  suggestArticleSeo,
} from "@/app/(admin)/admin/(shell)/seo-suggest";
import { ArticleEditor } from "@/components/admin/articles/editor";
import { FaqRepeater } from "@/components/admin/faq-repeater";
import { ImageField } from "@/components/admin/image-field";
import { TagInput } from "@/components/admin/tag-input";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import {
  ARTICLE_KINDS,
  articleChecklist,
  canPublishArticle,
  type ArticleInput,
} from "@/lib/validation/article";
import { shortAgo } from "@/lib/utils/date";
import { cn, slugify } from "@/lib/utils";
import type { City } from "@/types/domain";

/**
 * The article editor — docs/06 § 5.
 *
 * Body on the left, everything else in a sidebar, which is the layout a writer
 * actually wants: the thing being written gets the width, and the metadata
 * stays visible without stealing focus.
 *
 * Shares the listing editor's save discipline, and for the same reasons learned
 * there: writes are chained so a slow autosave cannot overwrite a newer save,
 * autosave failures raise a toast rather than failing silently, and the slug is
 * derived rather than left to fail validation on a field the writer never
 * opened.
 *
 * Images need the article to exist first — they are filed under
 * `articles/{id}/` — so on a new article the editor's image button and the
 * cover field say so instead of failing.
 */

const KIND_LABELS: Record<string, string> = {
  blog: "Blog post",
  market_update: "Market update",
  guide: "Guide",
};

const AUTOSAVE_MS = 30_000;

export function ArticleForm({
  articleId: initialId,
  initial,
  cities,
  knownTags,
  publishedAt,
}: {
  articleId: string | null;
  initial: ArticleInput;
  cities: City[];
  knownTags: string[];
  publishedAt?: string | null;
}) {
  const router = useRouter();
  const toast = useToast();

  const [articleId, setArticleId] = React.useState(initialId);
  const [values, setValues] = React.useState<ArticleInput>(initial);
  const [dirty, setDirty] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState<false | "draft" | "publish">(false);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});

  /** Writes are strictly ordered — see the note in the listing editor. */
  const saveChain = React.useRef<Promise<unknown>>(Promise.resolve());

  const [writingSeo, setWritingSeo] = React.useState(false);
  const [findingFaq, setFindingFaq] = React.useState(false);

  /*
    §21. Finds question-shaped headings and the prose beneath each.

    Merges rather than replaces: a question the author already added by hand
    survives, because the suggester has no way to know it was deliberate and
    overwriting it would lose work silently.
  */
  async function findFaq() {
    setFindingFaq(true);
    const result = await suggestArticleFaq({
      bodyJson: values.bodyJson,
      bodyText: values.bodyText,
    });
    setFindingFaq(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    const existing = values.faq ?? [];
    const seen = new Set(existing.map((item) => item.q.trim().toLowerCase()));
    const added = result.items.filter(
      (item) => !seen.has(item.q.trim().toLowerCase()),
    );

    if (added.length === 0) {
      toast.success("Everything it found is already in your list.");
      return;
    }

    set("faq", [...existing, ...added.map(({ q, a }) => ({ q, a }))]);
    toast.success(
      `Added ${added.length} ${added.length === 1 ? "question" : "questions"}. Edit the answers — they are your own words, trimmed.`,
    );
  }

  /*
    Same contract as the listing editor's: fill the two fields, save nothing.
    Publishing writes the generated metadata regardless; this shows what it will
    say while there is still time to disagree with it.
  */
  async function writeSeo() {
    setWritingSeo(true);
    const result = await suggestArticleSeo({
      title: values.title ?? "",
      excerpt: values.excerpt ?? null,
      bodyText: values.bodyText ?? null,
    });
    setWritingSeo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    set("metaTitle", result.title);
    set("metaDesc", result.description);
    toast.success(
      result.usedModel
        ? "Written and polished from your own words."
        : "Written from the title and opening paragraphs.",
    );
  }

  function set<K extends keyof ArticleInput>(key: K, value: ArticleInput[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setDirty(true);
  }

  const persist = React.useCallback(
    async (payload: ArticleInput, mode: "draft" | "publish" | "auto") => {
      if (mode !== "auto") setSaving(mode === "publish" ? "publish" : "draft");

      const previous = saveChain.current;
      let release: () => void = () => {};
      saveChain.current = new Promise<void>((resolve) => {
        release = resolve;
      });
      await previous.catch(() => {});

      let result;
      try {
        result = articleId
          ? await saveArticle(articleId, payload)
          : await createArticle(payload);
      } finally {
        release();
      }

      setSaving(false);

      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(
          mode === "auto"
            ? `Autosave failed. ${result.error} Your work is still on screen.`
            : result.error,
        );
        return false;
      }

      setErrors({});
      setDirty(false);
      setSavedAt(new Date());

      if (!articleId && "data" in result && result.data && "id" in result.data) {
        const created = result.data as { id: string; slug: string };
        setArticleId(created.id);
        router.replace(`/admin/articles/${created.id}/edit`);
      }

      if (mode !== "auto") {
        toast.success(
          mode === "publish" ? "Article published." : "Draft saved.",
        );
      }
      return true;
    },
    [articleId, router, toast],
  );

  /** Autosave: drafts only, and only when there is something to save. */
  React.useEffect(() => {
    if (!articleId) return;
    const timer = setInterval(() => {
      if (!dirty || saving) return;
      void persist(values, "auto");
    }, AUTOSAVE_MS);
    return () => clearInterval(timer);
  }, [articleId, dirty, saving, values, persist]);

  React.useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  async function submit(mode: "draft" | "publish") {
    let payload = { ...values };

    // The slug is derived from the title rather than being a field that fails
    // validation on a sidebar the writer never scrolled to.
    if (!payload.slug || payload.slug.length < 3) {
      const slug = await suggestArticleSlug(payload.title, articleId ?? undefined);
      payload = { ...payload, slug };
      setValues(payload);
    }

    if (mode === "publish") payload = { ...payload, status: "published" };
    await persist(payload, mode);
  }

  const checklist = articleChecklist(values);
  const publishable = canPublishArticle(values);
  const errorOf = (key: string) => errors[key]?.[0];

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void submit("draft");
      }}
      className="flex flex-col gap-6 pb-32"
    >
      <div className="grid gap-8 lg:grid-cols-3">
        {/* ── Body ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Field error={errorOf("title")}>
            <FieldLabel required>Title</FieldLabel>
            <Input
              value={values.title}
              onChange={(event) => set("title", event.target.value)}
              placeholder="What the Lake Mary market actually did this quarter"
            />
            <FieldDescription>
              This is the page&rsquo;s heading and its search-result title. Say
              what the piece answers.
            </FieldDescription>
          </Field>

          <Field error={errorOf("bodyJson")}>
            <FieldLabel required>Body</FieldLabel>
            <ArticleEditor
              value={values.bodyJson}
              articleId={articleId}
              onChange={(doc, text) => {
                setValues((current) => ({
                  ...current,
                  bodyJson: doc as ArticleInput["bodyJson"],
                  bodyText: text,
                }));
                setDirty(true);
              }}
            />
          </Field>

          <Field error={errorOf("excerpt")}>
            <FieldLabel>Excerpt</FieldLabel>
            <Textarea
              rows={3}
              value={values.excerpt ?? ""}
              onChange={(event) => set("excerpt", event.target.value)}
              placeholder="One or two sentences summarising the answer."
            />
            <FieldDescription>
              Shown on every card that links to this article, and it is the
              sentence most likely to be quoted. Leave it blank and the first
              paragraph is used instead.
              {!values.excerpt?.trim() && values.bodyText.trim() ? (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() =>
                      set("excerpt", firstSentences(values.bodyText, 200))
                    }
                    className="font-medium text-accent-quiet underline underline-offset-4"
                  >
                    Draft one from the first paragraph
                  </button>
                </>
              ) : null}
            </FieldDescription>
          </Field>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
            <Field error={errorOf("kind")}>
              <FieldLabel required>Kind</FieldLabel>
              <Select
                value={values.kind}
                onChange={(event) =>
                  set("kind", event.target.value as ArticleInput["kind"])
                }
              >
                {ARTICLE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </Select>
              <FieldDescription>
                A market update also appears under Market Updates. A blog post
                attached to Lake Mary appears on the Lake Mary blog.
              </FieldDescription>
            </Field>

            <Field error={errorOf("cityId")}>
              <FieldLabel>City</FieldLabel>
              <Select
                value={values.cityId ?? ""}
                onChange={(event) => set("cityId", event.target.value || null)}
              >
                <option value="">Not about one city</option>
                {cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field>
              <FieldLabel>Tags</FieldLabel>
              <TagInput
                value={values.tags}
                onChange={(next) => set("tags", next)}
                suggestions={knownTags}
                max={20}
                placeholder="Type a tag, then Enter"
              />
            </Field>
          </div>

          <div className="rounded-lg border border-border bg-surface p-5">
            <ImageField
              label="Cover image"
              description="Appears on cards and when the article is shared."
              entityType="article"
              entityId={articleId}
              imageKey={values.coverKey ?? null}
              alt={values.coverAlt ?? null}
              disabledReason="Save this article once and a cover can be added — images are filed under the article."
              onChange={({ key, alt }) => {
                setValues((current) => ({
                  ...current,
                  coverKey: key,
                  coverAlt: alt,
                }));
                setDirty(true);
              }}
            />
            {errorOf("coverAlt") ? (
              <p className="mt-2 text-xs font-medium text-danger">
                {errorOf("coverAlt")}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-5">
            <Field error={errorOf("slug")}>
              <FieldLabel>Web address</FieldLabel>
              <div className="flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3">
                <span className="shrink-0 text-sm text-foreground-subtle">/…/</span>
                <input
                  value={values.slug}
                  onChange={(event) => set("slug", slugify(event.target.value))}
                  className="h-11 min-w-0 flex-1 bg-transparent text-body text-foreground focus-visible:outline-none"
                />
              </div>
              <FieldDescription>
                Generated from the title when you first save. Leave it alone once
                the article is live.
              </FieldDescription>
            </Field>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface-sunken p-4">
              <p className="max-w-[58ch] text-sm text-foreground-muted">
                Both of these are optional. When you publish, they are written
                from your title and opening paragraphs. Press the button to see
                what that will say.
              </p>
              <Button
                type="button"
                variant="outline"
                loading={writingSeo}
                onClick={writeSeo}
              >
                <Sparkles aria-hidden="true" />
                Write it for me
              </Button>
            </div>

            <Field error={errorOf("metaTitle")}>
              <FieldLabel>Meta title</FieldLabel>
              <Input
                value={values.metaTitle ?? ""}
                onChange={(event) => set("metaTitle", event.target.value)}
                placeholder={values.title}
              />
            </Field>

            <Field error={errorOf("metaDesc")}>
              <FieldLabel>Meta description</FieldLabel>
              <Textarea
                rows={3}
                value={values.metaDesc ?? ""}
                onChange={(event) => set("metaDesc", event.target.value)}
              />
              <FieldDescription>
                <span className="tabular">{(values.metaDesc ?? "").length}</span> / 155.
                Optional — leave it blank and one is written from your opening
                paragraphs when you publish. Type here only to override that.
              </FieldDescription>
            </Field>
          </div>

          {/* ── §21. Questions this article answers ───────────────────── */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-h4 font-semibold">
                  Questions this article answers
                </h3>
                <p className="max-w-[68ch] text-sm text-foreground-muted">
                  These appear at the end of the article and are what an AI
                  assistant quotes when somebody asks one of them. Nothing is
                  invented — the button finds headings you wrote as questions and
                  pairs each with what you wrote underneath.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                loading={findingFaq}
                onClick={findFaq}
              >
                <Sparkles aria-hidden="true" />
                Find them in my article
              </Button>
            </div>

            <FaqRepeater
              value={values.faq ?? []}
              onChange={(next) => set("faq", next)}
              description="Only include a question the article genuinely answers. The markup search engines read is built from this list, so a question here that the page does not answer is a policy problem, not just a bad answer."
            />
          </div>

          {/* ── Pre-publish checklist ─────────────────────────────────── */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-5">
            <h3 className="text-h4 font-semibold text-foreground">
              Before publishing
            </h3>
            <ul className="flex flex-col gap-1.5">
              {checklist.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-2.5 text-sm text-foreground-muted"
                >
                  {item.ok ? (
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                  ) : (
                    <X className="mt-0.5 size-4 shrink-0 text-danger" aria-hidden="true" />
                  )}
                  <span className={cn(item.ok && "text-foreground-subtle")}>
                    {item.label}
                    {item.ok ? <span className="sr-only"> — done</span> : null}
                  </span>
                </li>
              ))}
            </ul>

            {publishedAt ? (
              <p className="border-t border-border pt-3 text-xs text-foreground-subtle">
                First published{" "}
                {new Date(publishedAt).toLocaleDateString("en-US")}. That date is
                stamped once and never moves.
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      {/* ── Sticky action bar ──────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur-md safe-bottom md:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1 text-xs text-foreground-muted" aria-live="polite">
            {saving
              ? "Saving…"
              : Object.keys(errors).length > 0
                ? "Some fields need attention"
                : savedAt
                  ? `Saved ${shortAgo(savedAt)}`
                  : dirty
                    ? "Unsaved changes"
                    : "No changes"}
          </p>

          {articleId ? (
            <Button asChild variant="ghost" size="sm">
              <a
                href={`/admin/preview/article/${articleId}`}
                target="_blank"
                rel="noreferrer"
              >
                {values.status === "published" ? (
                  <ExternalLink aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
                Preview
              </a>
            </Button>
          ) : null}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => router.push("/admin/articles")}
          >
            Cancel
          </Button>

          <Button type="submit" variant="outline" size="sm" loading={saving === "draft"}>
            <Save aria-hidden="true" />
            Save draft
          </Button>

          <Button
            type="button"
            variant="accent"
            size="sm"
            loading={saving === "publish"}
            disabled={!publishable}
            onClick={() => void submit("publish")}
          >
            {values.status === "published" ? "Save & keep live" : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}

/** First couple of sentences, for the excerpt draft button. */
function firstSentences(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
}
