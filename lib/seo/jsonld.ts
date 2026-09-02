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

function postalAddress(settings?: SiteSettings): JsonLdObject | undefined {
  const a = siteConfig.contact.address;

  const street = settings?.address.street ?? (isPending(a.street) ? null : a.street);
  const postalCode =
    settings?.address.postalCode ?? (isPending(a.postalCode) ? null : a.postalCode);

  // A partial address is worse than none: an incomplete PostalAddress makes the
  // business look unverifiable rather than simply undisclosed.
  if (!street || !postalCode) return undefined;

  return {
    "@type": "PostalAddress",
    streetAddress: street,
    addressLocality: settings?.address.locality ?? a.locality,
    addressRegion: settings?.address.region ?? a.region,
    postalCode,
    addressCountry: a.country,
  };
}

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

export function agentJsonLd(settings?: SiteSettings): JsonLdObject {
  const address = postalAddress(settings);
  const links = sameAs(settings?.profiles);

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateAgent",
    "@id": AGENT_ID,
    name: siteConfig.name,
    alternateName: `${siteConfig.legalName} - ${siteConfig.name}`,
    description: siteConfig.positioning,
    url: siteConfig.url,
    logo: absolute("/icon.svg"),
    priceRange: "$$",
    ...(settings?.phone ?? !isPending(siteConfig.contact.phone)
      ? { telephone: settings?.phone ?? siteConfig.contact.phone }
      : {}),
    ...(settings?.email ?? !isPending(siteConfig.contact.email)
      ? { email: settings?.email ?? siteConfig.contact.email }
      : {}),
    ...(address ? { address } : {}),
    areaServed: allCities.map((c) => ({
      "@type": "City",
      name: c.name,
      containedInPlace: {
        "@type": "AdministrativeArea",
        name: `${c.county} County, Florida`,
      },
    })),
    knowsAbout: KNOWS_ABOUT,
    parentOrganization: {
      "@type": "RealEstateAgent",
      name: siteConfig.brokerage,
    },
    employee: { "@id": PERSON_ID },
    ...(links.length ? { sameAs: links } : {}),
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
    name: siteConfig.legalName,
    jobTitle: "Realtor and Certified Residential Building Contractor",
    description: siteConfig.positioning,
    url: absolute("/about"),
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
    ...(amenities.length ? { amenityFeature: amenities } : {}),
  };

  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    url: absolute(`/listing/${listing.slug}`),
    name: `${listing.address}, ${listing.city.name}, FL`,
    ...(listing.description ? { description: listing.description } : {}),
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
    },
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
