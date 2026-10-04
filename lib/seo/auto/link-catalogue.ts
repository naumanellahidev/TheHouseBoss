import "server-only";

import { ANSWERS, answerHref } from "@/lib/content/answers";
import { getArticles } from "@/lib/queries/articles";
import { getCommunities } from "@/lib/queries/cities";
import type { CatalogueEntry } from "@/lib/seo/auto/link-plan";
import { allCities } from "@/lib/site-config";
import { articleHref } from "@/lib/utils/routes";

/**
 * Every page an article may link to, described in one line each.
 *
 * ── What is new here ──────────────────────────────────────────────────────
 *
 * The exact-phrase linker knew three kinds of destination: the cities, five
 * service pages and the answer hub. It could not link one article to another,
 * and it could not link to a community. Both matter more as the site grows — an
 * article about closing costs in Lake Mary should point at the one about
 * Heathrow, and the second article she writes should link to the first.
 *
 * So the catalogue reads the published articles and the communities from the
 * database every time it is built. A page that does not exist cannot be in the
 * list, which is what makes it safe to let a model choose from it.
 *
 * ── Why each entry carries a topic and not just a title ───────────────────
 *
 * The model matches the article's phrases to what a page is ABOUT. A title like
 * "Heathrow" says nothing to a model that does not know Heathrow is a gated golf
 * community in Lake Mary; the topic line does. It is built from the record's own
 * text — the excerpt, the intro — so the model is never told something about a
 * page that the page does not say.
 */

/** Plain text from a markdown intro, one sentence's worth. */
function summary(markdown: string | null, fallback: string, max = 140): string {
  const clean = (markdown ?? "")
    .replace(/[#*_>`[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return fallback;
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = cut.lastIndexOf(". ");
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/**
 * The service and guide pages. Static: they are routes in the app, not rows.
 *
 * Each topic names what the page is for in the words a buyer uses, because that
 * is what the model has to recognise in an article's prose.
 */
const STATIC_PAGES: CatalogueEntry[] = [
  {
    href: "/guides/va-home-buyer",
    title: "VA Home-Buyer Guide",
    topic: "VA loans, VA entitlement, buying with no down payment, the VA appraisal and minimum property requirements",
    kind: "guide",
  },
  {
    href: "/assumable-mortgage-homes",
    title: "Assumable Mortgage Homes",
    topic: "assumable mortgages, taking over a seller's lower interest rate, FHA and VA loan assumption",
    kind: "guide",
  },
  {
    href: "/hire-contractor",
    title: "Hire a Contractor",
    topic: "a licensed residential contractor for remodeling, renovation, repairs and new construction",
    kind: "service",
  },
  {
    href: "/sell-your-central-florida-home",
    title: "Sell Your Central Florida Home",
    topic: "selling a house, pricing, preparing a home for sale and the listing process",
    kind: "service",
  },
  {
    href: "/search/new-construction",
    title: "New Construction Homes",
    topic: "new-construction homes, builder inventory and pre-construction",
    kind: "service",
  },
  {
    href: "/search",
    title: "Central Florida Home Search",
    topic: "every home currently for sale across Central Florida",
    kind: "service",
  },
];

export async function buildLinkCatalogue(opts: {
  /** The article being linked, so it is never offered as its own destination. */
  excludeHref?: string | null;
  /**
   * The same article, by slug.
   *
   * The slug is the reliable key: an article's URL depends on its kind and its
   * city, and a caller that does not have the city to hand would compute the
   * wrong href and leave the article in the list — free to be linked to itself.
   */
  excludeSlug?: string | null;
} = {}): Promise<CatalogueEntry[]> {
  /*
    Both reads degrade to nothing.

    A catalogue missing its communities still links cities, services and
    answers; a failed read must cost those destinations, not the whole pass.
  */
  const [communities, articles] = await Promise.all([
    getCommunities().catch(() => []),
    getArticles({ limit: 200 }).catch(() => []),
  ]);

  const cities: CatalogueEntry[] = allCities.flatMap((city) => [
    {
      href: `/${city.slug}`,
      title: `${city.name}, FL`,
      topic: `living in ${city.name}, ${city.county} County, Florida — neighbourhoods, schools, commute and the local market`,
      kind: "city" as const,
    },
    {
      href: `/${city.slug}/homes-for-sale`,
      title: `${city.name} Homes for Sale`,
      topic: `homes currently for sale in ${city.name}, Florida`,
      kind: "city" as const,
    },
  ]);

  const communityEntries: CatalogueEntry[] = communities.map((community) => ({
    href: `/communities/${community.slug}`,
    title: community.name,
    topic: summary(
      community.introMd,
      `the ${community.name} community in ${community.city.name}, Florida`,
    ),
    kind: "community",
  }));

  const answers: CatalogueEntry[] = ANSWERS.map((answer) => ({
    href: answerHref(answer),
    title: answer.question,
    topic: answer.question,
    kind: "answer",
  }));

  const articleEntries: CatalogueEntry[] = articles
    .filter((article) => !opts.excludeSlug || article.slug !== opts.excludeSlug)
    .map((article) => ({
      href: articleHref(article),
      title: article.title,
      topic: summary(article.excerpt, article.title),
      kind: "article" as const,
    }))
    .filter((entry) => entry.href !== opts.excludeHref);

  return [...cities, ...communityEntries, ...STATIC_PAGES, ...articleEntries, ...answers];
}
