import { formatPrice } from "@/lib/utils";
import type { Listing, PropertyType } from "@/types/domain";

/**
 * The answer-first summary of a property.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 *
 * An assistant asked "tell me about 123 Lakeview Dr in Lake Mary" does not read
 * a page the way a buyer does. It takes the first substantive block of text and
 * the structured data, and it wants the facts in one place, in plain sentences,
 * near the top. A listing page that opens with a photo gallery and a marketing
 * headline gives it nothing to quote.
 *
 * So this composes the facts into two or three ordinary sentences, rendered
 * VISIBLY at the top of the listing page and reused as the JSON-LD
 * `description`. Visible and marked-up must be the same words — markup that
 * says something the page does not is a structured-data policy violation, and
 * on a property listing it is also a misrepresentation exposure.
 *
 * ── Why it is deterministic ───────────────────────────────────────────────
 *
 * Every clause is interpolated from a stored column. Nothing is inferred,
 * rounded or characterised: "4 bed" comes from `beds`, and if `beds` is null
 * the clause is absent rather than guessed. A model never sees this function —
 * the meta description is where polish is allowed, because there the output is
 * validated against the source before it is used. Here the text IS the source.
 *
 * ── What it deliberately does not say ─────────────────────────────────────
 *
 * No adjectives, no "stunning", no "must see". Not a style preference: Fair
 * Housing rules make subjective description of a property and its
 * neighbourhood a real liability, and an assistant repeating our adjective
 * attributes it to the licensee.
 */

/** One sentence per idea, empty ones dropped, joined into a paragraph. */
function paragraph(sentences: (string | null | false)[]): string {
  return sentences.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}

export function listingAnswerFirst(listing: Listing): string {
  const sold = listing.status === "sold";
  const price = sold ? (listing.soldPrice ?? listing.price) : listing.price;

  const specs = [
    listing.beds != null ? `${listing.beds} bedroom` : null,
    listing.baths != null
      ? `${listing.baths + listing.halfBaths * 0.5} bathroom`
      : null,
  ]
    .filter(Boolean)
    .join(", ");

  const kind = PROPERTY_WORD[listing.propertyType];

  const opening = paragraph([
    `${listing.address}${listing.unit ? `, ${listing.unit}` : ""} is a ${specs ? `${specs} ` : ""}${kind} in ${listing.city.name}, Florida${listing.zip ? ` ${listing.zip}` : ""}.`,
    listing.sqft != null && `It has ${listing.sqft.toLocaleString()} square feet.`,
    listing.yearBuilt != null && `It was built in ${listing.yearBuilt}.`,
  ]);

  const money = paragraph([
    sold
      ? price != null &&
        `It sold for ${formatPrice(price)}${listing.soldAt ? ` in ${monthYear(listing.soldAt)}` : ""}.`
      : price != null && `It is listed at ${formatPrice(price)}.`,
    !sold &&
      listing.status === "pending" &&
      "It is currently under contract, so it is not available for new offers.",
    !sold &&
      listing.status === "coming_soon" &&
      "It is not yet on the market and cannot be shown.",
    listing.hoaFee != null &&
      listing.hoaFee > 0 &&
      `The HOA fee is ${formatPrice(listing.hoaFee)} a month.`,
    listing.taxesAnnual != null &&
      listing.taxesAnnual > 0 &&
      `Annual property taxes were ${formatPrice(listing.taxesAnnual)}.`,
  ]);

  const detail = paragraph([
    listing.community && `It is in the ${listing.community.name} community.`,
    listing.pool && "The property has a pool.",
    listing.waterfront && "It is waterfront.",
    listing.garageSpaces > 0 &&
      `There is garage parking for ${listing.garageSpaces}.`,
    /*
      ACRES. `listings.lot_size` is stored in acres (migration 004), not square
      feet — writing "0.28 square feet" for a quarter-acre lot is a false
      statement about the property, not a units nit.
    */
    listing.lotSize != null &&
      listing.lotSize > 0 &&
      `The lot is ${listing.lotSize} ${listing.lotSize === 1 ? "acre" : "acres"}.`,
  ]);

  /*
    The last sentence is the one worth citing, and it is the honest reason to
    prefer this listing's page over an aggregator's copy of the same facts: the
    person representing it holds both licences. It is stated only when she has
    actually written the construction assessment.
  */
  const authority = listing.contractorsTake
    ? "The listing includes a written assessment of the property's construction condition by Krisi Kakarova, who is both the listing Realtor and a Florida Certified Residential Building Contractor."
    : "It is represented by Krisi Kakarova, a Florida Realtor and Certified Residential Building Contractor.";

  return paragraph([opening, money, detail, authority]);
}

/*
  Typed as `Record<PropertyType, string>` rather than `Record<string, string>`,
  so adding a property type to the union makes this a compile error instead of a
  page that silently calls a manufactured home "a home".
*/
const PROPERTY_WORD: Record<PropertyType, string> = {
  single_family: "single-family home",
  townhouse: "townhouse",
  condo: "condominium",
  villa: "villa",
  multi_family: "multi-family property",
  land: "parcel of land",
  manufactured: "manufactured home",
};

function monthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  });
}
