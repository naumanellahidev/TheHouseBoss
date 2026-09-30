/**
 * What an article's body actually contains.
 *
 * ── Why read the document instead of the text ─────────────────────────────
 *
 * `articles.body_text` is the flattened copy kept for full-text search. It is
 * the right column for Postgres and the wrong one for judging a page: it has no
 * heading levels, so it cannot tell an H2 from a sentence in bold; no links, so
 * it cannot say whether the article points anywhere; and no images, so it cannot
 * say whether they have alternative text.
 *
 * Every on-page check that matters is structural, so this walks the Tiptap
 * document — the same JSON the renderer walks — and reports what is there.
 *
 * ── Why it never throws ───────────────────────────────────────────────────
 *
 * It is called from a form that the author is typing into, from the publish
 * path, and from `generateMetadata`. A malformed or half-saved document must
 * degrade to "I found nothing", never to a failed publish or a 500 on a public
 * page. Every branch is defensive for that reason and not out of caution about
 * the shape.
 */

export type DocHeading = { level: number; text: string };

export type DocumentStats = {
  /** Words in the prose, headings included — what a reader actually reads. */
  words: number;
  headings: DocHeading[];
  /** Links to our own pages, deduplicated by href. */
  internalLinks: string[];
  /** Links that leave the site. Citations, so their presence is a good sign. */
  externalLinks: string[];
  images: number;
  imagesWithAlt: number;
  /** Headings phrased as a question — the FAQ suggester's raw material. */
  questionHeadings: string[];
  hasAnswerFirst: boolean;
  /** The text of the answer-first block, empty when there is none. */
  answerFirst: string;
  /** Paragraphs over 90 words. Readability, and they scan badly on a phone. */
  longParagraphs: number;
};

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: unknown[];
};

const EMPTY: DocumentStats = {
  words: 0,
  headings: [],
  internalLinks: [],
  externalLinks: [],
  images: 0,
  imagesWithAlt: 0,
  questionHeadings: [],
  hasAnswerFirst: false,
  answerFirst: "",
  longParagraphs: 0,
};

/** Every text node under `node`, concatenated. */
export function flattenNode(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as Node;
  if (typeof n.text === "string") return n.text;
  return (n.content ?? []).map(flattenNode).join("");
}

export function countWords(value: string): number {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean === "" ? 0 : clean.split(" ").length;
}

export function analyzeDocument(doc: unknown): DocumentStats {
  if (!doc || typeof doc !== "object") return EMPTY;

  const stats: DocumentStats = {
    ...EMPTY,
    headings: [],
    internalLinks: [],
    externalLinks: [],
    questionHeadings: [],
  };

  const internal = new Set<string>();
  const external = new Set<string>();

  const walk = (node: unknown): void => {
    if (!node || typeof node !== "object") return;
    const n = node as Node;

    switch (n.type) {
      case "heading": {
        const text = flattenNode(n).replace(/\s+/g, " ").trim();
        const level = Number(n.attrs?.level) || 2;
        if (text) {
          stats.headings.push({ level, text });
          if (text.endsWith("?")) stats.questionHeadings.push(text);
        }
        break;
      }

      case "answerFirst": {
        stats.hasAnswerFirst = true;
        if (!stats.answerFirst) {
          stats.answerFirst = flattenNode(n).replace(/\s+/g, " ").trim();
        }
        break;
      }

      case "paragraph": {
        /*
          Ninety words, measured rather than chosen. At 360px a 90-word
          paragraph is roughly fifteen lines with no break in it, which is where
          scanning stops working — and a paragraph nobody reads is also a
          paragraph an assistant cannot quote a clean sentence out of.
        */
        if (countWords(flattenNode(n)) > 90) stats.longParagraphs += 1;
        break;
      }

      case "image": {
        stats.images += 1;
        const alt = n.attrs?.alt;
        if (typeof alt === "string" && alt.trim() !== "") stats.imagesWithAlt += 1;
        break;
      }
    }

    /*
      Links are marks on text, not nodes, so they are collected here rather than
      in the switch above. A protocol-relative or absolute URL pointing at our
      own host still counts as internal — the author pasting a full URL to one of
      her own pages has made an internal link, whatever it looks like.
    */
    for (const mark of n.marks ?? []) {
      if (mark?.type !== "link") continue;
      const href = mark.attrs?.href;
      if (typeof href !== "string" || href.trim() === "") continue;
      const value = href.trim();
      if (value.startsWith("/")) internal.add(value);
      else if (/^https?:\/\/(www\.)?thehousebossfl\.com/i.test(value)) internal.add(value);
      else if (/^https?:/i.test(value)) external.add(value);
    }

    for (const child of n.content ?? []) walk(child);
  };

  try {
    walk(doc);
  } catch {
    return EMPTY;
  }

  stats.words = countWords(flattenNode(doc));
  stats.internalLinks = [...internal];
  stats.externalLinks = [...external];
  return stats;
}

/**
 * Whether the heading levels descend without skipping a rank.
 *
 * H2 → H4 is not a cosmetic problem. A screen-reader user navigating by heading
 * hears a level that does not exist, and a machine building an outline of the
 * page — which is how an assistant decides what this page is about — gets a
 * broken tree. The article title is the H1, so a body H1 is also a fault.
 */
export function headingOutlineIssue(headings: DocHeading[]): string | null {
  if (headings.some((h) => h.level === 1)) {
    return "The article title is already the page's H1, so a second H1 in the body competes with it. Make it a Heading 2.";
  }

  let previous = 1;
  for (const heading of headings) {
    if (heading.level > previous + 1) {
      return `“${heading.text}” is a Heading ${heading.level} under a Heading ${previous}, which skips a level.`;
    }
    previous = heading.level;
  }
  return null;
}
