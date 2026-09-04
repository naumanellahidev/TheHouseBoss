import { formatPrice } from "@/lib/utils";
import type { Article, City, Community, Listing } from "@/types/domain";

/**
 * Deterministic SEO generation.
 *
 * This is the FLOOR, not the fallback. Every published record gets a title and
 * a description from here whether or not a model is configured, whether or not
 * the network is up, and whether or not anyone typed anything. The Ollama layer
 * in `ollama.ts` improves the prose; it never provides the guarantee.
 *
 * ── The band ──────────────────────────────────────────────────────────────
 *
 * 140–158 characters, which is what `scripts/check-seo.mjs` warns on and what
 * the `seo_pages` CHECK constraint physically enforces. Everything here is
 * built to land inside it by construction rather than by trimming afterwards —
 * `pad()` exists because a description that is too SHORT is the common failure
 * and truncation cannot fix it.
 *
 * ── Facts only ────────────────────────────────────────────────────────────
 *
 * Every value interpolated below comes from the record. Nothing is inferred,
 * estimated or embellished. On a property listing an invented number is a
 * misrepresentation under FREC advertising rules, not a stylistic problem, and
 * that constraint is what makes the deterministic generator the safe default
 * rather than the cheap one.
 */

export const DESC_MIN = 140;
export const DESC_MAX = 158;
/** 60 minus the " | The House Boss" template suffix the root layout appends. */
export const TITLE_MAX = 43;

/** Trim to a word boundary, never mid-word, never leaving dangling punctuation. */
export function trimToWord(value: string, max: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(
    // `|` added: a trimmed title that ends on the separator reads as an error.
    /[\s,;:|—–-]+$/,
    "",
  );
}

/**
 * Remove a brand suffix the author typed into the field.
 *
 * `TITLE_MAX` is 43 because the root layout appends " | The House Boss" to
 * reach 60. But an admin writing a meta title naturally types the whole thing —
 * "Lake Mary, FL Real Estate | The House Boss" — and every seeded city row does
 * exactly that. Trimming that to 43 cut the brand in half and left titles ending
 * "| The House" and "FL Real Estate |", which is what the first backfill wrote.
 *
 * Stripping it first means the author's words survive and the layout adds the
 * brand back once, whole.
 */
export function stripBrandSuffix(title: string): string {
  return title
    .replace(/\s*[|·—–-]\s*(the\s+)?house\s+boss.*$/i, "")
    .replace(/\s*[|·—–-]\s*$/, "")
    .trim();
}

/**
 * Attribution lines, longest to shortest.
 *
 * These are the last resort, and the reason they are a LADDER rather than one
 * string is arithmetic. `pad()` can only append a clause that fits inside 158,
 * so a 132-character description and a 60-character clause leave the result at
 * 132 — under the floor, and rejected outright by the CHECK constraint on
 * `seo_pages`. Measured against the seeded cities, five of eight landed between
 * 116 and 138 for exactly that reason.
 *
 * With a ladder there is always a rung that fits: the gap between 140 and 158
 * is eighteen characters, and the steps below are closer together than that, so
 * one of them always lands inside the band.
 *
 * Every line is true and none adds a claim, which is what makes them safe to
 * append to any description.
 */
const BRAND_TAILS = [
  "From The House Boss — Lake Mary and Central Florida real estate.",
  "From The House Boss, Lake Mary and Central Florida.",
  "From The House Boss in Lake Mary, Florida.",
  "From The House Boss, Lake Mary FL.",
  "From The House Boss.",
  "The House Boss.",
];

/**
 * Bring a short description up into the band by appending real clauses.
 *
 * Clauses are added whole and only while they fit, so the result never ends
 * mid-sentence. When the caller's clauses run out and the text is still short,
 * the brand ladder above closes the gap.
 *
 * The result can still fall short in one case — a base string so long that no
 * rung fits, which means it is already within 15 characters of the ceiling and
 * reads fine. Returning that is correct; padding it would push it past 158.
 */
function pad(base: string, clauses: string[]): string {
  let out = base.trim();
  for (const clause of clauses) {
    if (out.length >= DESC_MIN) break;
    const candidate = `${out} ${clause}`.replace(/\s+/g, " ").trim();
    if (candidate.length <= DESC_MAX) out = candidate;
  }

  if (out.length < DESC_MIN) {
    for (const tail of BRAND_TAILS) {
      // Never repeat an attribution the caller's clauses already added.
      if (out.includes("The House Boss")) break;
      const candidate = `${out} ${tail}`.replace(/\s+/g, " ").trim();
      if (candidate.length <= DESC_MAX) {
        out = candidate;
        break;
      }
    }
  }

  return trimToWord(out, DESC_MAX);
}

/**
 * Trim a title, dropping a clause the trim left half-finished.
 *
 * `trimToWord` alone produced "Lake Mary, FL Real Estate | Homes" from
 * "…| Homes for Sale & Neighbourhood Guide". Grammatical, but the layout then
 * appends " | The House Boss" and the result reads "Real Estate | Homes | The
 * House Boss" — two separators and one orphaned word.
 *
 * So when the trim actually cut something off, any trailing segment after the
 * last separator goes with it. The first clause is the one that carries the
 * page's identity; the rest is elaboration and is what the trim was already
 * discarding, just untidily.
 */
export function trimTitle(value: string, max = TITLE_MAX): string {
  const clean = stripBrandSuffix(value);
  if (clean.length <= max) return clean;

  const trimmed = trimToWord(clean, max);
  const lastSeparator = trimmed.search(/\s*[|·—–]\s*[^|·—–]*$/);

  // Only if a real head survives — never trim a title down to nothing.
  if (lastSeparator > 12) return trimmed.slice(0, lastSeparator).trim();
  return trimmed;
}

/* ── Listings ─────────────────────────────────────────────────────────────── */

/**
 * The facts a listing description is built from.
 *
 * Deliberately a plain shape rather than `Listing`. The admin's "Write it for
 * me" button has form values in hand and no saved record — a listing being
 * edited for the first time has no row to read back — so the generator has to
 * accept what the form knows. The `Listing` wrappers below adapt.
 */
export type ListingFacts = {
  address: string;
  cityName: string;
  status: string;
  price: number | null;
  soldPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  pool: boolean;
  contractorsTake: string | null;
};

export function listingTitleFrom(f: ListingFacts): string {
  const price = f.status === "sold" ? f.soldPrice : f.price;
  const money = price ? ` — ${formatPrice(price, { compact: true })}` : "";
  return trimTitle(`${f.address}, ${f.cityName}${money}`);
}

export function autoListingTitle(listing: Listing): string {
  return listingTitleFrom(toFacts(listing));
}

const toFacts = (l: Listing): ListingFacts => ({
  address: l.address,
  cityName: l.city.name,
  status: l.status,
  price: l.price,
  soldPrice: l.soldPrice,
  beds: l.beds,
  baths: l.baths,
  sqft: l.sqft,
  yearBuilt: l.yearBuilt,
  pool: l.pool,
  contractorsTake: l.contractorsTake,
});

export function listingDescriptionFrom(f: ListingFacts): string {
  const price = f.status === "sold" ? f.soldPrice : f.price;

  const specs = [
    f.beds ? `${f.beds} bed` : null,
    f.baths ? `${f.baths} bath` : null,
    f.sqft ? `${f.sqft.toLocaleString()} sq ft` : null,
  ]
    .filter(Boolean)
    .join(", ");

  const opening =
    `${f.address}, ${f.cityName}, Florida` +
    (price ? ` — ${formatPrice(price)}.` : ".") +
    (specs ? ` ${specs}.` : "");

  /*
    Ordered by how much each one earns its space. The contractor's read is the
    differentiator on this site, so it goes first among the padding clauses.
  */
  return pad(
    opening,
    [
      f.contractorsTake
        ? "Includes a licensed residential contractor's read on the condition."
        : "Photographs, key facts and a contractor's read on the condition.",
      f.yearBuilt ? `Built ${f.yearBuilt}.` : "",
      f.pool ? "Pool." : "",
      `Represented by Krisi Kakarova, Realtor and Certified Residential Building Contractor.`,
    ].filter(Boolean),
  );
}

export function autoListingDescription(listing: Listing): string {
  return listingDescriptionFrom(toFacts(listing));
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

export type ArticleFacts = {
  title: string;
  excerpt: string | null;
  bodyText: string | null;
};

export function articleTitleFrom(f: ArticleFacts): string {
  return trimTitle(f.title);
}

export function autoArticleTitle(article: Article): string {
  return articleTitleFrom(article);
}

/**
 * Prefers the article's own opening over anything generated.
 *
 * An answer-first opening paragraph is exactly what an assistant extracts, so
 * when the body provides one it beats any summary we could compose. The
 * generated line is the safety net for a body that starts with a scene-setter.
 */
export function autoArticleDescription(article: Article): string {
  return articleDescriptionFrom(article, article.bodyJson);
}

/**
 * The text of the first `answerFirst` node in a Tiptap document.
 *
 * Walks the tree rather than assuming a depth: the node is a top-level block
 * today, and a document shape that changes should degrade to "not found"
 * instead of throwing inside `generateMetadata`.
 */
export function answerFirstText(doc: unknown): string {
  let found = "";

  const walk = (node: unknown): void => {
    if (found || !node || typeof node !== "object") return;
    const n = node as { type?: string; text?: string; content?: unknown[] };

    if (n.type === "answerFirst") {
      found = flatten(n).replace(/\s+/g, " ").trim();
      return;
    }
    for (const child of n.content ?? []) walk(child);
  };

  const flatten = (node: unknown): string => {
    if (!node || typeof node !== "object") return "";
    const n = node as { text?: string; content?: unknown[] };
    if (typeof n.text === "string") return n.text;
    return (n.content ?? []).map(flatten).join("");
  };

  try {
    walk(doc);
  } catch {
    return "";
  }
  return found;
}

export function articleDescriptionFrom(f: ArticleFacts, bodyJson?: unknown): string {
  const body = (f.bodyText ?? "").replace(/\s+/g, " ").trim();

  /*
    The `answerFirst` block wins over everything.

    That block is where the author states the direct answer, which makes it the
    best meta description the article contains and the reason the node exists in
    the editor at all. Reading it structurally rather than guessing at the first
    paragraph is what a marked-up document buys.
  */
  const answer = answerFirstText(bodyJson);
  if (answer && answer.length >= DESC_MIN) return trimToWord(answer, DESC_MAX);

  for (const candidate of [answer, f.excerpt?.trim(), firstSentences(body, DESC_MAX)]) {
    if (candidate && candidate.length >= DESC_MIN) {
      return trimToWord(candidate, DESC_MAX);
    }
  }

  const opening = answer || f.excerpt?.trim() || firstSentences(body, 110) || f.title;
  return pad(opening, [
    "From The House Boss — Lake Mary and Central Florida real estate.",
    "Written by Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
  ]);
}

/** Whole sentences up to `max`. Shared with the article form's excerpt button. */
export function firstSentences(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : trimToWord(cut, max);
}

export function autoExcerpt(bodyText: string | null): string {
  return firstSentences(bodyText ?? "", 220);
}

/* ── Places ───────────────────────────────────────────────────────────────── */

export function autoCityDescription(city: City): string {
  const intro = (city.introMd ?? "")
    // Strip the markdown that would otherwise land in a meta tag.
    .replace(/[#*_>`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (intro.length >= DESC_MIN) return trimToWord(intro, DESC_MAX);

  return pad(
    intro || `${city.name}, ${city.county} County, Florida.`,
    [
      `Homes for sale in ${city.name}, market context and local perspective.`,
      "From Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
    ],
  );
}

export function autoCommunityDescription(community: Community): string {
  const intro = (community.introMd ?? "")
    .replace(/[#*_>`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (intro.length >= DESC_MIN) return trimToWord(intro, DESC_MAX);

  return pad(intro || `${community.name}, Central Florida.`, [
    `Homes for sale in ${community.name}, with local detail and current listings.`,
    "From Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
  ]);
}

/** True when a value is safe to publish as a meta description. */
export function inBand(value: string | null | undefined): boolean {
  const length = value?.trim().length ?? 0;
  return length >= DESC_MIN && length <= DESC_MAX;
}
