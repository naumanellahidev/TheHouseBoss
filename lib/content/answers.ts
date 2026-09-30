import source from "@/answers-source.json";

import { ANSWER_BODIES } from "@/lib/content/answers/index";

/**
 * The Answer Hub — docs/18-answer-hub.md.
 *
 * `answers-source.json` is the client-supplied brief for 62 questions: the
 * question, its slug, which city and service pages it belongs beside, three
 * siblings, and a ~120-word draft written in a forum register.
 *
 * The JSON is the SPINE, not the copy. Published prose lives in
 * `lib/content/answers/<category>.ts` and is joined to the record here, so a
 * question can never ship with a draft body by accident: `getAnswer` returns
 * null when no published body exists, and `scripts/check-answers.mjs` fails the
 * build if a record has no body or the body is under 400 words.
 */

/* ── Shapes ──────────────────────────────────────────────────────────────── */

export type AnswerRecord = {
  id: number;
  question: string;
  slug: string;
  category: string;
  /** The service name as it appears on the Google Business Profile. */
  gmbService: string;
  cities: string[];
  relatedServices: string[];
  draftBody: string;
  relatedAnswers: string[];
};

export type AnswerCategory = { slug: string; title: string };

/** A paragraph, a bullet list, or an ordered list of steps. */
export type AnswerBlock =
  | { kind: "p"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "steps"; items: string[] };

export type AnswerSection = { heading: string; blocks: AnswerBlock[] };

export type AnswerBody = {
  /**
   * One or two sentences that answer the question outright, rendered inside
   * the first 100 words. This is what a featured snippet lifts and what an AI
   * search engine quotes, so it must stand alone without the page around it.
   */
  shortAnswer: string;
  sections: AnswerSection[];
  /** ISO date the copy was last edited, for the sitemap's lastModified. */
  updated: string;
};

export type Answer = AnswerRecord & { body: AnswerBody };

/* ── The data ────────────────────────────────────────────────────────────── */

export const ANSWER_CATEGORIES: AnswerCategory[] = source.categories;

const RECORDS: AnswerRecord[] = source.answers;

/** Every question that has published copy, in the JSON's order. */
export const ANSWERS: Answer[] = RECORDS.flatMap((record) => {
  const body = ANSWER_BODIES[record.slug];
  return body ? [{ ...record, body }] : [];
});

const BY_SLUG = new Map(ANSWERS.map((answer) => [answer.slug, answer]));

export function getAnswer(slug: string): Answer | null {
  return BY_SLUG.get(slug) ?? null;
}

export function getCategory(slug: string): AnswerCategory | null {
  return ANSWER_CATEGORIES.find((category) => category.slug === slug) ?? null;
}

export function answersInCategory(categorySlug: string): Answer[] {
  return ANSWERS.filter((answer) => answer.category === categorySlug);
}

/** Questions tagged with a city, for the block on that city's page. */
export function answersForCity(citySlug: string, limit?: number): Answer[] {
  const hits = ANSWERS.filter((answer) => answer.cities.includes(citySlug));
  return typeof limit === "number" ? hits.slice(0, limit) : hits;
}

/** Questions tagged with a service, for the block on that service page. */
export function answersForService(service: string, limit?: number): Answer[] {
  const hits = ANSWERS.filter((answer) => answer.relatedServices.includes(service));
  return typeof limit === "number" ? hits.slice(0, limit) : hits;
}

/** The siblings named in the JSON, minus any that are not published yet. */
export function siblingAnswers(answer: Answer): Answer[] {
  return answer.relatedAnswers.flatMap((slug) => {
    const sibling = BY_SLUG.get(slug);
    return sibling && sibling.slug !== answer.slug ? [sibling] : [];
  });
}

export const answerHref = (answer: Pick<Answer, "category" | "slug">) =>
  `/answers/${answer.category}/${answer.slug}`;

export const categoryHref = (category: Pick<AnswerCategory, "slug">) =>
  `/answers/${category.slug}`;

/* ── Text derived from the body ──────────────────────────────────────────── */

/** Every sentence of an answer as plain text — for JSON-LD and word counts. */
export function answerPlainText(body: AnswerBody): string {
  const parts: string[] = [body.shortAnswer];
  for (const section of body.sections) {
    parts.push(section.heading);
    for (const block of section.blocks) {
      if (block.kind === "p") parts.push(block.text);
      else parts.push(block.items.join(" "));
    }
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function answerWordCount(body: AnswerBody): number {
  return answerPlainText(body).split(/\s+/).filter(Boolean).length;
}

/**
 * The meta description: the short answer, trimmed to a whole sentence under
 * the 158-character ceiling `buildMetadata` enforces.
 */
export function answerDescription(body: AnswerBody): string {
  const text = body.shortAnswer.replace(/\s+/g, " ").trim();
  if (text.length <= 155) return text;
  const cut = text.slice(0, 155);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "));
  return stop > 80 ? cut.slice(0, stop + 1) : `${cut.replace(/[,;:\s]+\S*$/, "")}…`;
}

/* ── Where a linked city or service actually lives on this site ──────────── */

/**
 * The JSON names services as `buy` and `hire-contractor`. This site has no
 * `/buy` route — the buyer material is the guides hub — so the mapping is
 * explicit rather than a string concatenation that would 404.
 */
export const SERVICE_LINKS: Record<string, { href: string; label: string }> = {
  buy: { href: "/guides", label: "buyer guides" },
  "hire-contractor": { href: "/hire-contractor", label: "contractor services" },
};

export function serviceLink(service: string) {
  return SERVICE_LINKS[service] ?? null;
}
