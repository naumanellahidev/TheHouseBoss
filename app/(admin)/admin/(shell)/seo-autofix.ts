"use server";

import { requireAdmin } from "@/lib/supabase/server";

/**
 * "Fix what it can" — the one button on an article's SEO panel.
 *
 * ── What it is allowed to do ──────────────────────────────────────────────
 *
 * Restructure and mark up the author's own words, and write the two metadata
 * fields that are generated on publish anyway. Nothing else. It does not add a
 * sentence to the body, does not invent a citation, and does not fabricate alt
 * text for a photograph it has not seen.
 *
 * That boundary is the point rather than a limitation. The goal is to rank
 * inside Google's guidelines: a clear answer at the top, links between pages
 * that are genuinely related, and metadata that describes the page accurately
 * all sit on the right side of the line. Auto-written body copy, manufactured
 * citations and links inserted into sentences nobody wrote sit on the wrong
 * side — they are what a manual spam action is for, and a penalty costs more
 * than every check on the panel is worth.
 *
 * ── Why it returns rather than saves ──────────────────────────────────────
 *
 * Same contract as every other generator here. It hands the form a set of
 * values, the author watches the body change in the editor in front of them,
 * and the save is theirs. A button that rewrote a published article's body
 * without showing it first is a button nobody trusts twice.
 */

export type AutofixInput = {
  title: string;
  slug: string;
  kind: string | null;
  cityName: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  bodyJson: unknown;
  bodyText: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  tags: string[];
  faq: { q: string; a: string }[];
};

/** Only the fields that changed. The form merges them and marks itself dirty. */
export type AutofixValues = {
  bodyJson?: unknown;
  bodyText?: string;
  excerpt?: string | null;
  metaTitle?: string;
  metaDesc?: string;
  tags?: string[];
  faq?: { q: string; a: string }[];
};

export type AutofixResult =
  | {
      ok: true;
      values: AutofixValues;
      applied: string[];
      skipped: { label: string; why: string }[];
      score: number;
      usedModel: boolean;
    }
  | { ok: false; error: string };

export async function autofixArticleSeo(input: AutofixInput): Promise<AutofixResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Your session has expired. Sign in again." };
  }

  if (!input?.title?.trim()) {
    return { ok: false, error: "Give the article a title first." };
  }

  const [autofix, faqEngine, scoring, generate, reviewModule, ollama] = await Promise.all([
    import("@/lib/seo/auto/article-autofix"),
    import("@/lib/seo/engine/faq"),
    import("@/lib/seo/auto/score"),
    import("@/lib/seo/auto/generate"),
    import("@/lib/seo/auto/review"),
    import("@/lib/seo/auto/ollama"),
  ]);

  const values: AutofixValues = {};
  const applied: string[] = [];
  const skipped: { label: string; why: string }[] = [];

  /* ── 1. The body: answer-first, paragraphs, excerpt ───────────────────── */

  // Structure first, links second: a link whose anchor straddled a paragraph
  // split would have to be rebuilt, so the cuts are made before anything is
  // marked.
  const structured = autofix.fixArticleBody({
    doc: input.bodyJson,
    excerpt: input.excerpt,
    link: false,
  });
  applied.push(...structured.report.applied);
  skipped.push(...structured.report.skipped);

  /* ── 1b. Internal links: the AI matcher, then the phrase list ─────────── */

  const { LINK_FLOOR, planArticleLinks } = await import("@/lib/seo/auto/link-matcher");
  const { analyzeDocument, documentText } = await import("@/lib/seo/auto/document");

  /*
    Excluded by slug, not by URL.

    This action has the city's NAME and not its slug, and an article's URL
    depends on the slug of its city. Computing the href here would get it wrong
    for every city article and leave the article in its own catalogue, free to be
    linked to itself. The slug needs no city to be correct.
  */
  const plan = await planArticleLinks({
    doc: structured.doc,
    title: input.title,
    selfHref: null,
    selfSlug: input.slug || null,
  });

  if (plan.added.length > 0) {
    applied.push(
      `Linked ${plan.added.length} ${plan.added.length === 1 ? "phrase" : "phrases"} you already wrote${
        plan.source === "model" || plan.source === "model+phrases"
          ? ", matched to the pages they are about"
          : ""
      }: ${plan.added.map((link) => `“${link.text}” → ${link.label}`).join(", ")}.`,
    );
  } else if (analyzeDocument(structured.doc).internalLinks.length >= LINK_FLOOR) {
    // Already well linked; nothing to say.
  } else {
    skipped.push({
      label: "Links to your own pages",
      why:
        plan.note ??
        "Nothing in the body refers to another page on this site. Name a city, a community, a service or a topic another article covers and it becomes a link.",
    });
  }
  if (plan.note && plan.added.length > 0) applied.push(plan.note);

  const body = {
    doc: plan.doc,
    // Recomputed from the linked document. Links add marks, not words, so this
    // equals the structured text — computed again anyway so the value saved is
    // derived from the value saved.
    bodyText: documentText(plan.doc).replace(/\s+/g, " ").trim(),
    excerpt: structured.excerpt,
    links: plan.added,
  };

  values.bodyJson = body.doc;
  values.bodyText = body.bodyText;
  if (body.excerpt !== input.excerpt) values.excerpt = body.excerpt;

  /* ── 2. Questions, from headings the author already answered ──────────── */

  const existingFaq = (input.faq ?? []).filter((item) => item.q?.trim() && item.a?.trim());
  if (existingFaq.length < 3) {
    const asked = new Set(existingFaq.map((item) => item.q.trim().toLowerCase()));
    const found = faqEngine
      .suggestFaqFromDocument(body.doc)
      .filter((item) => !asked.has(item.q.trim().toLowerCase()))
      .slice(0, 3 - existingFaq.length);

    if (found.length > 0) {
      values.faq = [...existingFaq, ...found.map(({ q, a }) => ({ q, a }))];
      applied.push(
        `Added ${found.length} ${found.length === 1 ? "question" : "questions"} from headings you wrote as questions, each paired with your own answer.`,
      );
    } else {
      skipped.push({
        label: "Questions answered on the page",
        why: "No heading in the body is phrased as a question. Write one that ends in a question mark and answer it underneath — the words have to be yours, because the markup promises the page shows them.",
      });
    }
  }

  /* ── 3. Tags, derived from what the links matched ─────────────────────── */

  const tags = autofix.suggestTags(input.tags ?? [], body.links);
  if (tags.length > (input.tags ?? []).length) {
    values.tags = tags;
    applied.push("Filed it under the subjects the article actually covers.");
  }

  /* ── 4. The two metadata fields ───────────────────────────────────────── */

  const facts = {
    title: input.title,
    excerpt: values.excerpt ?? input.excerpt,
    bodyText: body.bodyText,
    kind: input.kind,
    cityName: input.cityName,
    publishedAt: input.publishedAt,
  };

  if (!input.metaTitle?.trim()) {
    values.metaTitle = generate.articleTitleFrom(facts);
    applied.push("Wrote the meta title from your headline.");
  }

  /*
    Her description is replaced only when it cannot stand.

    Out of band, ending mid-sentence, or repeating itself — the three things the
    audit reports. A description that is merely not what the generator would have
    written is hers, and stays.
  */
  const current = input.metaDesc?.trim() ?? "";
  const unusable =
    current === "" || !generate.inBand(current) || reviewModule.descriptionProblem(current) !== null;

  let usedModel = false;
  if (unusable) {
    const fallback = generate.articleDescriptionFrom(facts, body.doc);
    const source = [
      input.title,
      input.cityName ? `about ${input.cityName}, Florida` : "",
      body.bodyText.slice(0, 600),
    ]
      .filter(Boolean)
      .join(". ");

    const polished = await ollama.polishDescription({ fallback, source, kind: "article" });
    values.metaDesc = polished.text;
    usedModel = polished.usedModel;
    applied.push(
      current === ""
        ? "Wrote the meta description from your opening."
        : "Replaced the meta description, which was not a finished sentence.",
    );
  }

  /* ── 5. Score what the form is about to hold ──────────────────────────── */

  const audit = scoring.auditArticle({
    ...facts,
    slug: input.slug,
    metaTitle: values.metaTitle ?? input.metaTitle ?? null,
    metaDesc: values.metaDesc ?? input.metaDesc ?? null,
    coverKey: input.coverKey,
    coverAlt: input.coverAlt,
    tags: values.tags ?? input.tags ?? [],
    faqCount: (values.faq ?? existingFaq).length,
    bodyJson: body.doc,
  });

  /*
    Whatever is still failing, said plainly.

    A button that reports success while three checks are red is worse than no
    button. Everything the pass could not reach is listed with its reason, and
    every one of those reasons is something only the author can supply: more
    words, a photograph, a source for a figure she quoted.
  */
  for (const check of audit.checks) {
    if (check.status === "pass") continue;
    if (skipped.some((item) => item.label === check.label)) continue;
    skipped.push({ label: check.label, why: check.detail });
  }

  return { ok: true, values, applied, skipped, score: audit.score, usedModel };
}

