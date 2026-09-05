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
    §28. An off-market listing gets no keywords at all.

    Its page is `noindex` (see the listing route's metadata), so a keyword for
    it is targeting a page that has asked not to be found — and if it is ever
    re-listed, the keywords are rebuilt from the record as it is then rather
    than as it was when it was withdrawn.
  */
  if (listing.status === "off_market") return out;

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

/* ── Articles, cities, communities ────────────────────────────────────────── */

/**
 * Keywords for a city hub page (§63).
 *
 * A city page is not inventory. It answers "what is it like to live here" and
 * "what is for sale here", so its phrases are about the PLACE — and unlike a
 * listing it may legitimately claim the whole city, because it is the page
 * about the whole city.
 *
 * No feature keywords: a city has no bedrooms. Attaching "4 bedroom homes in
 * Lake Mary" to the city page would compete with the search route that actually
 * answers it, which is §89's duplicate problem created deliberately.
 */
export function cityKeywords(
  city: { name: string; county: string },
  geo: GeoRelevance[],
): GeneratedKeyword[] {
  const self = geo.find((g) => g.layer === 2 && g.usableInCopy);
  if (!self) return [];

  const nearby = geo.filter((g) => g.layer === 3 && g.usableInCopy);
  const region = geo.find((g) => g.layer === 5 && g.usableInCopy);

  const out: GeneratedKeyword[] = [
    {
      keyword: `homes for sale in ${city.name} FL`,
      kind: "primary",
      intent: "transactional",
      geoEntityId: self.entityId,
      evidence: `This is the hub page for ${city.name}.`,
      score: 100,
    },
    {
      keyword: `${city.name} FL real estate`,
      kind: "primary",
      intent: "commercial",
      geoEntityId: self.entityId,
      evidence: `This is the hub page for ${city.name}.`,
      score: 96,
    },
    {
      keyword: `living in ${city.name} FL`,
      kind: "secondary",
      intent: "informational",
      geoEntityId: self.entityId,
      evidence: "The city page covers the area, not a single property.",
      score: 82,
    },
    {
      keyword: `${city.name} FL neighborhoods`,
      kind: "secondary",
      intent: "neighborhood",
      geoEntityId: self.entityId,
      evidence: "The city page lists the communities inside it.",
      score: 78,
    },
    {
      keyword: `moving to ${city.name} Florida`,
      kind: "long_tail",
      intent: "informational",
      geoEntityId: self.entityId,
      evidence: "The city page is the relocation entry point for this market.",
      score: 66,
    },
  ];

  for (const place of nearby) {
    out.push({
      keyword: `${city.name} vs ${place.name} FL`,
      kind: "nearby",
      intent: "informational",
      geoEntityId: place.entityId,
      // A comparison is only honest between places a buyer would really weigh
      // against each other, which is what an adjacency edge asserts.
      evidence: place.reason,
      score: 48,
    });
  }

  if (region) {
    out.push({
      keyword: `${region.name} real estate agent`,
      kind: "regional",
      intent: "commercial",
      geoEntityId: region.entityId,
      evidence: region.reason,
      score: 44,
    });
  }

  return dedupe(out);
}

/**
 * Keywords for a community page (§63).
 *
 * A community is named, and its name is the search. "Heathrow homes for sale"
 * is the whole query — nobody adds the city, because the name already implies
 * it. So the city appears only in the qualifying phrases.
 */
export function communityKeywords(
  community: { name: string; cityName: string },
  geo: GeoRelevance[],
): GeneratedKeyword[] {
  const self = geo.find((g) => g.layer === 1 && g.usableInCopy);
  const city = geo.find((g) => g.layer === 2 && g.usableInCopy);
  if (!self) return [];

  const out: GeneratedKeyword[] = [
    {
      keyword: `${community.name} homes for sale`,
      kind: "primary",
      intent: "transactional",
      geoEntityId: self.entityId,
      evidence: `This is the page for the ${community.name} community.`,
      score: 100,
    },
    {
      keyword: `${community.name} ${community.cityName} FL`,
      kind: "secondary",
      intent: "community",
      geoEntityId: self.entityId,
      evidence: `${community.name} is in ${community.cityName}.`,
      score: 84,
    },
    {
      keyword: `homes in ${community.name} community`,
      kind: "secondary",
      intent: "community",
      geoEntityId: self.entityId,
      evidence: `This is the page for the ${community.name} community.`,
      score: 80,
    },
    {
      keyword: `${community.name} HOA and amenities`,
      kind: "long_tail",
      intent: "informational",
      geoEntityId: self.entityId,
      evidence: "Community pages carry HOA and amenity detail.",
      score: 62,
    },
  ];

  if (city) {
    out.push({
      keyword: `${community.name} homes for sale ${city.name} FL`,
      kind: "long_tail",
      intent: "transactional",
      geoEntityId: city.entityId,
      evidence: city.reason,
      score: 70,
    });
  }

  return dedupe(out);
}

/**
 * Keywords for an article (§17, §18).
 *
 * ── Why an article's keywords come from its own words ─────────────────────
 *
 * A listing has attributes; an article has a subject, and the subject is
 * whatever the author wrote about. So the primary keyword IS the title,
 * normalised — not a phrase composed around it. §18 asks for keyword discovery
 * rather than keyword invention, and the honest discovery for a piece of
 * writing is what it is called.
 *
 * The rest are qualifiers the article's own metadata supports: the city it is
 * filed under, the topic tags the author chose, and whether it is a market
 * update. Nothing is added because it would rank.
 */
export function articleKeywords(
  article: {
    title: string;
    kind: string;
    tags: string[];
    cityName: string | null;
  },
  geo: GeoRelevance[],
): GeneratedKeyword[] {
  const title = article.title.trim();
  if (title.length < 3) return [];

  const city = geo.find((g) => g.layer === 2 && g.usableInCopy);

  const out: GeneratedKeyword[] = [
    {
      keyword: trimKeyword(title),
      kind: "primary",
      intent: "informational",
      geoEntityId: city?.entityId ?? null,
      evidence: "The article's own title is what it is about.",
      score: 100,
    },
  ];

  if (city) {
    out.push({
      keyword: `${city.name} FL real estate advice`,
      kind: "secondary",
      intent: "informational",
      geoEntityId: city.entityId,
      evidence: `The article is filed under ${city.name}.`,
      score: 70,
    });

    if (article.kind === "market_update") {
      out.push({
        keyword: `${city.name} FL housing market`,
        kind: "primary",
        intent: "informational",
        geoEntityId: city.entityId,
        evidence: "The article is classified as a market update.",
        score: 92,
      });
    }
  }

  /*
    Tags become keywords only when combined with the city.

    A tag on its own — "financing", "inspections" — is a topic, not a search
    somebody performs on a local agent's site, and targeting it puts this
    article in competition with the entire internet. With the city attached it
    becomes the query a local reader actually types.
  */
  for (const tag of article.tags.slice(0, 4)) {
    const clean = tag.trim().toLowerCase();
    if (clean.length < 3) continue;
    if (!city) continue;

    out.push({
      keyword: `${clean} ${city.name} FL`,
      kind: "long_tail",
      intent: "informational",
      geoEntityId: city.entityId,
      evidence: `The author tagged this article "${tag}".`,
      score: 56,
    });
  }

  return dedupe(out);
}

/** Titles run long; the column stops at 120 and a keyword should stop sooner. */
function trimKeyword(value: string): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= 90) return clean;
  const cut = clean.slice(0, 90);
  const space = cut.lastIndexOf(" ");
  return space > 40 ? cut.slice(0, space) : cut;
}
