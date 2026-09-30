import type { ListingType, PropertyType } from "@/types/domain";

/**
 * The words a record is allowed to be described with.
 *
 * ── Why this is its own file ───────────────────────────────────────────────
 *
 * Titles, descriptions, Open Graph copy and the keyword engine were each
 * choosing their own noun for the same property. `keywords.ts` said "homes",
 * the title said nothing, and the description said "property" — three
 * vocabularies for one listing, which is the thing that makes a set of pages
 * read like a template rather than like a site.
 *
 * So the vocabulary is derived once, here, from the record's own columns, and
 * every generator reads it. Nothing in this file infers, rounds or embellishes:
 * every string it returns is a restatement of a stored value, because on a
 * property listing an invented adjective is a misrepresentation under FREC
 * advertising rules rather than a style choice (CLAUDE.md § 3).
 *
 * ── Singular here, plural in the keyword engine ───────────────────────────
 *
 * Deliberate, not an inconsistency. A keyword describes a category somebody
 * searches for — "townhomes for sale in Lake Mary" — while a title describes
 * one building: "3 Bed Townhome". `TYPE_NOUN` in `lib/seo/engine/keywords.ts`
 * owns the plural; this file owns the singular.
 */

/** How a buyer says the property type, in the singular. */
const SINGULAR: Record<PropertyType, string> = {
  single_family: "Home",
  townhouse: "Townhome",
  condo: "Condo",
  villa: "Villa",
  multi_family: "Multi-Family Home",
  land: "Lot",
  manufactured: "Manufactured Home",
};

/** Lower-case, for the middle of a sentence. */
const SINGULAR_LOWER: Record<PropertyType, string> = {
  single_family: "home",
  townhouse: "townhome",
  condo: "condo",
  villa: "villa",
  multi_family: "multi-family home",
  land: "lot",
  manufactured: "manufactured home",
};

/**
 * What the status means to somebody reading a search result.
 *
 * `active` is left blank on purpose: "for sale" belongs in the description's
 * opening clause where it reads as English, and a title that says
 * "… — For Sale" spends eleven of forty-three characters on the default case.
 */
const STATUS_LABEL: Record<string, string> = {
  pending: "Under Contract",
  coming_soon: "Coming Soon",
  sold: "Sold",
  off_market: "Off Market",
};

/**
 * The one qualifier a title is allowed to carry, and the order of preference.
 *
 * One, not all of them. "4 Bed Waterfront Pool New-Construction Home" is both
 * unreadable and longer than the title budget, and stacking qualifiers is the
 * exact pattern search engines treat as keyword stuffing. So the strongest
 * verified attribute wins and the rest are carried by the description and the
 * keyword set, which have room.
 *
 * Ordered by how much it changes what somebody is looking for: waterfront is a
 * different search from a pool, and both are different from how the house was
 * financed.
 */
function qualifierFor(facts: VocabFacts): { title: string; phrase: string } | null {
  if (facts.waterfront) return { title: "Waterfront", phrase: "waterfront" };
  if (facts.pool) return { title: "Pool", phrase: "pool" };
  if (facts.listingType === "new_construction") {
    return { title: "New-Construction", phrase: "new-construction" };
  }
  if (facts.listingType === "assumable") {
    return { title: "Assumable-Loan", phrase: "assumable-mortgage" };
  }
  if (facts.listingType === "va_eligible") return { title: "VA-Eligible", phrase: "VA-eligible" };
  return null;
}

/** The subset of a listing the vocabulary is derived from. */
export type VocabFacts = {
  propertyType: PropertyType;
  listingType: ListingType;
  status: string;
  pool: boolean;
  waterfront: boolean;
};

export type ListingVocab = {
  /** Title case, singular: "Townhome". */
  noun: string;
  /** Sentence case, singular: "townhome". */
  nounLower: string;
  /** Title case with the strongest verified qualifier: "Waterfront Home". */
  nounQualified: string;
  /** Sentence case, qualified: "waterfront home". */
  nounQualifiedLower: string;
  /** "Under Contract", "Sold", "Coming Soon" — empty for an active listing. */
  statusLabel: string;
  /** How the listing's availability reads mid-sentence. */
  availability: string;
  /** True while the property can still be bought. */
  forSale: boolean;
};

export function listingVocab(facts: VocabFacts): ListingVocab {
  const noun = SINGULAR[facts.propertyType] ?? "Home";
  const nounLower = SINGULAR_LOWER[facts.propertyType] ?? "home";
  const qualifier = qualifierFor(facts);
  const forSale = facts.status === "active" || facts.status === "coming_soon";

  return {
    noun,
    nounLower,
    nounQualified: qualifier ? `${qualifier.title} ${noun}` : noun,
    nounQualifiedLower: qualifier ? `${qualifier.phrase} ${nounLower}` : nounLower,
    statusLabel: STATUS_LABEL[facts.status] ?? "",
    /*
      The verb phrase, written so the sentence stays true as the status changes.
      A sold listing's page lives forever (CLAUDE.md § 3 rule 11) and must never
      keep saying "for sale" — that is a false statement to a search engine and
      a wasted click for a buyer.
    */
    availability:
      facts.status === "sold"
        ? "sold"
        : facts.status === "pending"
          ? "under contract"
          : facts.status === "coming_soon"
            ? "coming soon"
            : facts.status === "off_market"
              ? "off market"
              : "for sale",
    forSale,
  };
}

/* ── Places ───────────────────────────────────────────────────────────────── */

/**
 * "Lake Mary FL" — the form that matches how people search.
 *
 * Not "Lake Mary, Florida" in a title: the comma and the full state name cost
 * six characters out of a forty-three character budget and the abbreviated form
 * is what appears in the query. The description uses the full name, where it
 * reads better and there is room for it.
 */
export function placeShort(cityName: string): string {
  return `${cityName.trim()} FL`;
}

/**
 * Street suffixes and directionals, in the postal abbreviations.
 *
 * ── Why a title may abbreviate an address ─────────────────────────────────
 *
 * A title has forty-three characters. "4871 Southwest Conservation Ridge
 * Boulevard" is forty-three of them on its own, so the composer's last candidate
 * used to be the address ALONE — no city, no state, nothing a search could match
 * beyond the street. A listing whose title names no place is a listing competing
 * with every road of that name in the country.
 *
 * "4871 SW Conservation Ridge Blvd, Lake Mary" is forty-two characters, says the
 * same thing, and names the city. Nothing is lost: these are the abbreviations
 * the postal service uses and the ones the county records use, the description
 * still carries the address in full, and the structured data carries it as
 * separate `streetAddress` and `addressLocality` fields either way.
 */
const STREET_ABBREVIATIONS: [RegExp, string][] = [
  [/\bNortheast\b/gi, "NE"],
  [/\bNorthwest\b/gi, "NW"],
  [/\bSoutheast\b/gi, "SE"],
  [/\bSouthwest\b/gi, "SW"],
  [/\bNorth\b/gi, "N"],
  [/\bSouth\b/gi, "S"],
  [/\bEast\b/gi, "E"],
  [/\bWest\b/gi, "W"],
  [/\bBoulevard\b/gi, "Blvd"],
  [/\bStreet\b/gi, "St"],
  [/\bAvenue\b/gi, "Ave"],
  [/\bDrive\b/gi, "Dr"],
  [/\bRoad\b/gi, "Rd"],
  [/\bLane\b/gi, "Ln"],
  [/\bCourt\b/gi, "Ct"],
  [/\bCircle\b/gi, "Cir"],
  [/\bPlace\b/gi, "Pl"],
  [/\bTerrace\b/gi, "Ter"],
  [/\bParkway\b/gi, "Pkwy"],
  [/\bTrail\b/gi, "Trl"],
  [/\bHighway\b/gi, "Hwy"],
  [/\bSquare\b/gi, "Sq"],
  [/\bCrossing\b/gi, "Xing"],
  [/\bUnit\b/gi, "#"],
  [/\bApartment\b/gi, "#"],
];

/** The postal short form of an address. Only ever used where space is scarce. */
export function abbreviateAddress(address: string): string {
  let out = address.trim();
  for (const [pattern, replacement] of STREET_ABBREVIATIONS) {
    out = out.replace(pattern, replacement);
  }
  // "#" from "Unit 214B" must not leave a double space or a stray comma.
  return out.replace(/#\s+/g, "#").replace(/\s+/g, " ").trim();
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

/**
 * The shape of an article's own subject, for the title composer.
 *
 * `kind` decides whether a freshness signal is worth the characters. On a market
 * update the month IS the news, and both a human scanning results and an
 * assistant deciding which page to cite use it to tell this year's figures from
 * last year's. On an evergreen guide the same clause only makes the page look
 * older every month it is not touched.
 */
export const WANTS_FRESHNESS: Record<string, boolean> = {
  market_update: true,
  blog: false,
  guide: false,
};
