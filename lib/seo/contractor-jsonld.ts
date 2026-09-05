import { siteConfig } from "@/lib/site-config";

/**
 * Structured data for the contractor side of the business (brief §31).
 *
 * ── Which type, and why not the obvious one ───────────────────────────────
 *
 * §31 lists `Contractor` as a candidate. It is not a schema.org type — the real
 * one is `HomeAndConstructionBusiness`, with `GeneralContractor` beneath it.
 * `GeneralContractor` is the closer label and is deliberately not used: a
 * Florida Certified Residential Building Contractor licence is a RESIDENTIAL
 * classification, and "general contractor" is a different licence class in this
 * state. Claiming it in markup would be a licence misstatement, which matters
 * more than the marginal specificity.
 *
 * So: `HomeAndConstructionBusiness`, which is accurate, plus `Service` entries
 * for what is actually offered.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 *
 * §31 names them: no `aggregateRating`, no `review`, no `award`, no
 * `hasOfferCatalog` with prices. None of those has a verifiable source, and an
 * invented rating is the single most consequential fabrication available in
 * structured data — Google penalises it and a buyer relies on it.
 *
 * `priceRange` is also absent. It is a commonly-expected property and there is
 * no established pricing to state.
 */

type JsonLdObject = Record<string, unknown>;

const absolute = (path: string) =>
  `${siteConfig.url.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;

export function contractorJsonLd(input: {
  path: string;
  /** The service names actually listed on the page. */
  services: string[];
  /** The places actually named as served. */
  areas: string[];
}): JsonLdObject {
  const id = `${absolute(input.path)}#contractor`;

  return {
    "@context": "https://schema.org",
    "@type": "HomeAndConstructionBusiness",
    "@id": id,
    url: absolute(input.path),
    name: `${siteConfig.name} — Residential Construction`,
    description:
      "Residential remodeling, renovation and new construction in Lake Mary and Central Florida, by a Florida Certified Residential Building Contractor.",

    /*
      The licence, as a credential rather than as prose.

      `hasCredential` with an explicit `identifier` is what makes this
      checkable: the number resolves against the Florida DBPR register, which is
      the whole reason it is worth publishing.
    */
    hasCredential: {
      "@type": "EducationalOccupationalCredential",
      credentialCategory: "license",
      name: siteConfig.licenses.contractor.label,
      identifier: siteConfig.licenses.contractor.number,
      recognizedBy: {
        "@type": "Organization",
        name: siteConfig.licenses.contractor.authority,
      },
    },

    /*
      The person, linked rather than duplicated. `agentJsonLd` already publishes
      her as a RealEstateAgent with an @id; repeating her details here would
      create two entities for one person and let them disagree.
    */
    founder: { "@id": `${siteConfig.url.replace(/\/+$/, "")}/#person` },

    address: {
      "@type": "PostalAddress",
      addressLocality: siteConfig.contact.address.locality,
      addressRegion: siteConfig.contact.address.region,
      addressCountry: "US",
    },

    // Only what the page actually names (§20: no invented service areas).
    areaServed: input.areas.map((name) => ({ "@type": "City", name })),

    ...(input.services.length > 0
      ? {
          makesOffer: input.services.map((service) => ({
            "@type": "Offer",
            // No price, deliberately — see the note at the top.
            itemOffered: {
              "@type": "Service",
              name: service,
              serviceType: service,
              provider: { "@id": id },
              areaServed: input.areas.map((name) => ({ "@type": "City", name })),
            },
          })),
        }
      : {}),

    telephone: siteConfig.contact.phone,
    email: siteConfig.contact.email,
  };
}
