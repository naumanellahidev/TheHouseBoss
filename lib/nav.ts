import { allCities, siteConfig } from "@/lib/site-config";

export type NavLink = { href: string; label: string; description?: string };
export type NavGroup = {
  label: string;
  /** Where the group's own label goes. The chevron beside it opens the menu. */
  href?: string;
  /** How that destination is named inside the mobile menu. Defaults to "All {label}". */
  hrefLabel?: string;
  items: NavLink[];
};
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
    "Homes" IS the way home.

    There used to be a separate "Home" item beside it, because the Homes label
    was only a dropdown trigger and the landing page was otherwise reachable
    only through the logo. Two items a letter apart read as a mistake (client,
    2026-09-13). Every group label is now a link in its own right with the
    chevron opening its menu, so Homes links to the home page and the search
    pages stay one hover away underneath it.
  */
  {
    label: "Homes",
    href: "/",
    hrefLabel: "Home page",
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
  /*
    "Articles", where "Communities" used to be (client, 2026-09-30).

    The old group was a list of PLACES under a label about places, and the
    writing was reachable only through two items named after their format —
    "Insights" for market updates and a Lake Mary blog nobody else's city had.
    Somebody wondering what she has written about Sanford had nowhere to go.

    So the slot now leads to `/articles` and the menu is one entry per city,
    each landing on that city's own writing. The city GUIDES did not lose their
    route in: every `/articles/{city}` page links to `/{city}` and to its
    homes-for-sale page, the footer still carries them, and the internal-link
    audit (`npm run check:links`) fails if any of them becomes an orphan.
  */
  {
    label: "Articles",
    href: "/articles",
    hrefLabel: "All articles",
    items: [
      ...allCities.map((c) => ({
        href: `/articles/${c.slug}`,
        label: c.name,
        description: `${c.county} County`,
      })),
      {
        href: "/market-updates",
        label: "Market Updates",
        description: "What the numbers actually did",
      },
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
  /*
    The answer hub (docs/18 § 5). It carries 62 question pages, and every one
    of them needs a route in from the chrome or it is an orphan — the header is
    the link that makes the whole hub reachable rather than only findable.
  */
  { href: "/answers", label: "Answers" },
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
      { href: "/answers", label: "Answers" },
      { href: "/market-updates", label: "Insights" },
    ],
  },
  {
    heading: "Company",
    items: [
      { href: "/about", label: "About Krisi" },
      { href: "/lake-mary", label: "Lake Mary" },
      /*
        Communities is out of the chrome entirely (client, 2026-09-30): Articles
        is the one content entry, in the header and here.

        The pages stay — `/lake-mary/communities` and every `/communities/{slug}`
        still resolve, are still in the sitemap, and are still linked from the
        city hubs and from the listings that sit in them, which is where somebody
        looking for a community actually is. HR11 makes those URLs permanent, so
        the choice here is only about what the menu offers.
      */
      { href: "/articles", label: "Articles" },
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
