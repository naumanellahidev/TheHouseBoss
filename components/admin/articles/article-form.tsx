"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, Eye, Save, Sparkles, X } from "lucide-react";

import {
  createArticle,
  saveArticle,
  suggestArticleSlug,
} from "@/app/(admin)/admin/(shell)/content-actions";
import { suggestArticleFaq } from "@/app/(admin)/admin/(shell)/seo-suggest";
import { autofixArticleSeo } from "@/app/(admin)/admin/(shell)/seo-autofix";
import { ArticleEditor } from "@/components/admin/articles/editor";
import { FaqRepeater } from "@/components/admin/faq-repeater";
import { RecordSeoPanel } from "@/components/admin/seo/record-seo-panel";
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
import {
  answerFirstText,
  articleDescriptionFrom,
  articleTitleFrom,
  firstSentences,
} from "@/lib/seo/auto/generate";
import { auditArticle } from "@/lib/seo/auto/score";
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
  /*
    What the last pass did, kept so the author can read it.

    A toast says how many fixes happened and disappears. The body of a published
    article has just been restructured, and the list of what changed has to stay
    on screen until she has looked at it.
  */
  const [fixReport, setFixReport] = React.useState<{
    applied: string[];
    skipped: { label: string; why: string }[];
  } | null>(null);
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
    What the generator reads, in one place.

    The previews, the audit and the "Write it for me" request all come from this,
    so the panel cannot show one thing and the publish write another.
    `lib/seo/auto/generate.ts` is pure — no database, no `server-only` — which is
    what lets the real generator run here as the article is typed.
  */
  const articleFacts = React.useMemo(
    () => ({
      title: values.title ?? "",
      excerpt: values.excerpt ?? null,
      bodyText: values.bodyText ?? null,
      kind: values.kind ?? null,
      publishedAt: publishedAt ?? null,
      cityName: cities.find((city) => city.id === values.cityId)?.name ?? null,
    }),
    [values.title, values.excerpt, values.bodyText, values.kind, values.cityId, cities, publishedAt],
  );

  /*
    The audit, recomputed as the article is written.

    `bodyJson` is the input that matters and it changes on every keystroke in the
    editor, so this walks the document on every keystroke. It is a tree walk over
    a document already in memory — no query, no model — and a score that lags
    behind the sentence being typed blames the wrong keystroke.
  */
  const audit = React.useMemo(
    () =>
      auditArticle({
        ...articleFacts,
        slug: values.slug ?? "",
        metaTitle: values.metaTitle ?? null,
        metaDesc: values.metaDesc ?? null,
        coverKey: values.coverKey ?? null,
        coverAlt: values.coverAlt ?? null,
        tags: values.tags ?? [],
        faqCount: (values.faq ?? []).filter((item) => item.q?.trim() && item.a?.trim()).length,
        bodyJson: values.bodyJson,
      }),
    [
      articleFacts,
      values.slug,
      values.metaTitle,
      values.metaDesc,
      values.coverKey,
      values.coverAlt,
      values.tags,
      values.faq,
      values.bodyJson,
    ],
  );

  /*
    Where this article will live, which depends on what it is.

    A market update publishes under /market-updates and a Lake Mary blog post
    under /lake-mary/blog, so a single hard-coded crumb would be wrong for one of
    them — and the crumb is the part of the preview that tells the writer the
    kind selector has the consequence it has.
  */
  const previewPath =
    values.kind === "market_update"
      ? `market-updates › ${values.slug || "…"}`
      : values.kind === "guide"
        ? `guides › ${values.slug || "…"}`
        : `lake-mary › blog › ${values.slug || "…"}`;

  /*
    Same contract as the listing editor's: fill the two fields, save nothing.
    Publishing writes the generated metadata regardless; this shows what it will
    say while there is still time to disagree with it.
  */
  /*
    One button, and it does the work rather than describing it.

    It was "Write it for me" and it filled two fields. The panel beside it was
    listing four things wrong with the article, three of which the system could
    resolve from the author own words — marking the opening paragraph as the
    answer-first block, linking the cities and services she already named, and
    pairing her question headings with the prose underneath them.

    So it now runs the whole pass and reports what it could not reach. What it
    could not reach is always something only she can supply: more words, a
    photograph, a source for a figure. It never writes a sentence into the body.
  */
  async function writeSeo() {
    setWritingSeo(true);
    const result = await autofixArticleSeo({
      ...articleFacts,
      slug: values.slug ?? "",
      bodyJson: values.bodyJson,
      metaTitle: values.metaTitle ?? null,
      metaDesc: values.metaDesc ?? null,
      coverKey: values.coverKey ?? null,
      coverAlt: values.coverAlt ?? null,
      tags: values.tags ?? [],
      faq: values.faq ?? [],
    });
    setWritingSeo(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    /*
      One state update for every field.

      Calling `set` per field would re-render between each, and the editor would
      see a document change while the excerpt it is about to receive is still the
      old one. The merge is what keeps the body and its flattened text in step.
    */
    const { bodyJson: fixedDoc, ...rest } = result.values;
    setValues((current) => ({
      ...current,
      ...rest,
      // The action works on a plain document and the form holds the zod-inferred
      // shape; the editor casts the same way on every keystroke.
      ...(fixedDoc !== undefined
        ? { bodyJson: fixedDoc as ArticleInput["bodyJson"] }
        : {}),
    }));
    setDirty(true);

    if (result.applied.length === 0) {
      toast.success(`Nothing left that I can fix for you. Score ${result.score}.`);
      return;
    }

    toast.success(
      `${result.applied.length} ${result.applied.length === 1 ? "fix" : "fixes"} applied — score ${result.score}. Review the body before you save.`,
    );
    setFixReport({ applied: result.applied, skipped: result.skipped });
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

        {/*
          The questions sit under the writing, not beside it.

          Two reasons, and the second is the one that was visible. They are about
          the BODY — the button reads headings the author wrote as questions and
          pairs each with the prose underneath — so they belong next to the body.
          And now that the editor scrolls inside a fixed viewport, the left column
          ends halfway up the page while the sidebar runs on, which left a column
          of empty space under the editor and a cramped repeater in a third of the
          width. Moving this down fills one and fixes the other.
        */}
        {/* ── §21. Questions this article answers ───────────────────── */}
        <div className="flex flex-col gap-4 admin-card p-5">
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
        </div>

        {/* ── Sidebar ──────────────────────────────────────────────────── */}
        <aside className="flex flex-col gap-6">
          <div className="flex flex-col gap-5 admin-card p-5">
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

          <div className="admin-card p-5">
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

          <div className="flex flex-col gap-5 admin-card p-5">
            {/*
              An explicit id, shared by the Field and the raw input.

              This is a bare <input> rather than <Input>, because it sits inside
              the prefix box with the "/…/" in front of it. <Input> reads its id
              from the Field context; a bare input does not, so the visible
              "Web address" label pointed at nothing and a screen reader
              announced an unnamed text box. Found by the admin axe suite the
              first time it ran over this screen.
            */}
            <Field error={errorOf("slug")} id="article-slug">
              <FieldLabel>Web address</FieldLabel>
              <div className="flex items-center gap-1 rounded-md border border-border-strong bg-surface px-3">
                <span className="shrink-0 text-sm text-foreground-subtle" aria-hidden="true">
                  /…/
                </span>
                <input
                  id="article-slug"
                  aria-describedby="article-slug-description"
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

          </div>

          {/* ── Pre-publish checklist ─────────────────────────────────── */}
          <div className="flex flex-col gap-3 admin-card p-5">
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

      {/*
        ── Search and AI visibility ─────────────────────────────────────

        Full width, below the editor, rather than in the sidebar where the two
        meta fields used to live. The audit is fourteen checks with a sentence
        each; in a third of the screen it is a column of wrapped text nobody
        reads, and the checks about the BODY — the answer-first block, the
        headings, the internal links — belong next to the body, not beside the
        cover image.
      */}
      <section aria-labelledby="article-seo-heading" className="flex flex-col gap-5 admin-card p-5 md:p-6">
        <div className="flex flex-col gap-1 border-b border-border pb-4">
          <p className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
            Written for you
          </p>
          <h2 id="article-seo-heading" className="text-h3">
            Search and AI visibility
          </h2>
          <p className="max-w-[72ch] text-sm text-foreground-muted">
            Everything here is checked against this article as you write it. The
            title and description are optional — leave them blank and they are
            written from your own words when you publish, from the answer-first
            block if there is one.
          </p>
        </div>

        {/*
          What the last pass did, left on screen.

          The toast is gone in four seconds and the body of a published article
          has just been restructured. Both halves matter: what changed, so she
          can check it, and what could not be reached, so a failing check is
          never a mystery.
        */}
        {fixReport ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-sunken p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">What just changed</h3>
              <button
                type="button"
                onClick={() => setFixReport(null)}
                className="inline-flex min-h-11 items-center rounded-full px-3 text-sm font-semibold text-foreground-muted hover:bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                Dismiss
              </button>
            </div>

            {fixReport.applied.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {fixReport.applied.map((line) => (
                  <li key={line} className="flex gap-2 text-sm text-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}

            {fixReport.skipped.length > 0 ? (
              <div className="flex flex-col gap-1.5 border-t border-border pt-3">
                <p className="text-sm font-semibold text-foreground">
                  Left for you — these need words or a photograph only you have
                </p>
                <ul className="flex flex-col gap-1.5">
                  {fixReport.skipped.map((item) => (
                    <li key={item.label} className="text-sm text-foreground-muted">
                      <span className="font-medium text-foreground">{item.label}:</span>{" "}
                      {item.why}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        <RecordSeoPanel
          audit={audit}
          generate={{
            onClick: writeSeo,
            busy: writingSeo,
            label: "Fix what it can",
            note: "Only your own words — it never writes a sentence into the body.",
          }}
          preview={{
            crumb: `thehousebossfl.com › ${previewPath}`,
            title: values.metaTitle?.trim() || articleTitleFrom(articleFacts),
            description:
              values.metaDesc?.trim() ||
              articleDescriptionFrom(articleFacts, values.bodyJson),
            /*
              The answer-first block, shown on its own.

              This is the passage an assistant lifts, and seeing it out of
              context is the only way to tell whether it stands up as an answer
              — which is a different question from whether it reads well as an
              opening paragraph.
            */
            quote: answerFirstText(values.bodyJson) || null,
            quoteLabel: "What an assistant would quote — your answer-first block",
          }}
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field error={errorOf("metaTitle")}>
              <FieldLabel>Meta title</FieldLabel>
              <Input
                value={values.metaTitle ?? ""}
                onChange={(event) => set("metaTitle", event.target.value)}
                placeholder={articleTitleFrom(articleFacts)}
              />
              <FieldDescription>
                Only needed when the headline is too long for a result, or when
                the search wording differs from the headline.
              </FieldDescription>
            </Field>

            <Field error={errorOf("metaDesc")}>
              <FieldLabel>Meta description</FieldLabel>
              <Textarea
                rows={3}
                value={values.metaDesc ?? ""}
                onChange={(event) => set("metaDesc", event.target.value)}
                placeholder={articleDescriptionFrom(articleFacts, values.bodyJson)}
              />
              <FieldDescription>
                <span className="tabular">{(values.metaDesc ?? "").length}</span> / 158.
                Blank means the description in the preview below is published.
              </FieldDescription>
            </Field>
          </div>
        </RecordSeoPanel>
      </section>

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
