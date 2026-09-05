import "server-only";

import type { GeneratedKeyword } from "@/lib/seo/engine/keywords";
import type { GeoRelevance } from "@/lib/seo/geo/relevance";

/**
 * Keyword validation (brief §57, §86, §97).
 *
 * ── Why this exists when the generator is already deterministic ───────────
 *
 * `keywords.ts` composes from verified inputs and cannot currently produce an
 * invalid phrase. This validator is not there to catch it today; it is there to
 * catch it in a year, when a template has been edited by someone who did not
 * read the comments, or when a second generator is added, or when the model is
 * eventually allowed to propose a phrase for review.
 *
 * The rule §86 states — never claim a property is somewhere it is not, never
 * claim a feature it does not have — is a property of the SYSTEM, not of one
 * function. A property enforced in only the place that currently happens to
 * satisfy it is not enforced.
 *
 * ── Why rejections are returned rather than thrown ────────────────────────
 *
 * A single bad keyword must not fail a publish. The valid ones are stored, the
 * rejected ones are reported with the reason, and the reason surfaces in the
 * admin (§85) — where an operator can see "this was dropped because the graph
 * does not connect Sanford to this property" and either fix the data or accept
 * the omission.
 */

export type Rejection = {
  keyword: string;
  reason: string;
};

export type ValidationResult = {
  accepted: GeneratedKeyword[];
  rejected: Rejection[];
};

/** Filler that carries no search value and inflates a phrase (§14). */
const STUFFING_TOKENS = [
  "best",
  "top",
  "cheap",
  "affordable",
  "luxury",
  "amazing",
  "beautiful",
  "stunning",
  "dream",
];

export function validateKeywords(
  keywords: GeneratedKeyword[],
  context: {
    /** Places the graph connects to this record. The only valid geography. */
    geo: GeoRelevance[];
    /** Attribute names the record actually confirms, lower-cased. */
    verifiedFeatures: Set<string>;
    settings: {
      requireGeoRelevance: boolean;
      requireVerifiedFeatures: boolean;
      blockKeywordStuffing: boolean;
    };
  },
): ValidationResult {
  const accepted: GeneratedKeyword[] = [];
  const rejected: Rejection[] = [];

  const allowedEntityIds = new Set(
    context.geo.filter((g) => g.usableInCopy).map((g) => g.entityId),
  );
  const allowedNames = context.geo.map((g) => g.name.toLowerCase());
  const seen = new Set<string>();

  for (const candidate of keywords) {
    const phrase = candidate.keyword.trim();
    const lower = phrase.toLowerCase();

    const reject = (reason: string) => rejected.push({ keyword: phrase, reason });

    /* ── Shape ────────────────────────────────────────────────────────── */

    if (phrase.length < 3 || phrase.length > 120) {
      reject(`It is ${phrase.length} characters; the column accepts 3 to 120.`);
      continue;
    }

    if (seen.has(lower)) {
      reject("The same phrase was produced more than once.");
      continue;
    }

    /* ── §57 geography ────────────────────────────────────────────────── */

    if (context.settings.requireGeoRelevance) {
      /*
        Two checks, and both are needed.

        The first is the strong one: a keyword that CLAIMS a place must carry
        that place's entity id, and the id must be one the graph connected to
        this record. That catches a template pointed at the wrong variable.

        The second is the backstop: a keyword carrying NO entity id must not
        mention a place name either. That catches a phrase assembled by string
        concatenation somewhere that forgot to attach the entity — which is
        precisely how "homes near Tampa" would get through a check that only
        looked at ids.
      */
      if (candidate.geoEntityId) {
        if (!allowedEntityIds.has(candidate.geoEntityId)) {
          reject(
            "It names a place the geographic graph does not connect to this record, or one that is marked as context-only.",
          );
          continue;
        }
      } else {
        const mentionsUnlinkedPlace = allowedNames.length > 0 && /\b(?:in|near)\s+[A-Z]/.test(phrase);
        if (mentionsUnlinkedPlace) {
          reject(
            "It appears to name a location but carries no geographic entity, so the claim cannot be verified.",
          );
          continue;
        }
      }
    }

    /* ── §10, §86 features ────────────────────────────────────────────── */

    if (context.settings.requireVerifiedFeatures && candidate.kind === "feature") {
      const claimed = FEATURE_WORDS.find((word) => lower.includes(word.phrase));
      if (claimed && !context.verifiedFeatures.has(claimed.attribute)) {
        reject(
          `It claims "${claimed.phrase}", which this record does not confirm.`,
        );
        continue;
      }
    }

    /*
      §86, the financing claims — refused when UNSUPPORTED, not refused outright.

      An earlier version of this file rejected every VA and assumable phrase, on
      the reasoning that neither is an attribute of a listing. That was wrong:
      `listings.listing_type` is a CHECK-constrained enum including
      `va_eligible` and `assumable`, set by a licensed agent, and that is the
      verified information §86 asks for.

      So the rule is the one §86 actually states. The claim must be backed by
      the record, and it must be classified as the intent it makes — a phrase
      mentioning VA while claiming to be about something else has slipped past
      whatever check its own intent would have received.
    */
    if (/\bva\b|\bassumable\b/i.test(lower)) {
      const isFinancingIntent =
        candidate.intent === "va" || candidate.intent === "assumable_mortgage";

      if (!isFinancingIntent) {
        reject(
          "It mentions VA or assumable financing without being classified as that intent.",
        );
        continue;
      }

      const attribute = candidate.intent === "va" ? "va_eligible" : "assumable";
      if (
        context.settings.requireVerifiedFeatures &&
        !context.verifiedFeatures.has(attribute)
      ) {
        reject(
          `This record is not classified as ${attribute}, so the financing claim is unsupported.`,
        );
        continue;
      }
    }

    /* ── §14 stuffing ─────────────────────────────────────────────────── */

    if (context.settings.blockKeywordStuffing) {
      const filler = STUFFING_TOKENS.find((token) =>
        new RegExp(`\\b${token}\\b`, "i").test(lower),
      );
      if (filler) {
        reject(`It contains "${filler}", a subjective filler word with no search value.`);
        continue;
      }

      /*
        A place name repeated inside one phrase is the classic stuffed keyword:
        "Lake Mary homes for sale Lake Mary FL". §13 names this exact shape as
        unacceptable.
      */
      const repeated = allowedNames.find(
        (name) => name.length > 3 && lower.split(name).length > 2,
      );
      if (repeated) {
        reject(`It repeats "${repeated}" more than once in a single phrase.`);
        continue;
      }

      const words = lower.split(/\s+/);
      if (words.length > 12) {
        reject(`It is ${words.length} words; a keyword that long is a sentence.`);
        continue;
      }
    }

    /* ── Evidence is not optional ─────────────────────────────────────── */

    if (!candidate.evidence?.trim()) {
      reject("It carries no stated evidence, so nothing supports it.");
      continue;
    }

    seen.add(lower);
    accepted.push({ ...candidate, keyword: phrase });
  }

  return { accepted, rejected };
}

/**
 * Phrases that assert a property attribute, and the attribute each one asserts.
 *
 * Kept as data so the check is a lookup rather than a chain of conditionals
 * that has to be edited in two places every time an attribute is added.
 */
const FEATURE_WORDS: { phrase: string; attribute: string }[] = [
  { phrase: "pool", attribute: "pool" },
  { phrase: "waterfront", attribute: "waterfront" },
  { phrase: "car garage", attribute: "garage" },
  { phrase: "bedroom", attribute: "beds" },
  { phrase: "bathroom", attribute: "baths" },
  { phrase: "new construction", attribute: "new_construction" },
];

/**
 * What a listing actually confirms, as the validator expects it.
 *
 * Derived here rather than at each call site so "does this record have a pool"
 * has exactly one answer. Note `beds`/`baths` are present only when non-null:
 * a listing with no bedroom count recorded cannot support a bedroom keyword,
 * and `0` is a real answer that also cannot.
 */
export function verifiedFeaturesOf(listing: {
  pool: boolean;
  waterfront: boolean;
  garageSpaces: number;
  beds: number | null;
  baths: number | null;
  listingType: string;
}): Set<string> {
  const set = new Set<string>();
  if (listing.pool) set.add("pool");
  if (listing.waterfront) set.add("waterfront");
  if (listing.garageSpaces > 0) set.add("garage");
  if (listing.beds != null && listing.beds > 0) set.add("beds");
  if (listing.baths != null && listing.baths > 0) set.add("baths");
  if (listing.listingType === "new_construction") set.add("new_construction");
  // The financing classifications. Set by the agent on the listing, and the
  // only thing that permits a VA or assumable keyword — see the check above.
  if (listing.listingType === "va_eligible") set.add("va_eligible");
  if (listing.listingType === "assumable") set.add("assumable");
  return set;
}
