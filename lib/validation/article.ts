import { z } from "zod";

/**
 * ONE schema for the article form and the server action.
 *
 * `bodyJson` is a Tiptap document. It is validated as a shape, not a schema:
 * enumerating every node type here would mean a second definition of the
 * editor's capabilities that drifts the moment an extension is added. What
 * matters at the boundary is that it is a `doc` with an array of content — the
 * renderer in `components/site/rich-text.tsx` is what decides which nodes are
 * actually rendered, and it ignores anything it does not know.
 */

export const ARTICLE_KINDS = ["blog", "market_update", "guide"] as const;
export const ARTICLE_STATUSES = ["draft", "published", "archived"] as const;

export type ArticleKind = (typeof ARTICLE_KINDS)[number];

const tiptapDoc = z
  .object({
    type: z.literal("doc"),
    content: z.array(z.record(z.string(), z.unknown())).default([]),
  })
  .passthrough();

export const articleSchema = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words separated by hyphens"),

    title: z.string().trim().min(3).max(200),
    excerpt: z.string().trim().max(400).nullable().optional(),

    bodyJson: tiptapDoc,
    /** Plain text, for the length checks below. The DB recomputes its own. */
    bodyText: z.string().default(""),

    kind: z.enum(ARTICLE_KINDS),
    cityId: z.string().uuid().nullable().optional(),
    communityId: z.string().uuid().nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),

    coverKey: z.string().max(200).nullable().optional(),
    coverAlt: z.string().trim().max(300).nullable().optional(),

    metaTitle: z.string().trim().max(70).nullable().optional(),
    metaDesc: z.string().trim().max(180).nullable().optional(),

    status: z.enum(ARTICLE_STATUSES),
  })
  // An empty article cannot be published. The database has no equivalent check
  // — `body_json` only has to be valid JSON — so this is the only layer that
  // enforces it, and the pre-publish checklist mirrors it in the UI.
  .refine((v) => v.status !== "published" || v.bodyText.trim().length >= 200, {
    message: "Write at least a couple of paragraphs before publishing.",
    path: ["bodyJson"],
  })
  // A cover image without alt text fails the accessibility requirement the same
  // way a listing photo does (docs/09 § 3).
  .refine((v) => !v.coverKey || (v.coverAlt?.trim().length ?? 0) > 0, {
    message: "Describe the cover image — alt text is required.",
    path: ["coverAlt"],
  })
  /*
    There is no `metaDesc` refinement any more.

    It used to block publishing until one was typed. That was a bad trade twice
    over: it stopped the client publishing, and the value it forced was usually
    too short to survive `buildMetadata()`, so it was discarded at render and
    the gate protected nothing. `lib/seo/auto/` now generates one at publish and
    the field is an override — so blocking on it would block on something the
    system already guarantees.
  */;

export type ArticleInput = z.infer<typeof articleSchema>;

export type ArticleChecklistItem = {
  id: string;
  label: string;
  ok: boolean;
};

/**
 * The pre-publish checklist, mirroring the refinements above.
 *
 * Same contract as the listing editor's: Publish stays disabled until every
 * item passes, and each unmet item says what to do rather than leaving a dead
 * button (docs/06 § 11).
 */
export function articleChecklist(v: Partial<ArticleInput>): ArticleChecklistItem[] {
  return [
    {
      id: "title",
      label: "Title written",
      ok: (v.title?.trim().length ?? 0) >= 3,
    },
    {
      id: "body",
      label: "At least a couple of paragraphs of body text",
      ok: (v.bodyText?.trim().length ?? 0) >= 200,
    },
    /*
      `excerpt` and `meta` were both items here and are both gone.

      Each is now generated from the body at publish (lib/seo/auto/generate.ts)
      and each field remains editable as an override. A checklist item for
      something the system supplies is not a safeguard, it is a chore — and the
      body-length item above is what actually guarantees there is enough text
      for either to be generated from.
    */
    {
      id: "cover",
      label: "Cover image has alt text, or there is no cover image",
      ok: !v.coverKey || (v.coverAlt?.trim().length ?? 0) > 0,
    },
  ];
}

export const canPublishArticle = (v: Partial<ArticleInput>) =>
  articleChecklist(v).every((item) => item.ok);

/** 225 wpm, the same figure the database trigger uses. */
export function readingMinutes(text: string): number {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 225));
}
