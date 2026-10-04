/**
 * Internal links proposed by a model, and the rules they have to pass.
 *
 * ── Why this module has no `server-only` ──────────────────────────────────
 *
 * Everything here is pure: building the prompt, reading the model's JSON, and
 * deciding which proposals survive. The network call lives in
 * `link-matcher.ts`. Keeping the decision logic separate is what lets
 * `scripts/check-autofix.mts` assert every rejection rule against fixtures,
 * which matters more than usual: these rules are the only thing standing between
 * a model's guess and a published article.
 *
 * ── The rules, and why each exists ────────────────────────────────────────
 *
 * A proposal is `{ anchor, href }`. It is kept only if:
 *
 * 1. **The anchor is already in the article, word for word.** The model chooses
 *    which of the author's phrases to link; it never supplies the words. This is
 *    the line between internal linking and link injection, and the one Google's
 *    guidelines care about.
 * 2. **The href is a real page from the catalogue.** A model will happily invent
 *    `/guides/first-time-buyers` because it sounds plausible. Every href is
 *    checked against the list of pages that actually exist, so a link can never
 *    404.
 * 3. **It is not the article itself**, and not a page the article already links.
 * 4. **The anchor is descriptive.** "Click here", "read more", "this article" —
 *    the anchors Google's guidance names as unhelpful — are refused outright.
 * 5. **No repeats.** One link per destination and no two links sharing an anchor.
 *    Repeating a keyword as anchor text across a page is the over-optimisation
 *    pattern; the per-destination rule makes it impossible.
 * 6. **A sane length.** One to six words. A single word is fine for a proper noun
 *    ("Sanford"); seven words is a clause, not an anchor.
 */

export type CatalogueKind = "city" | "community" | "service" | "guide" | "answer" | "article";

export type CatalogueEntry = {
  href: string;
  /** The page's own title, as a reader would see it. */
  title: string;
  /** One line on what the page is about — what the model matches against. */
  topic: string;
  kind: CatalogueKind;
};

export type AcceptedLink = { anchor: string; href: string; label: string };
export type RejectedLink = { anchor: string; href: string; why: string };

/**
 * Anchors that say nothing about where they lead.
 *
 * Compared after lower-casing and trimming punctuation, and whole-anchor only:
 * "read more about VA loans" is not rejected by "read more", because the anchor
 * as a whole is descriptive. The list is the generic phrasing Google's link
 * guidance uses as its examples of what not to do, plus the obvious variants.
 */
const GENERIC = new Set([
  "click here",
  "here",
  "read more",
  "learn more",
  "find out more",
  "more info",
  "more information",
  "this",
  "this article",
  "this page",
  "this post",
  "this guide",
  "link",
  "website",
  "our website",
  "this website",
  "see more",
  "details",
]);

/** Lower-cased, whitespace collapsed, edge punctuation removed. */
function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^[\s"'“”‘’.,;:!?()-]+|[\s"'“”‘’.,;:!?()-]+$/g, "")
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when `phrase` appears in `text` as whole words, case-insensitively. */
function appearsVerbatim(text: string, phrase: string): boolean {
  const pattern = new RegExp(
    `(^|[^\\p{L}\\p{N}])${escapeRegExp(phrase)}(?![\\p{L}\\p{N}])`,
    "iu",
  );
  return pattern.test(text);
}

/* ── The prompt ───────────────────────────────────────────────────────────── */

export const MATCHER_SYSTEM = [
  "You add internal links to an article on a Florida real-estate website.",
  "You receive a CATALOGUE of pages on the same site and the ARTICLE text.",
  "Choose phrases that ALREADY APPEAR WORD FOR WORD in the article and that genuinely refer to the subject of one catalogue page.",
  "Rules:",
  "- Copy each anchor EXACTLY as it is written in the article. Never rephrase, never add words.",
  "- An anchor is 1 to 6 words: a descriptive noun phrase such as a place, a loan type or a topic.",
  "- Use only hrefs that appear in the catalogue. Never invent a URL.",
  "- At most one link per catalogue page. Never use the same anchor twice.",
  "- Never use generic anchors such as 'click here', 'read more', 'this article' or 'here'.",
  "- Only link where a reader would genuinely want that page at that point. Relevance beats quantity.",
  "- If nothing fits, return an empty array.",
  'Reply with JSON only, no prose and no markdown: [{"anchor": "...", "href": "/..."}]',
].join("\n");

/**
 * The user turn: the catalogue, then the article.
 *
 * The article is capped. A model reading 40,000 characters to choose six links
 * is slow and costs more than it saves, and the first few thousand characters
 * are where an article names its subject. Links proposed for text past the cap
 * simply never appear — they fail the verbatim check against the full text only
 * if the model invents them, which is the case the check exists for.
 */
export function buildMatcherPrompt(opts: {
  catalogue: CatalogueEntry[];
  articleTitle: string;
  articleText: string;
  max: number;
}): string {
  const catalogue = opts.catalogue
    .map((entry) => `- ${entry.href} — ${entry.title}: ${entry.topic}`)
    .join("\n");

  const text = opts.articleText.replace(/\s+/g, " ").trim().slice(0, 7000);

  return [
    `Return at most ${opts.max} links.`,
    "",
    "CATALOGUE:",
    catalogue,
    "",
    `ARTICLE TITLE: ${opts.articleTitle}`,
    "",
    "ARTICLE:",
    text,
  ].join("\n");
}

/* ── Reading the answer ───────────────────────────────────────────────────── */

/**
 * Pull the JSON array out of whatever the model returned.
 *
 * Models wrap JSON in code fences, preface it with "Here are the links:", or
 * return an object with the array inside it. All of those are tolerated; what is
 * NOT tolerated is anything that does not parse to an array of objects — that
 * returns null and the caller falls back to the exact-phrase linker.
 */
export function parseProposals(raw: string): unknown[] | null {
  if (!raw) return null;

  const stripped = raw.replace(/```(?:json)?/gi, "").trim();

  const attempt = (candidate: string): unknown => {
    try {
      return JSON.parse(candidate);
    } catch {
      return undefined;
    }
  };

  let parsed = attempt(stripped);

  if (parsed === undefined) {
    const start = stripped.indexOf("[");
    const end = stripped.lastIndexOf("]");
    if (start >= 0 && end > start) parsed = attempt(stripped.slice(start, end + 1));
  }

  if (parsed && !Array.isArray(parsed) && typeof parsed === "object") {
    // `{ "links": [...] }` — take the first array value.
    const firstArray = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    if (firstArray) parsed = firstArray;
  }

  return Array.isArray(parsed) ? parsed : null;
}

/* ── The rules ────────────────────────────────────────────────────────────── */

export function validateProposals(opts: {
  proposals: unknown[];
  /** The article as plain text, block-aware (`documentText`). */
  bodyText: string;
  catalogue: CatalogueEntry[];
  /** The article's own URL, never a valid destination. */
  selfHref: string | null;
  /** Destinations the article already links to. */
  existingHrefs: string[];
  max: number;
}): { accepted: AcceptedLink[]; rejected: RejectedLink[] } {
  const byHref = new Map(opts.catalogue.map((entry) => [entry.href, entry]));
  const taken = new Set(opts.existingHrefs);
  const anchorsUsed = new Set<string>();

  const accepted: AcceptedLink[] = [];
  const rejected: RejectedLink[] = [];

  for (const item of opts.proposals) {
    const anchor =
      item && typeof item === "object" && typeof (item as { anchor?: unknown }).anchor === "string"
        ? (item as { anchor: string }).anchor.replace(/\s+/g, " ").trim()
        : "";
    const href =
      item && typeof item === "object" && typeof (item as { href?: unknown }).href === "string"
        ? (item as { href: string }).href.trim()
        : "";

    const reject = (why: string) => rejected.push({ anchor, href, why });

    if (!anchor || !href) {
      reject("not an {anchor, href} pair");
      continue;
    }

    // Rule 2: a real page. Compared exactly — the catalogue is the authority.
    const entry = byHref.get(href);
    if (!entry) {
      reject("destination is not a page on this site");
      continue;
    }

    // Rule 3.
    if (opts.selfHref && href === opts.selfHref) {
      reject("an article cannot link to itself");
      continue;
    }
    if (taken.has(href)) {
      reject("that page is already linked");
      continue;
    }

    // Rule 6.
    const words = anchor.split(" ").length;
    if (words < 1 || words > 6 || anchor.length < 3 || anchor.length > 60) {
      reject("anchor is not 1-6 words");
      continue;
    }

    // Rule 4.
    if (GENERIC.has(norm(anchor))) {
      reject("anchor is generic and says nothing about the destination");
      continue;
    }

    // Rule 5.
    if (anchorsUsed.has(norm(anchor))) {
      reject("anchor already used for another link");
      continue;
    }

    // Rule 1, last because it is the most expensive.
    if (!appearsVerbatim(opts.bodyText, anchor)) {
      reject("anchor is not in the article word for word");
      continue;
    }

    if (accepted.length >= opts.max) {
      reject("over the link cap");
      continue;
    }

    taken.add(href);
    anchorsUsed.add(norm(anchor));
    accepted.push({ anchor, href, label: entry.title });
  }

  return { accepted, rejected };
}
