import { ANSWERS, answerHref } from "@/lib/content/answers";
import { allCities } from "@/lib/site-config";

/**
 * Internal links, added to an article's own words.
 *
 * ── The rule this file is built around ────────────────────────────────────
 *
 * **It never writes text. It only links text the author already wrote.**
 *
 * That is what separates this from the thing nobody should build: a generator
 * that bolts "read our VA guide here" onto the end of a paragraph. Every link
 * below is a phrase that is already in the body, turned into an anchor. If the
 * article does not mention Sanford, no link to Sanford appears — and the audit
 * goes on reporting that the article links nowhere, which is the honest answer.
 *
 * ── Why the first mention only ────────────────────────────────────────────
 *
 * Linking every occurrence of "Lake Mary" in a 900-word article produces a page
 * that reads like a directory and looks, to a search engine, exactly like the
 * over-optimisation it is. One link per destination, on its first mention, is
 * the convention every editorial style guide lands on for the same reason.
 *
 * ── Why headings are skipped ──────────────────────────────────────────────
 *
 * A heading is a landmark. A link inside one changes what a screen reader
 * announces when somebody navigates by heading, and it competes with the
 * heading's job of saying what the section is. The answer-first block is skipped
 * for a related reason: it is the passage an assistant lifts, and it should lift
 * cleanly as prose.
 */

export type LinkTarget = {
  href: string;
  /** Phrases that may be turned into this link, longest first. */
  phrases: string[];
  /** For the report the admin reads afterwards. */
  label: string;
};

/* ── The catalogue ────────────────────────────────────────────────────────── */

/**
 * Service pages, with the phrases a writer actually uses for them.
 *
 * Deliberately conservative. "contractor" alone is not here: an article may use
 * the word about a third party — "your contractor should pull the permit" — and
 * linking that to her own services page would turn somebody else's contractor
 * into an advertisement for her.
 */
const SERVICE_TARGETS: LinkTarget[] = [
  {
    href: "/guides/va-home-buyer",
    label: "VA home-buyer guide",
    phrases: ["VA home loan", "VA loan", "VA entitlement", "VA appraisal", "VA buyer"],
  },
  {
    href: "/assumable-mortgage-homes",
    label: "Assumable mortgages",
    phrases: ["assumable mortgage", "assumable loan", "assume the seller's rate", "loan assumption"],
  },
  {
    href: "/hire-contractor",
    label: "Hire a contractor",
    phrases: [
      "licensed residential contractor",
      "certified residential contractor",
      "hire a contractor",
      "general contractor",
    ],
  },
  {
    href: "/search/new-construction",
    label: "New construction",
    phrases: ["new construction", "new-construction home", "builder inventory"],
  },
  {
    href: "/search",
    label: "Home search",
    phrases: ["homes for sale in Central Florida", "Central Florida homes for sale"],
  },
];

/**
 * The core phrase of an answer-hub question, when it has a usable one.
 *
 * "Do I need a four-point inspection in Florida?" becomes "four-point
 * inspection". The question words and the trailing state are stripped because
 * nobody writes a question verbatim inside a paragraph — what they write is the
 * subject of it, and the subject is what can be matched honestly.
 *
 * Returns null when nothing distinctive survives. A two-word remainder like "a
 * home" would match half the article and link it to the wrong page, which is
 * worse than not linking at all.
 */
function answerPhrase(question: string): string | null {
  const core = question
    .replace(/\?+\s*$/, "")
    .replace(
      /^(what|what's|whats|how|how's|why|when|where|who|which|do|does|did|can|could|should|is|are|will|would|must)\b[^a-z0-9]*/i,
      "",
    )
    .replace(/^(i|you|we|they|a|an|the|my|your)\b\s*/i, "")
    .replace(/\s+in\s+(central\s+)?florida$/i, "")
    .replace(/\s+in\s+[a-z\s]+county$/i, "")
    .trim();

  // Three words and twelve characters: enough to be about one thing.
  if (core.split(/\s+/).length < 3 || core.length < 12) return null;
  return core;
}

/**
 * Everything an article may legitimately link to.
 *
 * Cities first, then services, then the answer hub — the order the matcher works
 * in, and the order of how specific a destination is to the sentence around it.
 */
export function linkTargets(): LinkTarget[] {
  const cities: LinkTarget[] = allCities.flatMap((city) => [
    {
      href: `/${city.slug}/homes-for-sale`,
      label: `${city.name} homes for sale`,
      phrases: [`homes for sale in ${city.name}`, `${city.name} homes for sale`],
    },
    {
      href: `/${city.slug}`,
      label: city.name,
      phrases: [city.name],
    },
  ]);

  const answers: LinkTarget[] = ANSWERS.flatMap((answer) => {
    const phrase = answerPhrase(answer.question);
    if (!phrase) return [];
    return [
      {
        href: answerHref(answer),
        label: answer.question,
        phrases: [phrase],
      },
    ];
  });

  return [...cities, ...SERVICE_TARGETS, ...answers];
}

/* ── The walk ─────────────────────────────────────────────────────────────── */

type Node = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type?: string; attrs?: Record<string, unknown> }[];
  content?: unknown[];
};

/** Blocks whose text may be linked. Everything else is passed through whole. */
const LINKABLE = new Set([
  "paragraph",
  "listItem",
  "bulletList",
  "orderedList",
  "blockquote",
  "doc",
  /*
    The answer-first block is included.

    It was excluded at first, to keep the passage an assistant lifts as clean
    prose. But a link does not change the text — an extractor reads the
    characters, not the marks — and the opening paragraph is where an article
    names its city, which makes it the most valuable link on the page.
  */
  "answerFirst",
]);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Every href already linked anywhere in the document. */
function existingHrefs(node: unknown, found: Set<string>): void {
  if (!node || typeof node !== "object") return;
  const n = node as Node;
  for (const mark of n.marks ?? []) {
    if (mark?.type === "link" && typeof mark.attrs?.href === "string") {
      found.add(mark.attrs.href);
    }
  }
  for (const child of n.content ?? []) existingHrefs(child, found);
}

export type AddedLink = { href: string; text: string; label: string };

/**
 * Add internal links to a Tiptap document.
 *
 * Returns a NEW document; the input is not touched. The caller decides whether
 * to keep it, which matters because this runs from an editor the author may be
 * typing into.
 *
 * `max` is six. Beyond that an article stops reading like writing and starts
 * reading like a sitemap, and the audit's bar is three.
 */
export function autolinkDocument(
  doc: unknown,
  targets: LinkTarget[],
  max = 6,
): { doc: unknown; added: AddedLink[] } {
  if (!doc || typeof doc !== "object") return { doc, added: [] };

  const linked = new Set<string>();
  existingHrefs(doc, linked);

  const added: AddedLink[] = [];

  /*
    Longest phrase first, across every target.

    "homes for sale in Lake Mary" has to be tried before "Lake Mary", or the
    shorter one consumes the start of the longer and the reader gets a link to
    the city page in the middle of a sentence about what is for sale in it.
  */
  const candidates = targets
    .filter((target) => !linked.has(target.href))
    .flatMap((target) => target.phrases.map((phrase) => ({ target, phrase })))
    .sort((a, b) => b.phrase.length - a.phrase.length);

  /**
   * Link every distinct destination that matches inside one text node.
   *
   * The first version took the first match and stopped, which meant a paragraph
   * reading "New construction in Lake Mary... a licensed residential
   * contractor..." got exactly one link — and because the candidates are sorted
   * longest-first, the one it got was the contractor, while the city, the single
   * most valuable link on a local page, was never reached.
   *
   * So matches are collected first, non-overlapping, then the node is cut once.
   * Still one link per destination across the whole document, and still capped.
   */
  function linkText(node: Node, budget: { used: number }): unknown[] | null {
    const text = node.text;
    if (typeof text !== "string" || text.trim() === "") return null;

    // Never nest a link inside a link, and never inside code.
    if ((node.marks ?? []).some((m) => m?.type === "link" || m?.type === "code")) return null;

    const chosen: { start: number; end: number; href: string; label: string }[] = [];

    /*
      Two per paragraph, spread rather than clustered.

      Without this a line naming four cities takes four of the six links and the
      service and answer pages never get one — and four anchors in one sentence
      reads as a link farm to a person and to a reviewer, which is the opposite
      of what this is for. Two is enough to connect a paragraph to what it is
      about and few enough that the prose still reads as prose.

      The budget belongs to the BLOCK, not to the text node. Linking splits a
      text node into three, so a per-node cap would hand each fragment a fresh
      allowance — and a second run of the pass would quietly add more links to a
      paragraph that was already at its limit.
    */
    const PER_BLOCK = 2;

    for (const { target, phrase } of candidates) {
      if (budget.used + chosen.length >= PER_BLOCK) break;
      if (added.length + chosen.length >= max) break;
      if (linked.has(target.href)) continue;
      if (chosen.some((range) => range.href === target.href)) continue;

      // Whole words only: "Sanford" must not match inside "Sanfordville", and
      // "VA loan" must not match "nova loan".
      const pattern = new RegExp(
        `(^|[^\p{L}\p{N}])(${escapeRegExp(phrase)})(?![\p{L}\p{N}])`,
        "giu",
      );

      let match: RegExpExecArray | null;
      while ((match = pattern.exec(text)) !== null) {
        const from = match.index + match[1].length;
        const to = from + match[2].length;
        // A longer phrase already claimed this span, so skip to the next
        // occurrence rather than abandoning the phrase.
        if (chosen.some((range) => from < range.end && to > range.start)) continue;
        chosen.push({ start: from, end: to, href: target.href, label: target.label });
        break;
      }
    }

    if (chosen.length === 0) return null;
    chosen.sort((a, b) => a.start - b.start);

    const out: unknown[] = [];
    let cursor = 0;
    for (const range of chosen) {
      if (range.start > cursor) {
        out.push({ ...node, text: text.slice(cursor, range.start) });
      }
      const matched = text.slice(range.start, range.end);
      out.push({
        ...node,
        text: matched,
        marks: [...(node.marks ?? []), { type: "link", attrs: { href: range.href } }],
      });
      linked.add(range.href);
      added.push({ href: range.href, text: matched, label: range.label });
      cursor = range.end;
    }
    if (cursor < text.length) out.push({ ...node, text: text.slice(cursor) });

    budget.used += chosen.length;
    return out;
  }

  /*
    Text nodes become SEVERAL nodes when a link splits them, so the walk returns
    arrays and every parent flattens what comes back. That is the whole reason
    this is a hand-written transform rather than a map.
  */
  function walkTop(node: unknown): unknown {
    if (!node || typeof node !== "object") return node;
    const n = node as Node;
    if (!n.content) return node;

    const children: unknown[] = [];
    for (const child of n.content) {
      const result = walkBlock(child);
      if (Array.isArray(result)) children.push(...result);
      else children.push(result);
    }
    return { ...n, content: children };
  }

  /** Blocks that hold inline content, and therefore own a link budget. */
  const INLINE_HOST = new Set(["paragraph", "answerFirst", "blockquote"]);

  /**
   * Links already inside a block, which spend its budget before the pass starts.
   *
   * Without this the second run of the pass sees a paragraph that is already at
   * its limit, counts zero, and adds two more — so pressing the button twice
   * produced a different article from pressing it once.
   */
  function countLinks(node: unknown): number {
    if (!node || typeof node !== "object") return 0;
    const n = node as Node;
    const own = (n.marks ?? []).some((m) => m?.type === "link") ? 1 : 0;
    return own + (n.content ?? []).reduce<number>((total, child) => total + countLinks(child), 0);
  }

  function walkBlock(node: unknown, budget?: { used: number }): unknown {
    if (!node || typeof node !== "object") return node;
    const n = node as Node;

    if (typeof n.text === "string") {
      if (!budget) return node;
      const replaced = linkText(n, budget);
      return replaced ?? node;
    }

    if (!LINKABLE.has(n.type ?? "")) return node;
    if (!n.content) return node;

    // A paragraph starts a fresh allowance; a list or the document passes
    // whatever it was given down to the paragraphs inside it.
    const own = INLINE_HOST.has(n.type ?? "") ? { used: countLinks(n) } : budget;

    const children: unknown[] = [];
    for (const child of n.content) {
      const result = walkBlock(child, own);
      if (Array.isArray(result)) children.push(...result);
      else children.push(result);
    }
    return { ...n, content: children };
  }

  return { doc: walkTop(doc), added };
}
