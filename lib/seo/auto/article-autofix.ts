import { analyzeDocument, countWords, documentText, flattenNode } from "@/lib/seo/auto/document";
import { autolinkDocument, linkTargets, type AddedLink } from "@/lib/seo/auto/autolink";
import { autoExcerpt } from "@/lib/seo/auto/generate";

/**
 * Fixing what a record's own content can fix.
 *
 * ── The line this file does not cross ─────────────────────────────────────
 *
 * It rearranges and marks up what the author wrote. It never writes a sentence,
 * never invents a fact, and never claims something the article does not say.
 *
 * That is not caution for its own sake. On a real-estate page an invented
 * statement is a misrepresentation under FREC advertising rules, and a
 * "fix everything" button that quietly adds a paragraph nobody wrote is the most
 * dangerous button in the product. So the fixes are all of one kind: text that is
 * already on the page, given the structure a search engine and an assistant need
 * in order to use it.
 *
 * ── What that leaves undone, on purpose ───────────────────────────────────
 *
 * A short article stays short. A page with no cover image does not get one. An
 * uncited figure stays uncited — a link to the VA for a number only the author
 * knows the source of would be a fabricated citation, which is worse than none.
 * Each of those comes back in `skipped` with the reason, so the panel can say
 * what is left and why rather than leaving a check failing with no explanation.
 */

type Node = { type?: string; text?: string; content?: unknown[] };

export type FixReport = {
  /** Short sentences, in the order the work happened. */
  applied: string[];
  skipped: { label: string; why: string }[];
};

/* ── The answer-first block ───────────────────────────────────────────────── */

/**
 * Promote the article's opening paragraph to the answer-first block.
 *
 * ── Why promote rather than write one ─────────────────────────────────────
 *
 * The block's job is to state the answer in the first two or three sentences.
 * In a decently written article that is already the opening paragraph — the
 * author has said what the piece is about before elaborating. Converting it
 * costs no words, duplicates nothing, and makes the structure explicit so
 * `autoArticleDescription`, `/llms.txt` and the renderer can all find it.
 *
 * Composing a new opening and inserting it above the author's would leave the
 * page saying the same thing twice, and the second version would be the one a
 * machine quotes.
 *
 * ── When it refuses ───────────────────────────────────────────────────────
 *
 * A one-line opening is not an answer. Under twenty words it is a scene-setter,
 * and promoting it would mark the wrong sentence as the thing to quote — which
 * is worse than leaving the check failing, because the check at least says so.
 */
export function promoteAnswerFirst(
  doc: unknown,
): { doc: unknown; promoted: boolean; why?: string } {
  if (!doc || typeof doc !== "object") return { doc, promoted: false, why: "There is no body yet." };

  const root = doc as Node;
  const blocks = root.content ?? [];

  if (analyzeDocument(doc).hasAnswerFirst) return { doc, promoted: false };

  const index = blocks.findIndex((block) => (block as Node)?.type === "paragraph");
  if (index < 0) {
    return { doc, promoted: false, why: "The body has no paragraph to promote." };
  }

  const paragraph = blocks[index] as Node;
  const words = countWords(flattenNode(paragraph));

  if (words < 20) {
    return {
      doc,
      promoted: false,
      why: `The opening paragraph is ${words} words. Write two or three sentences that answer the question outright, then press this again.`,
    };
  }

  /*
    Anything above the first paragraph stays where it is.

    A pull quote, an image or a heading before the opening is a deliberate choice
    and moving the block would reorder the page. The answer-first node is a block
    like any other; it does not have to be first to be found.
  */
  const content = [...blocks];
  content[index] = { ...paragraph, type: "answerFirst" };

  return { doc: { ...root, content }, promoted: true };
}

/* ── Long paragraphs ─────────────────────────────────────────────────────── */

/**
 * Break a paragraph that has grown past ninety words.
 *
 * ── Why this is allowed and writing a sentence is not ─────────────────────
 *
 * Nothing is added, removed or reworded. The same sentences, in the same order,
 * with a break between two of them — the one structural edit that cannot change
 * what the article says. Everything else this file does to the body has the same
 * property, and that is the line: structure is ours to fix, prose is not.
 *
 * ── Why ninety ────────────────────────────────────────────────────────────
 *
 * At 360px a ninety-word paragraph is about fifteen unbroken lines, which is
 * where scanning stops working. It is also where an assistant stops being able
 * to lift a clean passage, because every candidate quote is buried in the
 * middle of a wall.
 *
 * The split goes at the sentence boundary nearest the middle, so neither half
 * is a stub. A paragraph with one enormous sentence in it is left alone —
 * there is nowhere to cut that is not inside the sentence.
 */
function splitLongParagraphs(doc: unknown): { doc: unknown; split: number } {
  if (!doc || typeof doc !== "object") return { doc, split: 0 };
  const root = doc as Node;
  if (!Array.isArray(root.content)) return { doc, split: 0 };

  let split = 0;
  const out: unknown[] = [];

  for (const block of root.content) {
    const node = block as Node;

    // Paragraphs only. The answer-first block is a deliberate two or three
    // sentences and splitting it would leave half the answer outside it.
    if (node?.type !== "paragraph" || !Array.isArray(node.content)) {
      out.push(block);
      continue;
    }

    const text = flattenNode(node);
    if (countWords(text) <= 90) {
      out.push(block);
      continue;
    }

    /*
      Split on the inline children, not on the text.

      A paragraph carries bold, links and the marks the autolinker just added;
      rebuilding it from a string would throw all of that away. So the cut is
      made at a sentence boundary INSIDE one text node, and every other child
      moves to whichever side it was on.
    */
    const children = node.content as Node[];
    const total = countWords(text);
    let seen = 0;
    let cut = -1;
    let cutOffset = -1;

    for (let i = 0; i < children.length && cut < 0; i += 1) {
      const child = children[i];
      const value = typeof child?.text === "string" ? child.text : "";
      if (!value) {
        seen += countWords(flattenNode(child));
        continue;
      }

      // Every sentence end in this node, as an offset.
      const ends = [...value.matchAll(/[.!?]["')\]]?\s+/g)].map(
        (m) => (m.index ?? 0) + m[0].length,
      );
      for (const end of ends) {
        const wordsBefore = seen + countWords(value.slice(0, end));
        // Nearest the middle, and never leaving a stub on either side.
        if (wordsBefore >= total * 0.35 && wordsBefore <= total * 0.65) {
          cut = i;
          cutOffset = end;
          break;
        }
      }
      seen += countWords(value);
    }

    if (cut < 0) {
      out.push(block);
      continue;
    }

    const head: Node[] = children.slice(0, cut);
    const tail: Node[] = children.slice(cut + 1);
    const atCut = children[cut];
    const value = atCut.text ?? "";

    const headText = value.slice(0, cutOffset).trimEnd();
    const tailText = value.slice(cutOffset).trimStart();
    if (headText) head.push({ ...atCut, text: headText });
    if (tailText) tail.unshift({ ...atCut, text: tailText });

    if (head.length === 0 || tail.length === 0) {
      out.push(block);
      continue;
    }

    out.push({ ...node, content: head });
    out.push({ ...node, content: tail });
    split += 1;
  }

  return { doc: { ...root, content: out }, split };
}

/* ── The whole pass ───────────────────────────────────────────────────────── */

export type BodyFix = {
  doc: unknown;
  bodyText: string;
  excerpt: string | null;
  links: AddedLink[];
  report: FixReport;
};

/**
 * Everything that can be fixed from the body alone.
 *
 * Order matters. The answer-first block is promoted first so the linker does not
 * put a link inside the passage an assistant quotes; the text is flattened last
 * so `body_text` matches the document that will actually be saved.
 */
export function fixArticleBody(input: {
  doc: unknown;
  excerpt: string | null;
  /**
   * False to leave linking to the caller.
   *
   * The server action passes false and runs `planArticleLinks` afterwards, which
   * puts the AI matcher in front of the phrase list. This function stays pure
   * and network-free — the guard suite runs it — so the phrase list is what it
   * uses when it does the linking itself.
   */
  link?: boolean;
}): BodyFix {
  const applied: string[] = [];
  const skipped: { label: string; why: string }[] = [];

  const answer = promoteAnswerFirst(input.doc);
  if (answer.promoted) {
    applied.push("Marked your opening paragraph as the answer-first block.");
  } else if (answer.why) {
    skipped.push({ label: "Opens with the answer", why: answer.why });
  }

  /*
    Split before linking, not after.

    A link whose anchor straddled the cut would have to be rebuilt, and the
    simplest way not to deal with that is to do the structural edit first.
  */
  /*
    Repeatedly, because one cut is not always enough.

    A 240-word paragraph halves into two of 120, and both are still past the
    bar. Three passes is the ceiling: by then a paragraph that has not come
    under ninety words has no sentence boundaries to cut on, and running
    forever on it would be the loop that never ends.
  */
  let paragraphs = splitLongParagraphs(answer.doc);
  for (let pass = 1; pass < 3; pass += 1) {
    const again = splitLongParagraphs(paragraphs.doc);
    if (again.split === 0) break;
    paragraphs = { doc: again.doc, split: paragraphs.split + again.split };
  }

  if (paragraphs.split > 0) {
    applied.push(
      `Broke ${paragraphs.split} over-long ${paragraphs.split === 1 ? "paragraph" : "paragraphs"} at a sentence end — same words, same order.`,
    );
  }

  const linkResult =
    input.link === false
      ? { doc: paragraphs.doc, added: [] as AddedLink[] }
      : autolinkDocument(paragraphs.doc, linkTargets());

  if (input.link === false) {
    // The caller links and reports; nothing to say here.
  } else if (linkResult.added.length > 0) {
    applied.push(
      `Linked ${linkResult.added.length} ${linkResult.added.length === 1 ? "phrase" : "phrases"} you already wrote: ${linkResult.added
        .map((link) => `“${link.text}”`)
        .join(", ")}.`,
    );
  } else {
    skipped.push({
      label: "Links to your own pages",
      why: "Nothing in the body matched a page on this site. Name a city, a service or one of the answer-hub questions and it becomes a link.",
    });
  }

  const doc = linkResult.doc;
  /*
    Block-aware, so the last word of one paragraph does not run into the first
    word of the next. `flattenNode` joins with an empty string, which is right
    inside a paragraph and wrong across them — and this string becomes
    `body_text`, which Postgres full-text search reads and the word count uses.
  */
  const bodyText = documentText(doc).replace(/\s+/g, " ").trim();

  let excerpt = input.excerpt;
  if (!excerpt?.trim() && bodyText) {
    excerpt = autoExcerpt(bodyText);
    applied.push("Drafted the excerpt from your opening.");
  }

  return { doc, bodyText, excerpt, links: linkResult.added, report: { applied, skipped } };
}

/**
 * Tags worth adding, derived from what the links found.
 *
 * A tag is a filing decision, not a claim — "VA loans" on an article that
 * discusses VA loans is a statement about the article, which is why this is
 * allowed to derive one where it is not allowed to derive a sentence.
 *
 * Only ever ADDS, and only up to five in total. Clearing a tag the author chose
 * would be the generator overruling them about their own filing.
 */
export function suggestTags(current: string[], links: AddedLink[]): string[] {
  const have = new Set(current.map((tag) => tag.trim().toLowerCase()).filter(Boolean));
  const out = [...current];

  for (const link of links) {
    if (out.length >= 5) break;
    // The answer-hub labels are whole questions; a question is not a tag.
    if (link.label.endsWith("?")) continue;
    if (have.has(link.label.toLowerCase())) continue;
    have.add(link.label.toLowerCase());
    out.push(link.label);
  }

  return out;
}
