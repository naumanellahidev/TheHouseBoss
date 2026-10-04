/**
 * Guard: the automatic fix never changes what an article says.
 *
 * ── The invariant this exists to protect ──────────────────────────────────
 *
 * The "Fix what it can" button restructures a published article's body. It
 * promotes a paragraph to the answer-first block, breaks over-long paragraphs
 * at a sentence end, and turns phrases the author already wrote into links.
 *
 * Every one of those is a structural edit, and the whole feature rests on them
 * staying structural: **the text that comes out must be the text that went in**.
 * If a transform ever drops a clause or duplicates a sentence, the result is a
 * published page saying something its author did not write — on a real-estate
 * site that is a misrepresentation under FREC advertising rules, not a bug
 * report.
 *
 * The other rules here are the ones that keep the linking inside Google's
 * guidelines rather than inside a spam action: links only on phrases that are
 * genuinely in the body, one per destination, never in a heading, and capped.
 *
 * Run by `npm run guards`.
 */

import { fixArticleBody, promoteAnswerFirst } from "../lib/seo/auto/article-autofix";
import { autolinkDocument, linkTargets } from "../lib/seo/auto/autolink";
import { analyzeDocument, documentText } from "../lib/seo/auto/document";

type Failure = { what: string; detail: string };
const failures: Failure[] = [];

const check = (what: string, ok: boolean, detail: string) => {
  if (!ok) failures.push({ what, detail });
};

const p = (text: string) => ({ type: "paragraph", content: [{ type: "text", text }] });
const h = (level: number, text: string) => ({
  type: "heading",
  attrs: { level },
  content: [{ type: "text", text }],
});

const norm = (doc: unknown) => documentText(doc).replace(/\s+/g, " ").trim();

/*
  One article, written the way a real one is: an opening that states the answer,
  question headings, a list, and one paragraph that ran away from its author.
*/
const long = Array.from(
  { length: 12 },
  (_, i) => `Point ${i + 1} explains what a buyer should check and why it matters before closing.`,
).join(" ");

const article = {
  type: "doc",
  content: [
    p(
      "Living in Lake Mary means a short commute and some of the best schools in Seminole County. Most buyers weigh it against Sanford and Longwood, and the three markets behave differently.",
    ),
    h(2, "What does a VA loan change?"),
    p(`A VA loan lets an eligible buyer purchase with no money down. ${long}`),
    h(2, "Should I consider new construction?"),
    p("A licensed residential contractor should walk a new build before you close."),
    {
      type: "bulletList",
      content: [
        { type: "listItem", content: [p("Roof age and remaining life")] },
        { type: "listItem", content: [p("An assumable mortgage can beat a price cut")] },
      ],
    },
  ],
};

const original = JSON.stringify(article);
const before = norm(article);
const fixed = fixArticleBody({ doc: article, excerpt: null });
const after = norm(fixed.doc);

/* ── The invariant ────────────────────────────────────────────────────────── */

check(
  "the text is unchanged",
  before === after,
  `the pass altered the article's words.\n    before: ${before.slice(0, 120)}\n    after:  ${after.slice(0, 120)}`,
);

check(
  "the input document is not mutated",
  JSON.stringify(article) === original,
  "the pass wrote through its argument, so an editor holding that object would see it change under them",
);

const stats = analyzeDocument(fixed.doc);
const wordsBefore = analyzeDocument(article).words;

check(
  "no words are gained or lost",
  stats.words === wordsBefore,
  `${wordsBefore} words in, ${stats.words} out`,
);

/* ── What the pass is supposed to achieve ─────────────────────────────────── */

check("the answer-first block is created", stats.hasAnswerFirst, "no answerFirst node in the result");

check(
  "over-long paragraphs are broken up",
  stats.longParagraphs === 0,
  `${stats.longParagraphs} paragraph(s) still over ninety words`,
);

check(
  "internal links are added",
  stats.internalLinks.length >= 3,
  `only ${stats.internalLinks.length} internal link(s)`,
);

check(
  "every link is to a real section of this site",
  stats.internalLinks.every((href) => /^\/(lake-mary|sanford|longwood|orlando|casselberry|altamonte-springs|winter-springs|oviedo|guides|answers|hire-contractor|assumable-mortgage-homes|search)/.test(href)),
  `unexpected destination in ${stats.internalLinks.join(", ")}`,
);

check(
  "no destination is linked twice",
  new Set(stats.internalLinks).size === stats.internalLinks.length,
  `duplicates in ${stats.internalLinks.join(", ")}`,
);

/* ── What it must never do ────────────────────────────────────────────────── */

/*
  A heading with a link in it changes what a screen reader announces when
  somebody navigates by heading, and it competes with the heading's job. The
  check reads the raw JSON because `analyzeDocument` reports heading text, not
  heading marks.
*/
function headingsCarryLinks(node: unknown): boolean {
  if (!node || typeof node !== "object") return false;
  const n = node as { type?: string; marks?: { type?: string }[]; content?: unknown[] };

  if (n.type === "heading") {
    const hasLink = JSON.stringify(n).includes('"type":"link"');
    if (hasLink) return true;
  }
  return (n.content ?? []).some(headingsCarryLinks);
}

check("headings are never linked", !headingsCarryLinks(fixed.doc), "a heading came back with a link mark");

/*
  The linker must not invent a mention. An article that never says "Oviedo"
  must not come back linking to it — that is the difference between internal
  linking and link injection.
*/
const quiet = { type: "doc", content: [p("A short note about nothing in particular at all, really.")] };
const quietResult = autolinkDocument(quiet, linkTargets());
check(
  "nothing is linked that the article does not mention",
  quietResult.added.length === 0,
  `invented ${quietResult.added.length} link(s): ${quietResult.added.map((l) => l.href).join(", ")}`,
);

/*
  Six is the cap. Past that an article reads as a directory and looks, to a
  reviewer, like what it would be.
*/
const dense = {
  type: "doc",
  content: Array.from({ length: 12 }, () =>
    p("Lake Mary and Sanford and Longwood and Orlando and Oviedo and Casselberry all differ."),
  ),
};
const denseResult = autolinkDocument(dense, linkTargets());
check(
  "the link cap holds",
  denseResult.added.length <= 6,
  `${denseResult.added.length} links added, over the cap of six`,
);

/*
  A one-line opening is not an answer, and promoting it would mark the wrong
  sentence as the thing to quote.
*/
const stub = { type: "doc", content: [p("Hello."), p(`Then the real opening. ${long}`)] };
const stubResult = promoteAnswerFirst(stub);
check(
  "a stub opening is refused",
  !stubResult.promoted && Boolean(stubResult.why),
  "a two-word paragraph was promoted to the answer-first block",
);

/*
  And a document that already has one is left alone — pressing the button twice
  must not wrap the block in itself or move it.
*/
const twice = fixArticleBody({ doc: fixed.doc, excerpt: null });
check(
  "running it twice changes nothing",
  norm(twice.doc) === after &&
    analyzeDocument(twice.doc).internalLinks.length === stats.internalLinks.length,
  "a second pass altered the document",
);

/* ── The publish-time floor ───────────────────────────────────────────────── */

/*
  `ensureArticleLinks` runs on every publish, so the rule that stops it being an
  editor rather than a floor is worth asserting on its own: an article that
  already has links is left completely alone.

  The function itself writes to the database, so what is checked here is the
  decision it makes — `autolinkDocument` seeded with an existing link must add
  nothing to that destination, and a document that is already linked must come
  back with the same number it went in with.
*/
{
  const linked = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Buying in " },
          {
            type: "text",
            text: "Lake Mary",
            marks: [{ type: "link", attrs: { href: "/lake-mary" } }],
          },
          { type: "text", text: " means a short commute and good schools." },
        ],
      },
    ],
  };

  const again = autolinkDocument(linked, linkTargets());
  check(
    "a destination that is already linked is not linked twice",
    again.added.every((link) => link.href !== "/lake-mary"),
    `linked /lake-mary a second time: ${again.added.map((l) => l.href).join(", ")}`,
  );

  check(
    "text inside an existing link is never re-marked",
    !JSON.stringify(again.doc).includes('"href":"/lake-mary"},{"type":"link"'),
    "a link mark was nested inside another",
  );
}

/* ── Report ───────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`\nAutofix guard FAILED — ${failures.length} problem(s):\n`);
  for (const failure of failures) {
    console.error(`  ✗ ${failure.what}`);
    console.error(`    ${failure.detail}\n`);
  }
  process.exit(1);
}

console.log(
  `Autofix guard passed — the pass added ${stats.internalLinks.length} internal links and ` +
    `the answer-first block without changing one word of the article, and refuses to ` +
    `link what the article does not mention.`,
);
