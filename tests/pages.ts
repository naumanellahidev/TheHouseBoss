/**
 * Routes covered by the responsive and accessibility suites.
 *
 * Add every new public page here as it ships. `docs/13-qa-checklists.md` § 3
 * lists the full target set — entries are uncommented as their phase lands.
 */
export type TestPage = {
  path: string;
  name: string;
  /**
   * Specimen pages deliberately render undersized controls to document them
   * (the styleguide shows the 36px `sm` button). Target-size assertions are
   * skipped there; they still run on every real page.
   */
  specimen?: boolean;
  /** Routes outside the (marketing) group have no skip link. */
  noChrome?: boolean;
};

export const PAGES: TestPage[] = [
  { path: "/", name: "home" },
  {
    path: "/dev/styleguide",
    name: "styleguide",
    specimen: true,
    noChrome: true,
  },

  // Phase 3
  { path: "/search", name: "search" },
  { path: "/search/new-construction", name: "search-new-construction" },
  { path: "/listing/123-lakeview-dr-lake-mary", name: "listing" },
  { path: "/listing/41-longwood-oaks-ave-longwood", name: "listing-sold" },
  { path: "/sold", name: "sold" },
  { path: "/lake-mary/homes-for-sale", name: "lake-mary-homes" },

  // Phase 4
  // { path: "/lake-mary", name: "lake-mary" },
  // { path: "/lake-mary/communities", name: "lake-mary-communities" },
  // { path: "/communities/heathrow", name: "heathrow" },
  // { path: "/longwood", name: "longwood" },
  // { path: "/market-updates", name: "market-updates" },

  // Phase 5
  { path: "/about", name: "about" },
  { path: "/guides/va-home-buyer", name: "va-guide" },
  // { path: "/assumable-mortgage-homes", name: "assumable" },
  // { path: "/new-construction-representation", name: "new-construction" },
  // { path: "/sell-your-central-florida-home", name: "sell" },
  // { path: "/reviews", name: "reviews" },
  // { path: "/contact", name: "contact" },
];

/** 360 is the hard floor — docs/04-responsive-spec.md § 1. */
export const WIDTHS = [360, 390, 414, 480, 768, 834, 1024, 1280, 1440] as const;

/**
 * Below 1024px is treated as a touch viewport, where the 44x44 minimum from
 * docs/04-responsive-spec.md § 2 applies. At and above 1024px the floor is the
 * WCAG 2.2 AA minimum of 24px, which is what makes the 36px `sm` button legal
 * in admin tables on a laptop.
 */
export const TOUCH_MAX_WIDTH = 1024;
export const MIN_TARGET_TOUCH = 44;
export const MIN_TARGET_POINTER = 24;
