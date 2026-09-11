/**
 * Site-wide constants.
 *
 * Values marked PENDING are placeholders supplied by the developer until the
 * client provides the real ones. Every one of them is tracked in PROGRESS.md
 * under "Blocked on client content". Search this file for PENDING before
 * launch — `npm run check:pending` fails the build if any remain.
 *
 * In Phase 2 the contact and profile values move into the `site_settings`
 * table and are edited from Admin → Settings. This file stays as the fallback
 * and as the compile-time source for build-time metadata.
 */

export const PENDING = "PENDING" as const;

export const siteConfig = {
  name: "The House Boss",
  /**
   * The name exactly as licensed with the Florida DBPR (SL3327932), confirmed
   * by the client 2026-09-11. FREC advertising rules require this form in the
   * compliance footer, the legal pages and the disclaimers, and it is the
   * `name` on the Person JSON-LD so it matches the public licence register.
   */
  legalName: "Krasimira Kakarova",
  /**
   * The name she goes by and writes under — "I'm Krisi Kakarova" is her own
   * bio. Used for page titles, bylines and first-person copy, and published as
   * the Person `alternateName` so a search for either name reaches her.
   */
  knownAs: "Krisi Kakarova",
  brokerage: "World Properties Group",
  lockup: "The House Boss — Powered by World Properties Group",

  /**
   * Always set: `next.config.ts` resolves this at build time and re-exports it
   * through `env`, falling back to the Vercel deployment URL and then to
   * localhost. The literal below is therefore unreachable in any real build and
   * exists only so a bare `tsx`/`vitest` import outside Next has something
   * sane. Do NOT rely on it as the production default — a deployment that
   * genuinely lacked the variable would then claim the live domain's
   * canonicals while serving from somewhere else.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://thehousebossfl.com",
  locale: "en_US",
  timezone: "America/New_York",

  /** Used verbatim in hero copy, meta descriptions and Person JSON-LD. */
  positioning:
    "Lake Mary Realtor specializing in VA buyers, assumable mortgages and new-construction representation.",
  positioningShort:
    "Realtor and Certified Residential Building Contractor serving Central Florida.",

  licenses: {
    realEstate: {
      number: "SL3327932",
      label: "Licensed Real Estate Agent",
      authority: "Florida Department of Business and Professional Regulation",
    },
    contractor: {
      number: "CRC1335654",
      label: "Certified Residential Contractor",
      authority: "Florida Construction Industry Licensing Board",
    },
  },

  yearsExperience: 13,

  /*
    Supplied by the client, 2026-09-05. These were PENDING from Phase 0 and
    blocked `check:pending`, the WhatsApp button, the JSON-LD contact points and
    every `tel:`/`mailto:` link on the site.

    The street address and postcode are still outstanding and stay PENDING —
    they feed `PostalAddress` in the agent JSON-LD, and a partial address there
    is worse than none: it tells a search engine the wrong location for the
    business. `addressLocality` alone is valid schema, and that is what renders
    until the rest arrives.
  */
  contact: {
    phone: "+1 240 506 5959",
    phoneHref: "tel:+12405065959",
    email: "krisirealtor@gmail.com",
    address: {
      street: PENDING,
      locality: "Lake Mary",
      region: "FL",
      postalCode: PENDING,
      country: "US",
    },
    hours: "Monday–Saturday, 9am–7pm ET",
  },

  /*
    Google Business Profile — supplied by the client, 2026-09-11.

    Derived from the share link she sent rather than typed by hand. The `stick`
    parameter in a Google knowledge-panel URL is a gzipped protobuf carrying the
    Maps feature id (`0x…:0x…`); the second half, read as an unsigned 64-bit
    integer, is the CID, and the two halves packed as two fixed64 fields are the
    Place ID. The Place ID was then checked against Google, which resolved it
    back to the same feature id — so all three below point at one profile.

    It is a SERVICE-AREA business: no public street address, which is why the
    agent JSON-LD publishes locality + region + `areaServed` and no street, and
    why there is no map embed or "get directions" link anywhere on the site.

    `businessName` is the name exactly as it appears on the profile. The profile
    was listed as "The House Boss Florida"; on 2026-09-11 the client agreed to
    rename it to "The House Boss" so it matches the site (NAP consistency), and
    because Google's naming guidelines disallow a location appended to a name
    that is not part of the real business name. If the rename is ever reverted
    or rejected, put the profile's name back here — it then reappears in the
    agent's `alternateName` automatically.
  */
  google: {
    businessName: "The House Boss",
    placeId: "ChIJizFziLVk1WERLvMZJqLPqqE",
    cid: "11649351681478095662",
    featureId: "0x61d564b58873318b:0xa1aacfa22619f32e",
    /** The stable public link to the profile. Used for `hasMap` and `sameAs`. */
    mapsUrl: "https://maps.google.com/?cid=11649351681478095662",
    /** Opens Google's review composer for this profile directly. */
    reviewUrl:
      "https://search.google.com/local/writereview?placeid=ChIJizFziLVk1WERLvMZJqLPqqE",
  },

  /**
   * Lake Mary city centre — NOT her address.
   *
   * A service-area business must not publish its private location. The city
   * centre gives search engines the correct locality for `geo` and the geo
   * meta tags without disclosing where she lives.
   */
  geo: { latitude: 28.7589, longitude: -81.3178 },

  /**
   * Structured opening hours for `openingHoursSpecification`.
   *
   * Must agree with `contact.hours` (the human-readable line) and with the hours
   * on the Google Business Profile. The admin's free-text Office Hours field
   * changes the visible line only; if hours change, change this too.
   */
  openingHours: [
    {
      days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
  ],

  /** Counties served, for `areaServed` alongside the individual cities. */
  serviceCounties: ["Seminole", "Orange"],

  /* ── Profiles: feed the footer icons and the sameAs array in JSON-LD ── */
  profiles: {
    googleBusiness: "https://maps.google.com/?cid=11649351681478095662",
    realtorDotCom: PENDING,
    zillow: PENDING,
    facebook: PENDING,
    instagram: PENDING,
    linkedin: PENDING,
  } as Record<string, string>,

  /** Cities that appear in the search city filter (client-specified five). */
  searchCities: [
    { slug: "lake-mary", name: "Lake Mary", county: "Seminole" },
    { slug: "longwood", name: "Longwood", county: "Seminole" },
    { slug: "sanford", name: "Sanford", county: "Seminole" },
    { slug: "casselberry", name: "Casselberry", county: "Seminole" },
    { slug: "orlando", name: "Orlando", county: "Orange" },
  ],

  /** Additional cities that get a landing page but not a search filter. */
  contentCities: [
    {
      slug: "altamonte-springs",
      name: "Altamonte Springs",
      county: "Seminole",
    },
    { slug: "winter-springs", name: "Winter Springs", county: "Seminole" },
    { slug: "oviedo", name: "Oviedo", county: "Seminole" },
  ],
} as const;

export const allCities = [
  ...siteConfig.searchCities,
  ...siteConfig.contentCities,
];

/** True when a config value is still a developer placeholder. */
export function isPending(value: string): boolean {
  return value === PENDING;
}

/** Renders a value, or a neutral dash when the client has not supplied it. */
export function orDash(value: string): string {
  return isPending(value) ? "—" : value;
}
