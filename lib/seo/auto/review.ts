/**
 * What a model is allowed to hand back.
 *
 * ── Why this is its own module ────────────────────────────────────────────
 *
 * It used to live inside `ollama.ts`, which carries `server-only` because it
 * holds an API key and makes a network call. That made the review gate — the
 * part with no key, no network and no side effects — untestable: importing it
 * threw. And the gate is the half that MATTERS, because it is the only thing
 * standing between a model and a `<meta>` tag on a property listing.
 *
 * So the rules live here, pure, and `scripts/check-seo-copy.mts` asserts each
 * one fires. Two of them exist because a bad description reached a page: one
 * that stopped mid-list with no full stop, and one that named the city three
 * times in a sentence and a half.
 *
 * ── The policy ───────────────────────────────────────────────────────────
 *
 * A failing response is DISCARDED, never repaired. Repairing it would mean
 * guessing which half the model got right, and the deterministic description it
 * falls back to is already valid.
 */

import { DESC_MAX, DESC_MIN } from "@/lib/seo/auto/generate";

/**
 * Why a rejected response was rejected.
 *
 * Returned rather than logged-and-forgotten so the caller can say something
 * true. "The model's answer was rejected because it contained a number that is
 * not in this listing" is a sentence an operator can act on; silence looks like
 * the feature not working.
 */
export type Rejection =
  | "unconfigured"
  | "unreachable"
  | "rate-limited"
  | "timeout"
  | "truncated"
  | "empty"
  | "length"
  | "formatting"
  | "unfinished"
  | "repetitive"
  | "invented-number";

/**
 * Every numeral in `text` must appear in `source`.
 *
 * Digits are compared after stripping separators, so "1,850" in the source
 * satisfies "1850" in the output. Years, prices, bed and bath counts are all
 * numerals, which is precisely the class of fact a model is most likely to
 * smooth into something plausible and wrong.
 */
function containsOnlyKnownNumbers(text: string, source: string): boolean {
  const normalise = (s: string) => s.replace(/[,\s]/g, "");
  const known = new Set(normalise(source).match(/\d+/g) ?? []);
  const used = normalise(text).match(/\d+/g) ?? [];
  return used.every((n) => known.has(n));
}

/**
 * Words too common to count as repetition.
 *
 * Without this list "the", "and" and "for" trip the stuffing check on every
 * description, and a check that fires on everything is a check nobody reads.
 * "florida" and "home" are exempt for the opposite reason: they are the subject
 * of every page on this site, so repeating one is English rather than an attempt
 * to rank.
 */
const COMMON = new Set([
  "the", "and", "for", "with", "from", "that", "this", "your", "you", "are",
  "our", "its", "into", "what", "when", "where", "which", "have", "has", "been",
  "will", "more", "than", "then", "they", "them", "their", "about", "also",
  "florida", "home", "homes", "house", "real", "estate",
]);

/**
 * A word or a place named three or more times in 158 characters.
 *
 * Twice reads as natural English. Three times in a sentence and a half is the
 * pattern search engines treat as keyword stuffing, and it is exactly what a
 * model does when it is asked to work a phrase in. The output that prompted this
 * check was "Thinking about moving to Lake Mary, Florida? Discover what it is
 * like to live in Lake Mary, including..." — the city named twice in twenty
 * words, the second one carrying nothing.
 */
function isRepetitive(text: string): boolean {
  const counts = new Map<string, number>();
  for (const word of text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) ?? []) {
    if (COMMON.has(word)) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count >= 3);
}

/**
 * Reject anything that would look wrong in a `<meta>` tag, and say why.
 *
 * The reason is returned rather than collapsed to a boolean so a rejection is
 * diagnosable. "It quietly used the written version again" is not a report
 * anyone can act on; "the model put in a number this listing does not contain"
 * is — and on a property listing that particular rejection is the one that
 * matters most.
 */
/**
 * What is wrong with a description, regardless of where it came from.
 *
 * ── Why the audit needs this and not just `review` ────────────────────────
 *
 * `review` is the gate for MODEL output: it also checks the length band and
 * whether a numeral was invented, both of which need the source record. The
 * admin's audit has a different job — it is looking at a description that is
 * already saved, which may have been typed, generated, or accepted from a model
 * before this gate existed.
 *
 * That last case is the one that prompted this. A stored description reading
 * "...including local neighborhoods, home prices, schools, lifestyle" was 153
 * characters, so the only check the panel ran said "inside 140-158" and scored
 * it as good — while the sentence it describes stops dead and a search result
 * displays exactly that.
 *
 * Returns null when there is nothing to say.
 */
export function descriptionProblem(
  text: string,
): { code: "unfinished" | "repetitive"; detail: string } | null {
  const value = text.trim();
  if (value === "") return null;

  if (!/[.!?]["')\]]?$/.test(value)) {
    return {
      code: "unfinished",
      detail:
        "It does not end on a full stop, so it reads as a sentence that was cut off — which is how a search result will display it.",
    };
  }

  if (/\b(and|or|with|including|such as|plus|from|for|to)\s*[.!?]$/i.test(value)) {
    return {
      code: "unfinished",
      detail: "It ends on a joining word, so the sentence was going somewhere it never got to.",
    };
  }

  if (isRepetitive(value)) {
    return {
      code: "repetitive",
      detail:
        "A word is repeated three or more times in a sentence and a half, which reads as padding and is the pattern search engines treat as keyword stuffing.",
    };
  }

  return null;
}

export function review(text: string, source: string): "ok" | Rejection {
  const value = text.trim();
  if (value.length < DESC_MIN || value.length > DESC_MAX) return "length";
  // Markdown, quotes and newlines all render literally in a meta description.
  if (/[*_#`\n\r]|^["']|["']$/.test(value)) return "formatting";
  // A model that starts explaining itself has not answered the prompt.
  if (/^(here|sure|certainly|of course)\b/i.test(value)) return "formatting";
  /*
    It has to end like a sentence.

    A model asked for 158 characters will often stop AT 158, mid-list — "...local
    neighborhoods, home prices, schools, lifestyle" — and a description with no
    full stop is displayed exactly like that in a result. `finish_reason` does
    not catch it, because the model chose to stop; it simply chose badly.
  */
  if (!/[.!?]["')\]]?$/.test(value)) return "unfinished";

  // A trailing conjunction or preposition is a sentence that was going somewhere.
  if (/\b(and|or|with|including|such as|plus|from|for|to)\s*[.!?]$/i.test(value)) {
    return "unfinished";
  }

  if (isRepetitive(value)) return "repetitive";
  if (!containsOnlyKnownNumbers(value, source)) return "invented-number";
  return "ok";
}
