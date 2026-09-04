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
        href: "/new-construction-representation",
        label: "New-Construction Representation",
        description: "Why you need your own agent",
      },
    ],
  },
  {
    href: "/new-construction-representation",
    label: "New Construction",
  },
  { href: "/market-updates", label: "Insights" },
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
      {
        href: "/new-construction-representation",
        label: "New-Construction Representation",
      },
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
