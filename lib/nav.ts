import { allCities, siteConfig } from "@/lib/site-config";

export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = { label: string; href?: string; items: NavLink[] };
export type NavEntry = NavLink | NavGroup;

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "items" in entry;
}

/** Primary navigation. Mirrors docs/05-page-specs.md § Global chrome. */
export const primaryNav: NavEntry[] = [
  {
    label: "Search",
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
    label: "Lake Mary",
    href: "/lake-mary",
    items: [
      { href: "/lake-mary", label: "Lake Mary Guide" },
      { href: "/lake-mary/homes-for-sale", label: "Homes for Sale" },
      { href: "/lake-mary/communities", label: "Communities" },
      { href: "/lake-mary/blog", label: "Lake Mary Blog" },
    ],
  },
  {
    label: "Cities",
    items: allCities
      .filter((c) => c.slug !== "lake-mary")
      .map((c) => ({ href: `/${c.slug}`, label: c.name })),
  },
  {
    label: "Guides",
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
      {
        href: "/sell-your-central-florida-home",
        label: "Sell Your Home",
        description: "Pricing, prep and process",
      },
    ],
  },
  { href: "/market-updates", label: "Market Updates" },
  { href: "/about", label: "About" },
  { href: "/reviews", label: "Reviews" },
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
      { href: "/sell-your-central-florida-home", label: "Sell Your Home" },
      { href: "/market-updates", label: "Market Updates" },
    ],
  },
  {
    heading: "Company",
    items: [
      { href: "/about", label: "About Krisi" },
      { href: "/lake-mary", label: "Lake Mary Guide" },
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
