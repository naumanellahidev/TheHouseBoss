import "server-only";

import type { Listing } from "@/types/domain";
import type { GeoRelevance } from "@/lib/seo/geo/relevance";

/**
 * The keyword engine (brief §8, §9, §10, §57, §100).
 *
 * ── Why no model is involved ──────────────────────────────────────────────
 *
 * §100 is explicit: do not generate keyword lists from an LLM alone. This is
 * the reason, stated concretely. Asked for "keywords for a Lake Mary home", a
 * model produces `lake mary luxury homes`, `lake mary waterfront`, `lake mary
 * gated community` — plausible phrases, some of which describe a property that
 * does not exist. Every one of those is a claim about inventory, and on a
 * property listing a claim that is not true is a misrepresentation under FREC
 * advertising rules, not a bad keyword.
 *
 * So keywords are COMPOSED, not written. Each one is a template filled from
 * two verified inputs: a place the geo graph connects to this listing, and an
 * attribute the database records. If either is absent the keyword is not
 * produced. There is nothing for a model to invent because a model is never
 * asked.
 *
 * The model's job is prose — `lib/seo/auto/ollama.ts` polishes a description
 * and its output is checked against the record. Keywords are structure, and
 * structure is derived.
 *
 * ── Why this produces fewer keywords than a model would ───────────────────
 *
 * Deliberately, and §58 says so: relevance and usefulness, not maximum count.
 * A listing with no pool gets no pool keyword. A listing in a city with one
 * neighbour gets one nearby keyword. That is the honest surface area of the
 * property, and padding it is what §14 calls keyword stuffing.
 */

export const ENGINE_VERSION = "1.0.0";

export type KeywordKind =
  | "primary"
  | "secondary"
  | "long_tail"
  | "feature"
  | "intent"
  | "nearby"
  | "regional";

export type SearchIntent =
  | "transactional"
  | "commercial"
  | "informational"
  | "navigational"
  | "local"
  | "buyer"
  | "property_feature"
  | "new_construction"
  | "va"
  | "assumable_mortgage"
  | "community"
  | "neighborhood";

export type GeneratedKeyword = {
  keyword: string;
  kind: KeywordKind;
  intent: SearchIntent;
  /** The place this phrase names, so §57 can verify it against the graph. */
  geoEntityId: string | null;
  /** Why this keyword is supported. Never empty — the schema forbids it. */
  evidence: string;
  score: number;
};

/* ── Vocabulary ───────────────────────────────────────────────────────────── */

/**
 * How buyers actually phrase a property type.
 *
 * "single_family" is a database value, not a search. Someone looking for one
 * types "homes" or "houses"; nobody types "single family residence" outside
 * the trade.
 */
const TYPE_NOUN: Record<string, string> = {
  single_family: "homes",
  townhouse: "townhomes",
  condo: "condos",
  villa: "villas",
  multi_family: "multi-family homes",
  land: "land",
  manufactured: "manufactured homes",
};

/** Bedroom counts worth targeting. Beyond five the query volume is negligible. */
const BED_RANGE = [2, 3, 4, 5];

/* ── Composition ──────────────────────────────────────────────────────────── */

/**
 * Keywords for one listing.
 *
 * `geo` is the output of `resolveListingGeo` — already filtered to places the
 * graph connects to this property. This function never looks up a place name
 * and never accepts one from anywhere else, which is what makes an invalid
 * location structurally impossible rather than merely discouraged.
 */
export function listingKeywords(
  listing: Listing,
  geo: GeoRelevance[],
): GeneratedKeyword[] {
  const out: GeneratedKeyword[] = [];

  const usable = geo.filter((g) => g.usableInCopy);
  const city = usable.find((g) => g.layer === 2);
  const community = usable.find((g) => g.layer === 1);
  const nearby = usable.filter((g) => g.layer === 3);
  const regional = usable.filter((g) => g.layer === 5);

  /*
    No city in the graph, no keywords at all.

    Every phrase below is a location claim. Emitting "4 bedroom homes for sale"
    with no place attached targets the whole United States and helps nobody; a
    listing in a city the graph does not know is a data problem to fix, not a
    keyword set to approximate.
  */
  if (!city) return out;

  const noun = TYPE_NOUN[listing.propertyType] ?? "homes";
  const sold = listing.status === "sold";

  /*
    A sold listing is not for sale, and every "for sale" phrase attached to one
    is a false statement to a search engine and a wasted click for a buyer. Its
    page stays published forever (HR11) — as a record, which is what it should
    be found as.
  */
  if (sold) {
    out.push({
      keyword: `recently sold ${noun} in ${city.name} FL`,
      kind: "primary",
      intent: "informational",
      geoEntityId: city.entityId,
      evidence: `This property sold, so it is targeted as a sale record rather than as inventory. ${city.reason}`,
      score: 70,
    });
    return out;
  }

  /* ── §8 primary and secondary ─────────────────────────────────────────── */

  out.push(
    {
      keyword: `${noun} for sale in ${city.name} FL`,
      kind: "primary",
      intent: "transactional",
      geoEntityId: city.entityId,
      evidence: city.reason,
      score: 100,
    },
    {
      keyword: `${city.name} FL real estate`,
      kind: "secondary",
      intent: "commercial",
      geoEntityId: city.entityId,
      evidence: city.reason,
      score: 80,
    },
    {
      keyword: `${city.name} ${noun} for sale`,
      kind: "secondary",
      intent: "transactional",
      geoEntityId: city.entityId,
      evidence: city.reason,
      score: 78,
    },
  );

  /* ── Community, when the listing is actually in one ───────────────────── */

  if (community) {
    out.push({
      keyword: `${noun} for sale in ${community.name}`,
      kind: "primary",
      intent: "community",
      geoEntityId: community.entityId,
      evidence: community.reason,
      score: 95,
    });
  }

  /* ── §10 feature keywords, only from verified attributes ──────────────── */

  if (listing.beds != null && BED_RANGE.includes(listing.beds)) {
    out.push({
      keyword: `${listing.beds} bedroom ${noun} in ${city.name} FL`,
      kind: "feature",
      intent: "property_feature",
      geoEntityId: city.entityId,
      evidence: `The listing records ${listing.beds} bedrooms.`,
      score: 88,
    });
  }

  if (listing.pool) {
    out.push({
      keyword: `pool ${noun} for sale in ${city.name} FL`,
      kind: "feature",
      intent: "property_feature",
      geoEntityId: city.entityId,
      evidence: "The listing records a pool.",
      score: 86,
    });
  }

  if (listing.waterfront) {
    out.push({
      keyword: `waterfront ${noun} in ${city.name} FL`,
      kind: "feature",
      intent: "property_feature",
      geoEntityId: city.entityId,
      evidence: "The listing records waterfront.",
      score: 86,
    });
  }

  if (listing.garageSpaces >= 3) {
    /*
      Three, not one. A garage is unremarkable in Central Florida and "homes
      with a garage" describes almost the whole market; three is the point at
      which it is a differentiator someone searches for.
    */
    out.push({
      keyword: `${noun} with ${listing.garageSpaces} car garage in ${city.name} FL`,
      kind: "feature",
      intent: "property_feature",
      geoEntityId: city.entityId,
      evidence: `The listing records ${listing.garageSpaces} garage spaces.`,
      score: 70,
    });
  }

  /* ── §8 buyer intent, only where the record supports it ───────────────── */

  if (listing.listingType === "new_construction") {
    out.push(
      {
        keyword: `new construction ${noun} ${city.name} FL`,
        kind: "intent",
        intent: "new_construction",
        geoEntityId: city.entityId,
        evidence: "The listing is recorded as new construction.",
        score: 92,
      },
      {
        keyword: `new construction homes for sale near ${city.name}`,
        kind: "long_tail",
        intent: "new_construction",
        geoEntityId: city.entityId,
        evidence: "The listing is recorded as new construction.",
        score: 74,
      },
    );
  }

  /*
    VA and assumable, from the record's own classification.

    An earlier draft of this file refused to produce these at all, on the
    reasoning that §86 forbids the claim "without verified information" and the
    schema records none. That was simply wrong: `listings.listing_type` is a
    CHECK-constrained enum that includes `va_eligible` and `assumable`, set
    deliberately by a licensed agent. That IS the verified information, and it
    is the same source every other keyword here trusts.

    What survives from the caution is the phrasing. "VA homes for sale" invites
    the reading that the property is VA-approved, which is not what the
    classification means — eligibility is settled by the appraisal and the
    Minimum Property Requirements, by the lender and the VA, not by us. So the
    phrase names the BUYER, not a property status, and the guide pages carry
    the detail.
  */
  if (listing.listingType === "va_eligible") {
    out.push({
      keyword: `${noun} for VA buyers in ${city.name} FL`,
      kind: "intent",
      intent: "va",
      geoEntityId: city.entityId,
      evidence:
        "The agent classified this listing as VA-eligible. Eligibility is finally determined by the lender and the VA appraisal.",
      score: 84,
    });
  }

  if (listing.listingType === "assumable") {
    out.push({
      keyword: `assumable mortgage ${noun} in ${city.name} FL`,
      kind: "intent",
      intent: "assumable_mortgage",
      geoEntityId: city.entityId,
      evidence:
        "The agent classified this listing as having an assumable mortgage. Whether an assumption can complete is decided by the servicer.",
      score: 84,
    });
  }

  /* ── §8 nearby, from the graph and nowhere else ───────────────────────── */

  for (const place of nearby) {
    out.push({
      keyword: `${noun} for sale near ${place.name} FL`,
      kind: "nearby",
      intent: "local",
      geoEntityId: place.entityId,
      // The graph's own sentence, carried through verbatim. Rewriting it here
      // would produce a second, prettier justification for the same edge.
      evidence: place.reason,
      score: 55,
    });
  }

  /* ── §8 regional context ──────────────────────────────────────────────── */

  for (const place of regional) {
    out.push({
      keyword: `${place.name} ${noun} for sale`,
      kind: "regional",
      intent: "local",
      geoEntityId: place.entityId,
      evidence: place.reason,
      score: 40,
    });
  }

  /* ── §8 long tail, composed from two verified facts at once ───────────── */

  if (listing.beds != null && listing.pool && BED_RANGE.includes(listing.beds)) {
    out.push({
      keyword: `${listing.beds} bedroom pool ${noun} in ${city.name} FL`,
      kind: "long_tail",
      intent: "property_feature",
      geoEntityId: city.entityId,
      evidence: `The listing records ${listing.beds} bedrooms and a pool.`,
      score: 72,
    });
  }

  return dedupe(out);
}

/**
 * Drop repeats, keeping the highest-scoring version of each phrase.
 *
 * Templates overlap by design — a 4-bed new-construction pool home in Lake Mary
 * matches several — and the database has a unique index that would reject the
 * second write. Failing the whole run on a duplicate would be the wrong answer
 * to something this predictable.
 */
function dedupe(keywords: GeneratedKeyword[]): GeneratedKeyword[] {
  const best = new Map<string, GeneratedKeyword>();
  for (const k of keywords) {
    const key = k.keyword.toLowerCase();
    const existing = best.get(key);
    if (!existing || k.score > existing.score) best.set(key, k);
  }
  return [...best.values()].sort((a, b) => b.score - a.score);
}
