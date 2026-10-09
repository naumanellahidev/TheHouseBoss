/**
 * The "stretched link" pattern for clickable cards.
 *
 * ── The problem it fixes ──────────────────────────────────────────────────
 *
 * Every card on the site was one big <a> wrapping the image, the title, the
 * excerpt, the date and the reading time. Clickable everywhere, which is right —
 * but the link's TEXT was all of it run together: "VA home buyersEntitlement,
 * zero down, and the Minimum Property Requirements that quietly e…", 169
 * characters. An SEO audit reported those as over-long anchor texts, and it is
 * worse than a style complaint:
 *
 *   - anchor text is how a search engine learns what the destination is about,
 *     and a paragraph is a diluted signal where a title is a precise one;
 *   - a screen reader announces the whole thing as the link's name, every time
 *     somebody tabs through a grid of twelve cards.
 *
 * ── The pattern ───────────────────────────────────────────────────────────
 *
 * The card is a positioned container. Only the TITLE is a link, and that link's
 * `::after` is stretched over the whole card, so a click or tap anywhere on the
 * card still lands on it. The anchor text is now just the title, and nothing
 * about how the card looks or behaves changes.
 *
 * The focus ring moves to the card with `:has(a:focus-visible)`, so a keyboard
 * user sees the whole card outlined, not a thin ring around a heading inside it.
 *
 * Use both: `cardShell` on the card element, `stretchedLink` on the title link.
 * A card must contain no OTHER interactive element — the stretched layer sits on
 * top of everything in it, so a second link or button inside would be
 * unclickable.
 */

/** On the card: makes it the positioning context and carries the focus ring. */
export const cardShell =
  "relative has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring";

/** On the title link: covers the card with its ::after, hides its own ring. */
export const stretchedLink =
  "after:absolute after:inset-0 after:z-10 after:content-[''] focus-visible:outline-none";
