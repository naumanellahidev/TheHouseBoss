import { allCities, siteConfig } from "@/lib/site-config";

export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = { label: string; href?: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

/**
 * Primary navigation.
 *
 * Labels follow the client's rebrief: HOMES, COMMUNITIES, BUY, NEW
 * CONSTRUCTION, INSIGHTS, ABOUT. Buying is the transaction focus, so there is
 * no Sell entry anywhere in the chrome.
 *
 * `/sell-your-central-florida-home` still EXISTS and still 200s — HR11 says a
 * published URL is permanent, and it carries 420 lines of real content that is
 * indexed. Removing it from the navigation removes it from the product without
 * throwing away the indexation, which deleting the route would.
 */
export const primaryNav: NavEntry[] = [
  /*
    Home, and it is not the same thing as "Homes".

    "Homes" is a dropdown about property search, and its label is a trigger
    rather than a link — clicking it opens the menu. There was no way to get
    back to the landing page from the navigation at all except by clicking
    the logo, which is a convention rather than an affordance and is not one
    every visitor knows.
  */
  { href: "/", label: "Home" },
  {
    label: "Homes",
    href: "/search",
    items: [
      {
        href: "/search",
        label: "Central Florida Home Search",
        description: "Every listing, all filters",
      },
      {
        href: "/search/new-construction",
        label: "New Construction",
        description: "Builder inventory and pre-construction",
      },
      {
        href: "/sold",
        label: "Recently Sold",
        description: "Closed transactions",
      },
    ],
  },
  {
    label: "Communities",
    href: "/lake-mary",
    items: [
      {
        href: "/lake-mary",
        label: "Lake Mary",
        description: "The flagship market",
      },
      { href: "/lake-mary/homes-for-sale", label: "Lake Mary Homes for Sale" },
      { href: "/lake-mary/communities", label: "Lake Mary Communities" },
      ...allCities
        .filter((c) => c.slug !== "lake-mary")
        .map((c) => ({ href: `/${c.slug}`, label: c.name })),
    ],
  },
  {
    label: "Buy",
    href: "/guides",
    items: [
      {
        href: "/guides/va-home-buyer",
        label: "VA Home-Buyer Guide",
        description: "Entitlement, zero down, MPRs",
      },
      {
        href: "/assumable-mortgage-homes",
        label: "Assumable Mortgage Homes",
        description: "Take over a lower rate",
      },
      {
        href: "/hire-contractor",
        label: "Hire Contractor",
        description: "Remodeling, renovation and new construction",
      },
    ],
  },
  {
    /*
      "Hire Contractor", not "New Construction".

      The old label described one guide. This route is now the contractor side
      of the business — a service landing page, not a buyer guide — and the nav
      label is what tells a visitor that side exists at all.
    */
    href: "/hire-contractor",
    label: "Hire Contractor",
  },
  { href: "/market-updates", label: "Insights" },
  /*
    Reviews is in the header as well as the footer.

    It was footer-only, which is where a page goes when nobody is expected to
    look for it. Now that a visitor can write one, the page has to be reachable
    from the same chrome the button lives in — and social proof is a page people
    do go looking for.
  */
  { href: "/reviews", label: "Reviews" },
  { href: "/about", label: "About" },
];

/** Footer columns. Column 1 is the brand block, rendered separately. */
export const footerNav: { heading: string; items: NavLink[] }[] = [
  {
    heading: "Search",
    items: [
      { href: "/search", label: "All Homes" },
      { href: "/search/new-construction", label: "New Construction" },
      ...siteConfig.searchCities.map((c) => ({
        href: `/${c.slug}/homes-for-sale`,
        label: `${c.name} Homes`,
      })),
      { href: "/sold", label: "Recently Sold" },
    ],
  },
  {
    heading: "Guides",
    items: [
      { href: "/guides/va-home-buyer", label: "VA Home-Buyer Guide" },
      { href: "/assumable-mortgage-homes", label: "Assumable Mortgages" },
      { href: "/hire-contractor", label: "Hire Contractor" },
      { href: "/market-updates", label: "Insights" },
    ],
  },
  {
    heading: "Company",
    items: [
      { href: "/about", label: "About Krisi" },
      { href: "/lake-mary", label: "Lake Mary" },
      { href: "/lake-mary/communities", label: "Communities" },
      { href: "/reviews", label: "Reviews" },
      { href: "/contact", label: "Contact" },
    ],
  },
];

export const legalNav: NavLink[] = [
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/terms", label: "Terms of Use" },
  { href: "/legal/accessibility", label: "Accessibility" },
];
