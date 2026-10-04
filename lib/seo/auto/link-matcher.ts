import "server-only";

import { autolinkDocument, linkTargets, type AddedLink, type LinkTarget } from "@/lib/seo/auto/autolink";
import { analyzeDocument, documentText } from "@/lib/seo/auto/document";
import { buildLinkCatalogue } from "@/lib/seo/auto/link-catalogue";
import {
  buildMatcherPrompt,
  MATCHER_SYSTEM,
  parseProposals,
  validateProposals,
} from "@/lib/seo/auto/link-plan";
import { askModel } from "@/lib/seo/auto/ollama";

/**
 * Internal links for one article: the model first, the phrase list second.
 *
 * ── The order, and why ────────────────────────────────────────────────────
 *
 * The model reads the article and the catalogue of real pages and proposes
 * which of the author's phrases refer to which page. It understands that "using
 * your VA benefit" is about the VA guide and that a paragraph about Heathrow
 * should point at the Heathrow community page — neither of which an exact phrase
 * list can do. And it can link one article to another, which nothing could
 * before.
 *
 * Whatever budget it leaves, the exact-phrase linker fills. It is predictable
 * and it never needs the network, so it is also the whole pass whenever the
 * model is unconfigured, slow, rate-limited or answers with something that does
 * not survive validation. Publishing never waits on the model and never fails
 * because of it.
 *
 * ── The threshold ─────────────────────────────────────────────────────────
 *
 * Runs when the article has FEWER THAN THREE internal links, and adds at most
 * enough to bring it to six. Three is the audit's bar for "links to your own
 * pages"; six is where an article starts reading like a directory. Links the
 * author placed herself are never touched and count toward both numbers.
 */

/** Below this many internal links, an article is topped up. */
export const LINK_FLOOR = 3;
/** Never more than this many internal links in total. */
export const LINK_CEILING = 6;

export type LinkPlan = {
  doc: unknown;
  added: AddedLink[];
  /** Which pass produced the links, for the report and the audit log. */
  source: "model" | "phrases" | "model+phrases" | "none";
  /** Why the model's contribution was what it was. Shown to the operator. */
  note: string | null;
};

/** The model's accepted links, as targets the existing linker can apply. */
function asTargets(links: { anchor: string; href: string; label: string }[]): LinkTarget[] {
  return links.map((link) => ({ href: link.href, label: link.label, phrases: [link.anchor] }));
}

export async function planArticleLinks(opts: {
  doc: unknown;
  title: string;
  /** The article's own URL, so it is never proposed as a destination. */
  selfHref: string | null;
  /** The article's slug — the reliable way to keep it out of its own catalogue. */
  selfSlug?: string | null;
}): Promise<LinkPlan> {
  const stats = analyzeDocument(opts.doc);
  const existing = stats.internalLinks.length;

  if (existing >= LINK_FLOOR) {
    return { doc: opts.doc, added: [], source: "none", note: null };
  }

  const budget = LINK_CEILING - existing;
  let doc = opts.doc;
  const added: AddedLink[] = [];
  let usedModel = false;
  let note: string | null = null;

  /* ── 1. The model ─────────────────────────────────────────────────────── */

  try {
    const catalogue = await buildLinkCatalogue({
      excludeHref: opts.selfHref,
      excludeSlug: opts.selfSlug,
    });
    const bodyText = documentText(doc);

    const answer = await askModel({
      system: MATCHER_SYSTEM,
      prompt: buildMatcherPrompt({
        catalogue,
        articleTitle: opts.title,
        articleText: bodyText,
        max: budget,
      }),
      // Low: this is a matching task, and every proposal is validated anyway —
      // there is nothing a higher temperature would add except invention.
      temperature: 0.1,
      maxTokens: 900,
      // Longer than a description, because the prompt is. Still bounded: a
      // publish is waiting, and the phrase linker is a fine answer on its own.
      timeoutMs: 25_000,
    });

    if ("error" in answer) {
      note =
        answer.error === "unconfigured"
          ? null
          : `The AI matcher was unavailable (${answer.error}); links came from the phrase list.`;
    } else {
      const proposals = parseProposals(answer.text);

      if (!proposals) {
        note = "The AI matcher's answer could not be read; links came from the phrase list.";
      } else {
        const { accepted, rejected } = validateProposals({
          proposals,
          bodyText,
          catalogue,
          selfHref: opts.selfHref,
          existingHrefs: stats.internalLinks,
          max: budget,
        });

        if (rejected.length > 0 && process.env.NODE_ENV !== "production") {
          console.info(
            `[links] ${rejected.length} proposal(s) rejected:`,
            rejected.map((r) => `"${r.anchor}" → ${r.href}: ${r.why}`),
          );
        }

        if (accepted.length > 0) {
          /*
            Applied through the same machinery as the phrase list, which is what
            enforces the rules a proposal cannot see from the outside: never in a
            heading, two per paragraph, never inside an existing link. A
            validated proposal that lands only in a heading is simply not placed.
          */
          const applied = autolinkDocument(doc, asTargets(accepted), budget);
          doc = applied.doc;
          added.push(...applied.added);
          usedModel = applied.added.length > 0;
        }
      }
    }
  } catch (error) {
    console.error("[links] AI matcher failed:", error);
    note = "The AI matcher failed; links came from the phrase list.";
  }

  /* ── 2. The phrase list, for whatever budget is left ──────────────────── */

  let usedPhrases = false;
  const remaining = budget - added.length;

  if (remaining > 0) {
    const fallback = autolinkDocument(doc, linkTargets(), remaining);
    doc = fallback.doc;
    added.push(...fallback.added);
    usedPhrases = fallback.added.length > 0;
  }

  const source: LinkPlan["source"] =
    usedModel && usedPhrases
      ? "model+phrases"
      : usedModel
        ? "model"
        : usedPhrases
          ? "phrases"
          : "none";

  return { doc, added, source, note };
}
