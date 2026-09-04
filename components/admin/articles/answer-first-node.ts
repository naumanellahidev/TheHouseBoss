import { Node, mergeAttributes } from "@tiptap/core";

/**
 * The answer-first block, as an editor node.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * `<AnswerFirst>` has been in `components/site/prose.tsx` since Phase 5, used
 * by the hand-written guide pages and unreachable from the article editor. So
 * every article the client writes through the CMS was missing the single
 * structure that AI assistants extract first: a direct one- or two-sentence
 * answer at the top, before the supporting detail.
 *
 * `docs/14 § 1 rule 1` asks for it in every section. A rule the tool cannot
 * express is a rule nobody follows.
 *
 * ── Why a node and not a style ────────────────────────────────────────────
 *
 * It could have been bold text. It is a node because the meaning has to survive
 * into the stored JSON: `lib/seo/auto/generate.ts` prefers this block for the
 * meta description, `llms.txt` uses it as the article's abstract, and both need
 * to find it structurally rather than by guessing which paragraph looked
 * important.
 *
 * ── Content model ─────────────────────────────────────────────────────────
 *
 * `inline*`, not `block+`. An answer that runs to several paragraphs is not an
 * answer-first block, it is the article — and letting it nest blocks would
 * allow a heading inside the summary, which breaks the document outline.
 */
export const AnswerFirstNode = Node.create({
  name: "answerFirst",
  group: "block",
  content: "inline*",
  defining: true,

  parseHTML() {
    return [{ tag: 'p[data-answer-first="true"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "p",
      mergeAttributes(HTMLAttributes, {
        "data-answer-first": "true",
        class: "answer-first",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleAnswerFirst:
        () =>
        ({ commands }) =>
          // Toggles against `paragraph`, so pressing it twice returns the text
          // to normal prose rather than leaving an empty block behind.
          commands.toggleNode(this.name, "paragraph"),
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    answerFirst: {
      toggleAnswerFirst: () => ReturnType;
    };
  }
}
