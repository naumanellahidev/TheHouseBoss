import { keyUrl } from "@/lib/storage/url";
import { absolute } from "@/lib/seo/metadata";
import { allCities, isPending, siteConfig } from "@/lib/site-config";
import type { Crumb } from "@/components/site/breadcrumbs";
import type { FaqItem, Listing, SiteSettings } from "@/types/domain";

/**
 * Structured data builders — docs/08-seo-ai-visibility.md § 6.
 *
 * Never hand-write a JSON-LD blob in a component. Every builder returns a plain
 * object; the page renders it through <JsonLd />.
 *
 * The most valuable markup on this site is the two `hasCredential` entries in
 * `personJsonLd`. They are a machine-readable, verifiable statement of exactly
 * what makes her different from every other agent in the market. Never drop or
 * abbreviate them.
 */

export const AGENT_ID = `${siteConfig.url}/#agent`;
export const PERSON_ID = `${siteConfig.url}/#krisi`;
export const WEBSITE_ID = `${siteConfig.url}/#website`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLdObject = Record<string, any>;

/**
 * Live profile URLs only — a `sameAs` full of placeholders is worse than none.
 *
 * Profiles edited in Admin → Settings win over the compile-time fallback, so
 * adding a Zillow link takes effect without a deploy. `sameAs` is how a search
 * engine or an assistant connects this site to her Google and Zillow presence,
 * which makes it one of the higher-value things on the Settings screen.
 */
function sameAs(overrides?: Record<string, string>): string[] {
  const merged = { ...siteConfig.profiles, ...(overrides ?? {}) };
  return Object.values(merged).filter((url) => url && !isPending(url));
}

/**
 * The business address, shaped for a SERVICE-AREA business.
 *
 * Her Google Business Profile hides its street address, as Google requires of
 * a business that goes to its customers. The schema has to say the same thing
 * the profile says: locality, region and country, and no street. That is not a
 * "partial" address — it is the complete public address of a service-area
 * business, and it is what lets Google reconcile this site with the profile.
 *
 * A street and postcode are added only if the client ever opens a public
 * office and both are supplied; one without the other is never emitted, since
 * a street with no postcode geocodes badly.
 */
function postalAddress(settings?: SiteSettings): JsonLdObject {
  const a = siteConfig.contact.address;

  const street = settings?.address.street ?? (isPending(a.street) ? null : a.street);
  const postalCode =
    settings?.address.postalCode ?? (isPending(a.postalCode) ? null : a.postalCode);

  return {
    "@type": "PostalAddress",
    ...(street && postalCode ? { streetAddress: street, postalCode } : {}),
    addressLocality: settings?.address.locality ?? a.locality,
    addressRegion: settings?.address.region ?? a.region,
    addressCountry: a.country,
  };
}

/**
 * The services she offers, each pointing at the page that describes it.
 *
 * `hasOfferCatalog` is how a LocalBusiness tells a search engine what it does,
 * rather than leaving it to infer from prose. Every entry has a real page
 * behind it — a service with no page is a claim nothing on the site supports.
 */
const SERVICES: { name: string; path: string; description: string }[] = [
  {
    name: "VA home buyer representation",
    path: "/guides/va-home-buyer",
    description:
      "Buyer representation for VA-eligible buyers, including a licensed contractor's read on Minimum Property Requirement risk before an offer.",
  },
  {
    name: "Assumable mortgage home search",
    path: "/assumable-mortgage-homes",
    description:
      "Finding and buying homes with an assumable VA, FHA or USDA loan in Central Florida.",
  },
  {
    name: "New-construction buyer representation",
    path: "/search/new-construction",
    description:
      "Independent representation at the builder's sales office, contract review and construction-phase walkthroughs.",
  },
  {
    name: "Home seller representation",
    path: "/sell-your-central-florida-home",
    description:
      "Listing and selling Central Florida homes, with pre-listing repair advice from a licensed contractor.",
  },
  {
    name: "Residential construction and remodeling",
    path: "/hire-contractor",
    description:
      "Remodeling, renovation and construction consulting by a Florida Certified Residential Building Contractor.",
  },
];

const DAY_URI: Record<string, string> = {
  Monday: "https://schema.org/Monday",
  Tuesday: "https://schema.org/Tuesday",
  Wednesday: "https://schema.org/Wednesday",
  Thursday: "https://schema.org/Thursday",
  Friday: "https://schema.org/Friday",
  Saturday: "https://schema.org/Saturday",
  Sunday: "https://schema.org/Sunday",
};

const KNOWS_ABOUT = [
  "VA home loans",
  "VA Minimum Property Requirements",
  "Assumable mortgages",
  "New construction buyer representation",
  "Residential remodeling",
  "Construction consulting",
  "Lake Mary real estate",
  "Seminole County real estate",
  "Central Florida real estate",
];

/* ── RealEstateAgent — root layout ──────────────────────────────────────── */

/**
 * The local-business entity. Rendered on every public page by the marketing
 * layout, so it is present wherever a crawler lands.
 *
 * `RealEstateAgent` is itself a `LocalBusiness` subtype in schema.org, so every
 * LocalBusiness property below is valid on it without a second @type.
 *
 * What ties this to her Google Business Profile, in order of weight:
 *   1. `hasMap` and `sameAs` — the profile's own CID URL
 *   2. `telephone` — must match the profile digit for digit
 *   3. `address` — locality/region matching the profile's service area
 *   4. `name` / `alternateName` — the profile name is listed verbatim
 *
 * Deliberately absent: `aggregateRating` and `review`. Google does not show
 * stars for a business's reviews of itself, and publishing a rating the site
 * computes about its own owner is exactly the self-serving markup its review
 * policy excludes (docs/09 § 7).
 */
export function agentJsonLd(settings?: SiteSettings): JsonLdObject {
  const links = sameAs(settings?.profiles);
  const { google, geo, openingHours, serviceCounties } = siteConfig;

  const phone =
    settings?.phone ?? (isPending(siteConfig.contact.phone) ? null : siteConfig.contact.phone);
  const email =
    settings?.email ?? (isPending(siteConfig.contact.email) ? null : siteConfig.contact.email);

  /*
    Google requires a raster logo of at least 112px — an SVG is ignored. The
    uploaded logo is preferred; the app icon is the fallback that always exists.
  */
  const logo = settings?.logoKey
    ? keyUrl(settings.logoKey, 800)
    : absolute("/apple-icon.png");

  /* A LocalBusiness wants an image of the business. Her portrait is the business. */
  const image = settings?.portraitKey
    ? keyUrl(settings.portraitKey, 1600)
    : settings?.ogKey
      ? keyUrl(settings.ogKey, 1600)
      : absolute("/opengraph-image");

  const names = [
    google.businessName,
    `${siteConfig.knownAs} - ${siteConfig.name}`,
    `${siteConfig.legalName} - ${siteConfig.name}`,
    siteConfig.lockup,
  ].filter((n) => n !== siteConfig.name);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": AGENT_ID,
    name: siteConfig.name,
    alternateName: [...new Set(names)],
    description: siteConfig.positioning,
    slogan: siteConfig.positioning,
    url: siteConfig.url,
    logo,
    image,
    priceRange: "$$",
    ...(phone ? { telephone: phone } : {}),
    ...(email ? { email } : {}),

    address: postalAddress(settings),
    geo: {
      "@type": "GeoCoordinates",
      latitude: geo.latitude,
      longitude: geo.longitude,
    },
    hasMap: google.mapsUrl,

    openingHoursSpecification: openingHours.map((h) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: h.days.map((d) => DAY_URI[d]),
      opens: h.opens,
      closes: h.closes,
    })),

    areaServed: [
      ...allCities.map((c) => ({
        "@type": "City",
        name: c.name,
        containedInPlace: {
          "@type": "AdministrativeArea",
          name: `${c.county} County, Florida`,
        },
      })),
      ...serviceCounties.map((county) => ({
        "@type": "AdministrativeArea",
        name: `${county} County, Florida`,
      })),
    ],

    ...(phone || email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(phone ? { telephone: phone } : {}),
            ...(email ? { email } : {}),
            areaServed: "US-FL",
            availableLanguage: ["English"],
          },
        }
      : {}),

    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Real estate and residential construction services",
      itemListElement: SERVICES.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          description: s.description,
          url: absolute(s.path),
          provider: { "@id": AGENT_ID },
        },
      })),
    },

    identifier: [
      {
        "@type": "PropertyValue",
        propertyID: "Google Place ID",
        value: google.placeId,
      },
      {
        "@type": "PropertyValue",
        propertyID: "Florida real estate license",
        value: siteConfig.licenses.realEstate.number,
      },
      {
        "@type": "PropertyValue",
        propertyID: "Florida Certified Residential Contractor license",
        value: siteConfig.licenses.contractor.number,
      },
    ],

    knowsAbout: KNOWS_ABOUT,
    knowsLanguage: "en",
    parentOrganization: {
      "@type": "RealEstateAgent",
      name: siteConfig.brokerage,
    },
    founder: { "@id": PERSON_ID },
    employee: { "@id": PERSON_ID },
    ...(links.length ? { sameAs: links } : {}),
  };
}

/**
 * ContactPage — the /contact page, pointing at the business rather than
 * restating it. The contact details live once, on the agent entity.
 */
export function contactPageJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    url: absolute("/contact"),
    name: `Contact ${siteConfig.name}`,
    about: { "@id": AGENT_ID },
    mainEntity: { "@id": AGENT_ID },
  };
}

/* ── Person — /about, the entity page ───────────────────────────────────── */

export function personJsonLd(settings?: SiteSettings): JsonLdObject {
  const links = sameAs(settings?.profiles);
  const { realEstate, contractor } = siteConfig.licenses;

  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "@id": PERSON_ID,
    // The licensed name, so the entity matches the DBPR register; the name she
    // goes by rides along so a search for "Krisi Kakarova" resolves here too.
    name: siteConfig.legalName,
    alternateName: siteConfig.knownAs,
    givenName: siteConfig.legalName.split(" ")[0],
    familyName: siteConfig.legalName.split(" ").slice(1).join(" "),
    jobTitle: "Realtor and Certified Residential Building Contractor",
    description: siteConfig.positioning,
    url: absolute("/about"),
    /*
      Her own photograph, when one has been uploaded (migration 023).

      `image` on a Person is what lets a knowledge panel or an AI assistant show
      a face against the name, and it is the one image on this site that is
      genuinely about the entity rather than about a property. Omitted entirely
      when nothing is uploaded — a Person pointing at the site's OG card would
      be a picture of a house presented as a picture of a person.
    */
    ...(settings?.portraitKey
      ? { image: keyUrl(settings.portraitKey, 1600) }
      : {}),
    worksFor: { "@type": "Organization", name: siteConfig.brokerage },
    // The highest-value markup on the site. Do not remove.
    hasCredential: [
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Real Estate License",
        identifier: realEstate.number,
        recognizedBy: {
          "@type": "GovernmentOrganization",
          name: realEstate.authority,
        },
      },
      {
        "@type": "EducationalOccupationalCredential",
        credentialCategory: "Certified Residential Building Contractor License",
        identifier: contractor.number,
        recognizedBy: {
          "@type": "GovernmentOrganization",
          name: contractor.authority,
        },
      },
    ],
    knowsAbout: KNOWS_ABOUT,
    ...(links.length ? { sameAs: links } : {}),
  };
}

/* ── WebSite + SearchAction — root layout ───────────────────────────────── */

export function websiteJsonLd(): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: siteConfig.url,
    name: siteConfig.name,
    publisher: { "@id": AGENT_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/* ── BreadcrumbList ─────────────────────────────────────────────────────── */

/**
 * Built from the SAME array the visible <Breadcrumbs /> renders, so the two can
 * never disagree.
 */
export function breadcrumbJsonLd(items: Crumb[]): JsonLdObject {
  const trail = [{ href: "/", label: "Home" }, ...items];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      item: absolute(c.href),
    })),
  };
}

/* ── FAQPage ────────────────────────────────────────────────────────────── */

/**
 * Only ever called with the same `items` the accordion renders. Marking up a
 * question that is not visible on the page is a policy violation.
 */
export function faqJsonLd(items: FaqItem[]): JsonLdObject | null {
  if (items.length === 0) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/* ── Article ────────────────────────────────────────────────────────────── */

export function articleJsonLd(a: {
  title: string;
  description: string;
  path: string;
  image?: string;
  publishedAt?: string | null;
  modifiedAt?: string | null;
  wordCount?: number;
  section?: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": absolute(a.path) },
    image: a.image ? absolute(a.image) : `${siteConfig.url}/opengraph-image`,
    author: { "@id": PERSON_ID },
    publisher: { "@id": AGENT_ID },
    ...(a.publishedAt ? { datePublished: a.publishedAt } : {}),
    ...(a.modifiedAt ? { dateModified: a.modifiedAt } : {}),
    ...(a.wordCount ? { wordCount: a.wordCount } : {}),
    ...(a.section ? { articleSection: a.section } : {}),
  };
}

/* ── Service — the guide pages describe services, not just topics ───────── */

export function serviceJsonLd(s: {
  name: string;
  description: string;
  path: string;
  serviceType: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: s.name,
    description: s.description,
    serviceType: s.serviceType,
    url: absolute(s.path),
    provider: { "@id": AGENT_ID },
    areaServed: allCities.map((c) => ({ "@type": "City", name: c.name })),
  };
}

/* ── RealEstateListing — /listing/[slug] ────────────────────────────────── */

/**
 * `property_type` → the schema type that describes the building
 * (docs/08 § 6). A condo is an Apartment; a townhouse is a House; anything
 * unmapped falls back to the generic Residence rather than claiming a shape
 * the property may not have.
 */
const RESIDENCE_TYPE: Record<string, string> = {
  single_family: "SingleFamilyResidence",
  condo: "Apartment",
  townhouse: "House",
  villa: "House",
  multi_family: "ApartmentComplex",
  manufactured: "Residence",
  land: "Residence",
};

export function listingJsonLd(
  listing: Listing,
  imageUrls: string[],
  /**
   * The summary rendered visibly on the page (`lib/seo/auto/answer-first.ts`).
   *
   * Passed in rather than generated here, so the markup and the page carry the
   * SAME string by construction. Structured data that describes something the
   * page does not show is a policy violation, and on a property listing it is
   * also a misrepresentation exposure — which is why this is a parameter and
   * not a second call to the generator.
   */
  answerFirst?: string,
): JsonLdObject {
  const sold = listing.status === "sold";

  const address: JsonLdObject = {
    "@type": "PostalAddress",
    streetAddress: listing.unit
      ? `${listing.address}, ${listing.unit}`
      : listing.address,
    addressLocality: listing.city.name,
    addressRegion: "FL",
    addressCountry: "US",
    ...(listing.zip ? { postalCode: listing.zip } : {}),
  };

  const amenities = [
    listing.pool ? { name: "Pool", value: true } : null,
    listing.waterfront ? { name: "Waterfront", value: true } : null,
    listing.garageSpaces > 0
      ? { name: "Garage", value: listing.garageSpaces }
      : null,
  ]
    .filter(Boolean)
    .map((a) => ({ "@type": "LocationFeatureSpecification", ...a }));

  const residence: JsonLdObject = {
    "@type": RESIDENCE_TYPE[listing.propertyType] ?? "Residence",
    address,
    ...(listing.lat != null && listing.lng != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: listing.lat,
            longitude: listing.lng,
          },
        }
      : {}),
    ...(listing.beds != null ? { numberOfBedrooms: listing.beds } : {}),
    ...(listing.baths != null
      ? { numberOfBathroomsTotal: listing.baths + listing.halfBaths * 0.5 }
      : {}),
    ...(listing.sqft != null
      ? {
          floorSize: {
            "@type": "QuantitativeValue",
            value: listing.sqft,
            // FTK is the UN/CEFACT code for square feet. "sqft" is not valid.
            unitCode: "FTK",
          },
        }
      : {}),
    ...(listing.yearBuilt != null ? { yearBuilt: listing.yearBuilt } : {}),
    ...(listing.lotSize != null && listing.lotSize > 0
      ? {
          lotSize: {
            "@type": "QuantitativeValue",
            value: listing.lotSize,
            /*
              ACR, not FTK. `listings.lot_size` is stored in ACRES — the column
              comment in migration 004 says so — while `sqft` above is square
              feet, and reusing FTK here published "0.28 square feet" for a
              quarter-acre lot. On a property listing that is not a formatting
              slip; it is a false statement of fact about the property.
            */
            unitCode: "ACR",
          },
        }
      : {}),
    /*
      `containedInPlace` names the city as a place, which is what lets an
      assistant connect this property to "homes in Lake Mary" rather than
      treating the city as a word in an address string. Cheap, and it is the
      single most useful relationship on the graph for the question this site
      exists to be the answer to.
    */
    containedInPlace: {
      "@type": "City",
      name: listing.city.name,
      address: {
        "@type": "PostalAddress",
        addressLocality: listing.city.name,
        addressRegion: "FL",
        addressCountry: "US",
      },
    },
    ...(amenities.length ? { amenityFeature: amenities } : {}),
    /*
      Fees and taxes as `additionalProperty`, because schema.org has no field
      for either on a Residence and inventing one puts an unparsed key in the
      graph. `PropertyValue` is the documented way to carry a fact that has no
      dedicated property, and it keeps the number machine-readable rather than
      buried in prose.
    */
    ...(listing.hoaFee != null && listing.hoaFee > 0
      ? {
          additionalProperty: [
            {
              "@type": "PropertyValue",
              name: "HOA fee",
              value: listing.hoaFee,
              unitText: "USD per month",
            },
            ...(listing.taxesAnnual != null && listing.taxesAnnual > 0
              ? [
                  {
                    "@type": "PropertyValue",
                    name: "Annual property taxes",
                    value: listing.taxesAnnual,
                    unitText: "USD per year",
                  },
                ]
              : []),
          ],
        }
      : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url: absolute(`/listing/${listing.slug}`),
    name: `${listing.address}, ${listing.city.name}, FL`,
    /*
      The answer-first summary is the description, in preference to the agent's
      marketing copy. It states the facts in plain sentences and is the text
      actually rendered at the top of the page; the marketing description is
      written to persuade a buyer and is a poor answer to "what is this
      property". The marketing copy is still on the page, and still indexed.
    */
    description: answerFirst || listing.description || undefined,
    ...(listing.mlsNumber
      ? {
          // The MLS number is the identifier every other system knows this
          // property by, which is what makes it worth publishing: it is how an
          // assistant reconciles this page with an aggregator's copy.
          identifier: {
            "@type": "PropertyValue",
            propertyID: "MLS",
            value: listing.mlsNumber,
          },
        }
      : {}),
    ...(listing.publishedAt ? { datePosted: listing.publishedAt } : {}),
    // Up to six; more is noise and inflates the page weight for no gain.
    ...(imageUrls.length ? { image: imageUrls.slice(0, 6) } : {}),
    offers: {
      "@type": "Offer",
      price: sold ? (listing.soldPrice ?? listing.price) : listing.price,
      priceCurrency: "USD",
      // A sold listing keeps its page forever (HR10/HR11), so the markup has to
      // say plainly that it is no longer for sale.
      availability: sold
        ? "https://schema.org/SoldOut"
        : listing.status === "pending"
          ? "https://schema.org/LimitedAvailability"
          : "https://schema.org/InStock",
      seller: { "@id": AGENT_ID },
      ...(listing.publishedAt ? { validFrom: listing.publishedAt } : {}),
    },
    // Both, deliberately: `provider` is who is offering the service of
    // representing this property, which is the relationship a "who should I
    // call about this house" question is actually asking about.
    provider: { "@id": AGENT_ID },
    mainEntity: residence,
  };
}

/* ── ItemList — search and index pages ──────────────────────────────────── */

/**
 * Marks up a RESULT SET, not the properties themselves: each entry is a URL an
 * assistant can follow. Emitting the full listing graph for 24 cards would
 * duplicate every listing page's markup on a page that is `noindex` half the
 * time.
 */
export function listingItemListJsonLd(
  items: { slug: string; address: string }[],
  path: string,
): JsonLdObject | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    url: absolute(path),
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.address,
      url: absolute(`/listing/${item.slug}`),
    })),
  };
}

/* ── Place — city and community pages ───────────────────────────────────── */

/**
 * A city or community page describes a PLACE, and the agent serves it.
 *
 * `Place` rather than `City`: schema.org's City is for the municipality itself,
 * and this page is a guide to it written by an agent — conflating the two would
 * claim the site is an authority on the city rather than on its property market.
 * The `areaServed` link back to the agent is what carries that relationship.
 */
/**
 * The local-SEO half of a city or community page.
 *
 * `placeJsonLd` describes the place; on its own it says nothing about who
 * serves it. This ties the page to the business: a Service, provided by the
 * agent entity (by @id, not restated), with `areaServed` set to exactly this
 * place. It is what lets "real estate agent in Sanford" resolve to a page that
 * is explicitly about Sanford rather than only to the site-wide entity, whose
 * `areaServed` lists all eight cities at once.
 */
export function placeServiceJsonLd(place: {
  name: string;
  path: string;
  /** Present for a community: the city it sits in. */
  city?: string | null;
  county?: string | null;
}): JsonLdObject {
  const where = place.city ? `${place.name}, ${place.city}` : place.name;
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Real estate services in ${where}, Florida`,
    serviceType: "Real estate agent",
    url: absolute(place.path),
    provider: { "@id": AGENT_ID },
    areaServed: {
      "@type": place.city ? "Place" : "City",
      name: place.name,
      ...(place.city || place.county
        ? {
            containedInPlace: {
              "@type": place.city ? "City" : "AdministrativeArea",
              name: place.city ?? `${place.county} County, Florida`,
            },
          }
        : {}),
    },
  };
}

export function placeJsonLd(place: {
  name: string;
  slug: string;
  county?: string;
  metaDesc?: string | null;
  introMd?: string | null;
}): JsonLdObject {
  const description =
    place.metaDesc ??
    place.introMd?.replace(/[#*_>[\]()]/g, "").split("\n")[0]?.slice(0, 300) ??
    undefined;

  return {
    "@context": "https://schema.org",
    "@type": "Place",
    name: place.name,
    url: absolute(`/${place.slug}`),
    ...(description ? { description } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: place.name,
      addressRegion: "FL",
      addressCountry: "US",
    },
    ...(place.county
      ? {
          containedInPlace: {
            "@type": "AdministrativeArea",
            name: `${place.county} County, Florida`,
          },
        }
      : {}),
  };
}
