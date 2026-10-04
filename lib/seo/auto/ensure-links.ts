import "server-only";

import { recordAudit } from "@/lib/auth/audit";
import { autolinkDocument, linkTargets } from "@/lib/seo/auto/autolink";
import { analyzeDocument, documentText } from "@/lib/seo/auto/document";
import { createServiceClient } from "@/lib/supabase/service";
import type { Article } from "@/types/domain";

/**
 * Give a published article internal links if it has none.
 *
 * ── Why this runs at publish and not only on a button ─────────────────────
 *
 * The linker already existed behind "Fix what it can" in the editor. That makes
 * it optional, and the article that most needs internal links is the one written
 * by somebody who did not think about internal links — so it was never pressed
 * on exactly the pages it was built for.
 *
 * An article with no outbound links is a page Google can reach and cannot place.
 * It sits in the index with nothing saying what it relates to, the city page it
 * should be supporting gets no signal from it, and a reader who finishes it has
 * nowhere to go. That is the whole argument for internal linking in Google's own
 * documentation, and it is a one-line fix the system can do itself.
 *
 * ── The three rules that keep this inside Google's guidelines ─────────────
 *
 * 1. **Only phrases the author already wrote.** Nothing is inserted. If the body
 *    does not say "Sanford", no link to Sanford appears — and the article goes
 *    on having no links, which is the honest outcome.
 * 2. **Only when there are none.** An article the author linked herself is never
 *    touched, at all. This is a floor, not an editor.
 * 3. **The text must come out identical.** Checked here at runtime, on the
 *    actual document, immediately before the write. `scripts/check-autofix.mts`
 *    asserts the same thing in the guard suite; this is the belt to its braces,
 *    because this one writes to a published row.
 *
 * Anchors are the author's own words in their own sentences, one per
 * destination, two per paragraph, six per article, never in a heading. That is
 * descriptive internal linking, which is what the guidelines ask for — not
 * keyword-stuffed anchors bolted onto the end of a paragraph, which is what they
 * warn about.
 *
 * ── Why the body_text column is not written ───────────────────────────────
 *
 * The `flatten_body_text` trigger maintains it from `body_json` (docs/02). And
 * since linking cannot change the text, the value it already holds is correct
 * either way.
 */
export async function ensureArticleLinks(article: Article): Promise<number> {
  const before = analyzeDocument(article.bodyJson);

  // Rule 2. Also covers the re-publish case: once links exist, this never runs
  // again on that article.
  if (before.internalLinks.length > 0) return 0;

  const result = autolinkDocument(article.bodyJson, linkTargets());
  if (result.added.length === 0) return 0;

  /*
    Rule 3, enforced before the row is touched.

    If this ever fails it means a transform lost or duplicated a word, and the
    right response is to publish the article exactly as written and leave a line
    in the log — never to write a body that says something its author did not.
  */
  const textBefore = documentText(article.bodyJson).replace(/\s+/g, " ").trim();
  const textAfter = documentText(result.doc).replace(/\s+/g, " ").trim();

  if (textBefore !== textAfter) {
    console.error(
      `[seo] refusing to link ${article.slug}: the pass altered the article's words`,
    );
    return 0;
  }

  const db = createServiceClient();
  const { error } = await db
    .from("articles")
    .update({ body_json: result.doc as never })
    .eq("id", article.id);

  if (error) {
    console.error(`[seo] could not write links for ${article.slug}: ${error.message}`);
    return 0;
  }

  /*
    Recorded, because it is an edit to a published body.

    Correct and invisible is still invisible. The log names every anchor and
    where it points, so the change can be read back by somebody who did not make
    it — and undone, since the anchors are the author's own words and removing a
    mark leaves the sentence intact.
  */
  await recordAudit({
    action: "article_links_added",
    entityType: "articles",
    entityId: article.id,
    metadata: {
      slug: article.slug,
      links: result.added.map((link) => ({ text: link.text, href: link.href })),
    },
  });

  return result.added.length;
}
