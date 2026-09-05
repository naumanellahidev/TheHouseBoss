/**
 * Service landing pages the SEO engine knows about (brief §23, §33).
 *
 * ── Why this list exists in code ──────────────────────────────────────────
 *
 * A service page is a route, not a record, so nothing in the database can tell
 * the engine that `/hire-contractor` exists or what it offers. This is the
 * smallest declaration that closes that gap: the path, the city it leads with,
 * and the services it actually names.
 *
 * ── Why the phrases are here rather than derived from the page ────────────
 *
 * They are how a BUYER types the service, which is not how the page titles it.
 * The page says "Residential remodeling" as a heading; somebody looking to hire
 * types "remodeling contractor". Deriving keywords from headings would target
 * the words we chose rather than the words they use.
 *
 * Every phrase still has to survive `validateKeywords`, and every place still
 * comes from the geo graph — this list supplies the service half only.
 */

export type ServicePage = {
  path: string;
  /** The city the page leads with. Must exist in the geo graph. */
  citySlug: string;
  /** The one phrase the page is most trying to be found for. */
  primaryService: string;
  /** The others it legitimately offers, as a searcher would phrase them. */
  services: string[];
};

export const SERVICE_PAGES: ServicePage[] = [
  {
    path: "/hire-contractor",
    citySlug: "lake-mary",
    primaryService: "residential contractor",
    /*
      Only what the page lists. §22 forbids service-area and service claims
      that are not genuinely applicable, and the check is simple: if the page
      does not offer it, it is not here.
    */
    services: [
      "remodeling contractor",
      "home renovation",
      "residential remodeling",
      "new construction",
      "construction consulting",
    ],
  },
];
