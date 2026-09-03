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
  legalName: "Krisi Kakarova",
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

  /* ── PENDING: client to supply ─────────────────────────────────────── */
  contact: {
    phone: PENDING, // e.g. "+1 407 555 0142"
    phoneHref: PENDING, // e.g. "tel:+14075550142"
    email: PENDING, // e.g. "krisi@thehousebossfl.com"
    address: {
      street: PENDING,
      locality: "Lake Mary",
      region: "FL",
      postalCode: PENDING,
      country: "US",
    },
    hours: "Monday–Saturday, 9am–7pm ET",
  },

  /* ── PENDING: feeds the footer and the sameAs array in JSON-LD ─────── */
  profiles: {
    googleBusiness: PENDING,
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
