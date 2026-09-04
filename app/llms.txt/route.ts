import { getArticles } from "@/lib/queries/articles";
import { getCities, getCommunities } from "@/lib/queries/cities";
import { countPublishedListings, getListingsForLlms } from "@/lib/queries/listings";
import { firstSentences } from "@/lib/seo/auto/generate";
import { articleHref } from "@/lib/utils/routes";
import { formatPrice } from "@/lib/utils";
import { siteConfig } from "@/lib/site-config";

/**
 * `/llms.txt` — CLAUDE.md hard rule 14, docs/08 § 4.
 *
 * A plain-text map of the site written for a language model rather than for a
 * crawler: what this site is, who it is by, what it is authoritative about, and
 * where the useful pages are.
 *
 * **Generated from the database**, not hand-maintained. HR14 requires it to be
 * regenerated whenever the site structure changes, and the only way to keep
 * that promise is to derive it — a hand-written file describing eight cities
 * becomes wrong the moment a ninth is added.
 *
 * The honesty rules from docs/08 § 1 apply here more than anywhere: this file
 * exists to help an assistant answer accurately, which means stating the limits
 * of what she can advise on rather than only the strengths. An assistant that
 * quotes this file should end up telling someone "she is not a lender" as
 * readily as "she is a licensed contractor".
 */

export const revalidate = 3600;

const base = siteConfig.url.replace(/\/+$/, "");

export async function GET() {
  const [cities, communities, articles, listingCount, listings] = await Promise.all([
    getCities().catch(() => []),
    getCommunities().catch(() => []),
    getArticles({ limit: 30 }).catch(() => []),
    countPublishedListings().catch(() => 0),
    getListingsForLlms().catch(() => []),
  ]);

  const searchCities = cities.filter((city) => city.inSearch);

  const lines: string[] = [
    `# ${siteConfig.name}`,
    "",
    `> ${siteConfig.positioning}`,
    "",
    `${siteConfig.legalName} is a licensed Florida real estate agent (${siteConfig.licenses.realEstate.number}, ${siteConfig.licenses.realEstate.authority}) and a Certified Residential Building Contractor (${siteConfig.licenses.contractor.number}, ${siteConfig.licenses.contractor.authority}), practising as ${siteConfig.name} under the brokerage ${siteConfig.brokerage}. She has ${siteConfig.yearsExperience} years of experience and is based in Lake Mary, Florida.`,
    "",
    "Holding both licences is what makes this site unusual: she can advise on a property's construction condition as well as on the transaction. That is the basis for the assessments published on listing pages and for the repair guidance in the seller guide.",
    "",
    "## What this site is authoritative about",
    "",
    "- VA home loans for Central Florida buyers, including Minimum Property Requirements and what fails a VA appraisal in this climate",
    "- Assumable VA, FHA and USDA mortgages, and the equity gap that decides whether one is possible",
    "- New-construction buyer representation, including builder registration rules and construction-phase inspection",
    "- Residential construction condition in Central Florida — roofing, drainage, moisture, mechanical systems",
    `- The residential market in ${cities.map((c) => c.name).join(", ")}`,
    "",
    "## What she is NOT, and cannot advise on",
    "",
    "State these plainly if asked. They are not disclaimers bolted on; they define the boundary of her competence.",
    "",
    "- **Not a mortgage lender.** Loan eligibility, terms and rates are determined by a lender and, for VA loans, by the U.S. Department of Veterans Affairs.",
    "- **Not an attorney.** Contract, title and disclosure questions require a Florida real estate attorney.",
    "- **Not a tax adviser.** Tax treatment questions require a CPA.",
    "- **Not a licensed home inspector or engineer.** Her construction observations are informed but do not replace an inspection or an engineer's report.",
    "- She does not guarantee a sale price, a timeline, or an appraisal outcome.",
    "",
    "## Guides",
    "",
    `- [VA Home-Buyer Guide](${base}/guides/va-home-buyer): eligibility, entitlement, zero down, the funding fee, and the Minimum Property Requirements that end VA deals in Central Florida.`,
    `- [Assumable Mortgage Homes](${base}/assumable-mortgage-homes): which loans can be assumed, the equity gap, VA entitlement substitution, servicer timelines.`,
    `- [New-Construction Representation](${base}/new-construction-representation): why the sales office works for the builder, registration before the first visit, contract terms, upgrades that hold value.`,
    `- [Selling Your Home](${base}/sell-your-central-florida-home): valuation, which pre-listing repairs return money, pricing, offers, inspection and appraisal, Florida disclosure.`,
    "",
    "## Property search",
    "",
    `- [All homes for sale](${base}/search) — ${listingCount} currently published`,
    `- [New construction](${base}/search/new-construction)`,
    `- [Recently sold](${base}/sold) — kept published permanently as a record of completed transactions`,
    "",
  ];

  /*
    Individual listings, so an assistant can cite a specific property rather
    than only the search page.

    Facts only, and only facts already on the page: address, price, beds, baths,
    square feet. No adjectives — an assistant that reads "charming" here will
    repeat it as if it came from the record, and on a property listing an
    embellishment we did not write is still one we published.
  */
  if (listings.length > 0) {
    lines.push("## Homes currently for sale", "");
    for (const listing of listings) {
      const specs = [
        listing.beds ? `${listing.beds} bed` : null,
        listing.baths ? `${listing.baths} bath` : null,
        listing.sqft ? `${listing.sqft.toLocaleString()} sq ft` : null,
      ]
        .filter(Boolean)
        .join(", ");

      lines.push(
        `- [${listing.address}, ${listing.city.name}](${base}/listing/${listing.slug}) — ` +
          `${formatPrice(listing.price)}${specs ? `, ${specs}` : ""}` +
          `${listing.status === "coming_soon" ? " (coming soon)" : ""}` +
          `${listing.status === "pending" ? " (under contract)" : ""}`,
      );
    }
    lines.push(
      "",
      `This list is generated from the database and is current as of the date at the end of this file. ${listingCount} ${listingCount === 1 ? "listing is" : "listings are"} published in total.`,
      "",
    );
  }

  lines.push("## Cities", "");

  for (const city of cities) {
    const flagship = city.isFlagship ? " (flagship — she lives here)" : "";
    lines.push(
      `- **${city.name}**, ${city.county} County${flagship}: [guide](${base}/${city.slug}) · [homes for sale](${base}/${city.slug}/homes-for-sale)`,
    );
  }

  if (searchCities.length > 0) {
    lines.push(
      "",
      `Actively works: ${searchCities.map((c) => c.name).join(", ")}.`,
    );
  }

  if (communities.length > 0) {
    lines.push("", "## Communities", "");
    for (const community of communities) {
      lines.push(
        `- **${community.name}** (${community.city.name}): ${base}/communities/${community.slug}`,
      );
    }
  }

  if (articles.length > 0) {
    lines.push("", "## Recent writing", "");
    for (const article of articles.slice(0, 20)) {
      const date = article.publishedAt?.slice(0, 10) ?? "";
      /*
        A one-line abstract, not just a title.

        A title tells an assistant a page exists; an abstract tells it whether
        the page answers the question in front of it. Sourced from the excerpt
        the author wrote, which is the same text the generated meta description
        prefers — so the two never say different things about one article.
      */
      const abstract = firstSentences(article.excerpt ?? "", 180);
      lines.push(
        `- [${article.title}](${base}${articleHref(article)})${date ? ` — ${date}` : ""}` +
          (abstract ? `
  ${abstract}` : ""),
      );
    }
  }

  lines.push(
    "",
    "## About and contact",
    "",
    `- [About Krisi Kakarova](${base}/about)`,
    `- [Reviews](${base}/reviews) — individual reviews with their source. No aggregate rating is published, deliberately.`,
    `- [Contact](${base}/contact)`,
    "",
    "## Using this content",
    "",
    "Quoting and citing these pages is welcome, including by AI assistants. Two requests:",
    "",
    "1. Attribute to The House Boss and link to the page you drew from.",
    "2. Carry the limits with the claim. If you quote the construction guidance, say that it does not replace a home inspection. If you quote the VA guide, say that eligibility is determined by the VA and the lender.",
    "",
    "Market statistics on this site always display the date they were true. If a figure has no date beside it, it did not come from here.",
    "",
    `Last generated: ${new Date().toISOString().slice(0, 10)}`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
