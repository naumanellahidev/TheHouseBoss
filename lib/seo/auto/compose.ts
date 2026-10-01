/**
 * The composer every generated title and description is built with.
 *
 * ── What changed, and why it needed to ────────────────────────────────────
 *
 * The first generator had one pattern per record type and a padder. When the
 * pattern came out short, brand text was appended until it reached the floor —
 * so a listing with four bedrooms, a pool and a contractor's report on the roof
 * could end up described as "…. From The House Boss, Lake Mary FL." Valid,
 * in band, and thirty wasted characters that could have carried a fact.
 *
 * This file inverts that. A generator now offers SEVERAL candidates, richest
 * first, and the composer returns the richest one that FITS. Padding still
 * exists, because the `seo_pages` CHECK constraint is absolute and something has
 * to close the last gap, but it is now the rare path rather than the common one.
 *
 * ── The budgets ───────────────────────────────────────────────────────────
 *
 * Descriptions: 140–158 characters, enforced by the CHECK constraint on
 * `seo_pages` and warned on by `scripts/check-seo.mjs`.
 *
 * Titles: 43, which is 60 minus the " | The House Boss" the root layout
 * appends. Sixty is where Google's results pane truncates.
 */

export const DESC_MIN = 140;
export const DESC_MAX = 158;
/** 60 minus the " | The House Boss" template suffix the root layout appends. */
export const TITLE_MAX = 43;

/** Collapse whitespace. Every generator's first and last act. */
export function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** Trim to a word boundary, never mid-word, never leaving dangling punctuation. */
export function trimToWord(value: string, max: number): string {
  const clean = tidy(value);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(
    // `|` included: a trimmed title that ends on the separator reads as an error.
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
/**
 * Words a title must never end on.
 *
 * "Living in Lake Mary, FL: What You Need to" is what the old trimmer produced
 * from "…What You Need to Know", and it is worse than a shorter title: it reads
 * as a page that is broken rather than a page that is brief, and that is the
 * line somebody decides whether to click on.
 */
const DANGLING = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into", "is",
  "it", "its", "of", "on", "or", "our", "over", "per", "so", "than", "that",
  "the", "their", "this", "to", "under", "up", "via", "vs", "was", "were",
  "what", "when", "which", "while", "who", "why", "will", "with", "without",
  "you", "your",
]);

function dropDanglingWords(value: string): string {
  const words = value.split(" ");
  while (words.length > 2) {
    const last = words[words.length - 1].toLowerCase().replace(/[^a-z]/g, "");
    if (!DANGLING.has(last)) break;
    words.pop();
  }
  return words.join(" ").replace(/[\s,;:|—–-]+$/, "");
}

export function trimTitle(value: string, max = TITLE_MAX): string {
  const clean = stripBrandSuffix(value);
  if (clean.length <= max) return clean;

  /*
    Cut at a clause boundary before cutting at a word.

    An author's headline is usually two parts — "Living in Lake Mary, FL: What
    You Need to Know" — and the first part is the one that carries the subject.
    Dropping the second part whole gives "Living in Lake Mary, FL": complete,
    inside the budget, and still the phrase somebody searches. Cutting by word
    gave a fragment of the second part and kept none of it.

    Colons, dashes, pipes and commas all count. The comma is last because it is
    the weakest break — "Lake Mary, FL" must not become "Lake Mary" while a
    stronger boundary is available.
  */
  for (const separator of [/\s*[|·—–:;]\s*/, /\s*,\s*/]) {
    const parts = clean.split(separator).filter(Boolean);
    if (parts.length < 2) continue;

    let head = "";
    for (const part of parts) {
      const candidate = head === "" ? part : `${head}${separator.source.includes(",") ? ", " : " — "}${part}`;
      if (candidate.length > max) break;
      head = candidate;
    }

    // 16 characters: below that the head is a word or two and says less than a
    // trimmed version of the whole thing would.
    if (head.length >= 16) return head;
  }

  return dropDanglingWords(trimToWord(clean, max));
}

/**
 * The richest title that fits, from candidates ordered best first.
 *
 * "Richest" is the caller's judgement, not a score computed here: the generator
 * knows that "4 Bed Pool Home" earns its characters and "— $525,000" earns
 * fewer, and expressing that as an order is clearer than expressing it as
 * weights. The composer's job is the arithmetic.
 *
 * The last candidate is the floor and is trimmed rather than skipped, so this
 * always returns something — a record with a very long address still gets a
 * title, cut at a word boundary.
 */
export function pickTitle(candidates: (string | null | undefined)[], max = TITLE_MAX): string {
  const usable = candidates.map((c) => (c ? tidy(c) : "")).filter(Boolean);
  for (const candidate of usable) {
    if (stripBrandSuffix(candidate).length <= max) return stripBrandSuffix(candidate);
  }
  return trimTitle(usable[usable.length - 1] ?? "", max);
}

/**
 * Attribution lines, longest to shortest.
 *
 * These are the last resort, and the reason they are a LADDER rather than one
 * string is arithmetic. A clause can only be appended if it fits inside 158, so
 * a 132-character description and a 60-character clause leave the result at
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
export const BRAND_TAILS = [
  "From The House Boss — Lake Mary and Central Florida real estate.",
  "From The House Boss, Lake Mary and Central Florida.",
  "From The House Boss in Lake Mary, Florida.",
  "From The House Boss, Lake Mary FL.",
  "From The House Boss.",
  "The House Boss.",
];

/**
 * Compose a description in band from candidate openings and optional clauses.
 *
 * The search is deliberately simple and deliberately exhaustive in one
 * direction: for each opening, richest first, add as many clauses as fit; the
 * first result that lands inside the band wins. Nothing is ever cut mid-clause,
 * so every output ends on a complete sentence.
 *
 * When no combination reaches the floor — which happens when the record simply
 * has little in it, a listing with an address and nothing else — the longest
 * result is padded with the brand ladder. That is the only path that adds words
 * carrying no information about the record, and it now runs last instead of
 * first.
 */
export function composeDescription(opts: {
  /** Openings, richest first. The first that works is used. */
  openings: (string | null | undefined)[];
  /**
   * Fact clauses, most valuable first. Added whole, while they fit.
   *
   * An entry may be an ARRAY, which means "these are wordings of the same
   * clause, longest first — use at most one". That grouping is what lets a
   * generator offer "Includes a licensed residential contractor's read on the
   * roof, systems and condition." and "With a contractor's read on the
   * condition." without any chance of a description that says both. Before the
   * grouping existed the only alternative was picking the wording up front,
   * against a budget that is not known until the opening has been chosen.
   */
  clauses?: (string | null | undefined | (string | null | undefined)[])[];
}): string {
  const openings = opts.openings
    .map((o) => (o ? sentenceSafe(o) : ""))
    .filter(Boolean);

  // Normalised to groups, so the fitting loop has one shape to deal with.
  const groups = (opts.clauses ?? [])
    .map((entry) =>
      (Array.isArray(entry) ? entry : [entry]).map((c) => (c ? tidy(c) : "")).filter(Boolean),
    )
    .filter((group) => group.length > 0);

  let best = "";

  for (const raw of openings) {
    /*
      An opening over the ceiling is cut to WHOLE SENTENCES, never to a word.

      This is where the broken description came from. The answer-first paragraph
      was 199 characters, so it was trimmed at a word boundary to 158 and ended
      "...and the three markets behave" — in band, scored as fine, and displayed
      in a search result exactly like that.

      Taking the sentences that fit instead usually lands UNDER the floor, which
      is correct: the clause loop below then pads it with real information, and
      the brand ladder closes whatever gap is left. A shorter complete thought
      beats a longer broken one every time.
    */
    let opening = raw;
    if (opening.length > DESC_MAX) {
      const whole = firstSentences(opening, DESC_MAX);
      opening = whole.length >= 40 ? whole : sentenceSafe(trimToWord(opening, DESC_MAX));
      if (opening.length >= DESC_MIN && opening.length <= DESC_MAX) return opening;
    }

    let out = opening;
    for (const group of groups) {
      if (out.length >= DESC_MIN) break;
      for (const clause of group) {
        // Do not say the same thing twice: a clause whose substance is already
        // in the opening costs characters and reads as a stutter.
        if (out.toLowerCase().includes(clause.toLowerCase().replace(/[.,]$/, ""))) break;
        const candidate = tidy(`${out} ${clause}`);
        if (candidate.length <= DESC_MAX) {
          out = candidate;
          break;
        }
      }
    }

    if (out.length >= DESC_MIN) return out;
    if (out.length > best.length) best = out;
  }

  if (best === "") return "";

  for (const tail of BRAND_TAILS) {
    if (best.length >= DESC_MIN) break;
    // Never repeat an attribution a clause already added.
    if (best.includes("The House Boss")) break;
    const candidate = tidy(`${best} ${tail}`);
    if (candidate.length <= DESC_MAX) {
      best = candidate;
      break;
    }
  }

  return trimToWord(best, DESC_MAX);
}

/**
 * End an opening on a sentence, so a clause can be added after it.
 *
 * Openings are not all composed here. An article's opening is the author's
 * excerpt or the first slice of her body, and neither is guaranteed to end on a
 * full stop — an excerpt typed as a fragment, or a body slice cut at a word
 * boundary, both arrive without one. Appending " Updated September 2026." to
 * "The appraisal is ordered through the VA panel" produces a sentence that runs
 * into the next one, which reads as a bug in the page rather than in the copy.
 *
 * So: if there is a sentence boundary to fall back to, fall back to it and let
 * the clauses make up the length. Only when there is none — a single unpunctuated
 * fragment, which is what a title is — is a full stop added.
 */
function sentenceSafe(text: string): string {
  const value = tidy(text);
  if (value === "" || /[.!?]["'”’)]?$/.test(value)) return value;

  const stop = Math.max(value.lastIndexOf(". "), value.lastIndexOf("? "), value.lastIndexOf("! "));
  // 40 characters: below that the "sentence" left over is a clause, and keeping
  // it would throw away more of the author's words than it saves.
  if (stop >= 40) return value.slice(0, stop + 1);

  return `${value.replace(/[\s,;:—–-]+$/, "")}.`;
}

/** Whole sentences up to `max`. Shared with the article form's excerpt button. */
export function firstSentences(text: string, max: number): string {
  const clean = tidy(text);
  if (!clean) return "";
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("? "));
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : trimToWord(cut, max);
}

/** True when a value is safe to publish as a meta description. */
export function inBand(value: string | null | undefined): boolean {
  const length = value?.trim().length ?? 0;
  return length >= DESC_MIN && length <= DESC_MAX;
}

/**
 * Where a phrase appears in a string, as a fraction of its length.
 *
 * Used by the scorer for one specific judgement: a description whose keyword
 * only arrives at character 130 is a description whose first line — the part
 * that is actually displayed on a phone — says nothing about what the page is.
 * Returns null when the phrase is absent.
 */
export function phrasePosition(haystack: string, phrase: string): number | null {
  const index = haystack.toLowerCase().indexOf(phrase.toLowerCase());
  return index < 0 ? null : index;
}
