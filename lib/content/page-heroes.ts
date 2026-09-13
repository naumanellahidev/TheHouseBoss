/**
 * Editable heroes for the content pages that have no record of their own.
 *
 * `/market-updates` and `/reviews` are lists, not rows, so there is nowhere on
 * a city or an article to hang their headline or their photograph. They use the
 * same `page_sections` table as `/hire-contractor`: the copy here is what the
 * page says until somebody edits it, and a stored `hero` section overrides it
 * field by field (see `mergeSection`).
 *
 * ── Why the photograph is a key in JSON and not a column ──────────────────
 *
 * `page_sections.content` is already scanned for object keys by the orphan
 * sweep (`lib/images/orphans.ts` → `keysInJson`), so a photograph chosen here
 * can never be deleted out from under the page. A new `*_key` column would have
 * needed a migration AND an entry in `referencedKeys()` — and a column missing
 * from that function is exactly how the logo and portrait were lost on 11 Sep.
 *
 * `imageKey` is empty by default: each page then falls back to a photograph
 * that already exists (the flagship city hero, or the site hero), so the pages
 * ship with a picture rather than waiting for one to be chosen.
 *
 * There is no alt text field. The photograph is a background behind the
 * heading, rendered `aria-hidden` exactly like the home hero, so any alt would
 * be read to nobody.
 */

export type PageHeroContent = {
  overline: string;
  title: string;
  lead: string;
  /** A media key chosen in Admin → Pages. Empty means "use the page's fallback". */
  imageKey: string;
};

export const PAGE_HEROES = {
  "market-updates": {
    overline: "Market updates",
    title: "What Central Florida prices are actually doing",
    lead: "What the numbers did, and what they mean if you are buying or selling now. Every figure carries the date it was true.",
    imageKey: "",
  },
  reviews: {
    overline: "Reviews",
    title: "What clients say about working with me",
    lead: "Every review here is one I actually received, shown with where it came from and a link to the original where there is one.",
    imageKey: "",
  },
} satisfies Record<string, PageHeroContent>;

export type HeroPageSlug = keyof typeof PAGE_HEROES;
