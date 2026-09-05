import "server-only";

/**
 * FAQ suggestions from an article's own headings (brief §21).
 *
 * ── Why the questions are found, not written ──────────────────────────────
 *
 * §21 asks for useful questions and adds: "Only include questions that
 * genuinely match the article." A model asked to invent FAQs for a piece about
 * Lake Mary will produce plausible ones the article does not answer — and then
 * the FAQ block on the page answers them anyway, in words nobody checked.
 *
 * So this does not invent. It finds the headings the author already wrote as
 * questions, and pairs each with the text that follows it. If the author wrote
 * "What should buyers consider with new construction?" as an H2 and then
 * answered it, that is a real FAQ. If they wrote no questions, there are no
 * suggestions, and that is the correct output.
 *
 * ── The rule that makes this safe to publish ──────────────────────────────
 *
 * §21 again: "Generate FAQ schema only when the rendered page actually contains
 * those FAQs." Because every question here IS a heading on the page and every
 * answer IS the prose under it, the markup describes the page by construction.
 * The suggestions still go to the admin for approval before they reach
 * `faq_json` — the schema is emitted from that column, not from this function.
 *
 * Google also restricted FAQ rich results in 2023 to a narrow set of sites, so
 * the realistic value here is the on-page block and what an AI assistant
 * extracts from it, not a rich result. That is worth saying plainly rather than
 * letting the feature imply a snippet it will probably not get.
 */

export type FaqSuggestion = {
  q: string;
  a: string;
  /** Which heading it came from, so the admin can find it. */
  basis: string;
};

/** A heading that is genuinely a question, not a statement ending in a colon. */
function isQuestion(text: string): boolean {
  const clean = text.trim();
  if (!clean.endsWith("?")) return false;
  if (clean.length < 12 || clean.length > 160) return false;
  return true;
}

type Node = { type?: string; text?: string; attrs?: { level?: number }; content?: Node[] };

/** All the text inside a node, flattened. */
function textOf(node: Node): string {
  if (typeof node.text === "string") return node.text;
  return (node.content ?? []).map(textOf).join("");
}

/**
 * Walk a Tiptap document, pairing question headings with the prose beneath.
 *
 * The answer is the paragraphs between this heading and the next heading of the
 * same or a higher level — which is exactly what a reader would consider the
 * answer, and what an extractor takes.
 */
export function suggestFaqFromDocument(doc: unknown): FaqSuggestion[] {
  const root = doc as Node | null;
  const blocks = root?.content;
  if (!Array.isArray(blocks)) return [];

  const out: FaqSuggestion[] = [];

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i];
    if (block.type !== "heading") continue;

    const question = textOf(block).trim();
    if (!isQuestion(question)) continue;

    const level = block.attrs?.level ?? 2;
    const answer: string[] = [];

    for (let j = i + 1; j < blocks.length; j += 1) {
      const next = blocks[j];

      // Stop at the next heading of the same or higher rank.
      if (next.type === "heading" && (next.attrs?.level ?? 2) <= level) break;

      /*
        Paragraphs and the answer-first block only. A table or an image inside
        the section is part of the answer for a reader and is not something
        that can be flattened into a schema string without lying about it.
      */
      if (next.type === "paragraph" || next.type === "answerFirst") {
        const text = textOf(next).trim();
        if (text) answer.push(text);
      }

      // Two paragraphs is a complete answer; more is an article section.
      if (answer.length >= 2) break;
    }

    const joined = answer.join(" ").replace(/\s+/g, " ").trim();

    /*
      A question with no prose under it is a section heading the author has not
      written yet. Suggesting it with an empty answer would put an unanswered
      question in the FAQ block, which is worse than not having the question.
    */
    if (joined.length < 40) continue;

    out.push({
      q: question,
      a: joined.length > 600 ? `${joined.slice(0, 597).trimEnd()}…` : joined,
      basis: `From the heading "${question}" and the text beneath it.`,
    });
  }

  return out;
}

/**
 * The same, for a plain-text body.
 *
 * `articles.body_text` is maintained by a trigger and is what the engine
 * usually has to hand. It has no heading structure, so this is a weaker match:
 * it finds question-shaped sentences and takes the sentence after each. Used
 * only when the Tiptap document is unavailable.
 */
export function suggestFaqFromText(bodyText: string | null): FaqSuggestion[] {
  if (!bodyText) return [];

  const sentences = bodyText
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const out: FaqSuggestion[] = [];

  for (let i = 0; i < sentences.length - 1; i += 1) {
    if (!isQuestion(sentences[i])) continue;

    const answer = sentences
      .slice(i + 1, i + 3)
      .filter((s) => !isQuestion(s))
      .join(" ");

    if (answer.length < 40) continue;

    out.push({
      q: sentences[i],
      a: answer.length > 600 ? `${answer.slice(0, 597).trimEnd()}…` : answer,
      basis: "From a question in the body text and the sentences following it.",
    });
  }

  return out;
}
