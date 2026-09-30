/**
 * Guard: generated SEO copy is always publishable.
 *
 * ── Why a guard and not a unit test ───────────────────────────────────────
 *
 * The failure this catches is not a wrong string, it is an UNWRITEABLE one.
 * `seo_pages` carries `check (char_length(description) between 140 and 158)`, so
 * a generator that produces 138 characters for some combination of columns does
 * not return a worse description — the row is rejected, the upsert logs an
 * error, and the page silently keeps whatever it had. That happened for five of
 * eight seeded cities before the brand ladder existed, and it was invisible
 * until somebody read the logs.
 *
 * So this walks a matrix of records rather than a handful of examples: every
 * property type against every listing type against every status, with the
 * optional columns present and absent. 1,000-odd combinations, all pure
 * functions, under a second.
 *
 * Run by `npm run guards`. Add a case here whenever a column starts feeding the
 * copy.
 */

import {
  articleDescriptionFrom,
  articleTitleFrom,
  DESC_MAX,
  DESC_MIN,
  inBand,
  listingDescriptionFrom,
  listingTitleFrom,
  TITLE_MAX,
} from "../lib/seo/auto/generate";
import type { ListingType, PropertyType } from "../types/domain";

const PROPERTY_TYPES: PropertyType[] = [
  "single_family",
  "townhouse",
  "condo",
  "villa",
  "multi_family",
  "land",
  "manufactured",
];

const LISTING_TYPES: ListingType[] = [
  "resale",
  "new_construction",
  "assumable",
  "va_eligible",
  "land",
];

const STATUSES = ["active", "pending", "sold", "coming_soon", "off_market"];

/**
 * Addresses chosen for length, not for realism.
 *
 * The short one is what makes a title too SHORT to be interesting; the long one
 * is what pushes it past 43 characters and exercises the trimmer. A generator
 * tested only on "123 Main St" passes everything.
 */
const ADDRESSES = [
  "12 Oak St",
  "1428 Bridgewater Drive",
  "4871 Southwest Conservation Ridge Boulevard Unit 214B",
];

const CITIES = ["Lake Mary", "Sanford", "Winter Springs", "Altamonte Springs"];

type Failure = { what: string; detail: string; value: string };
const failures: Failure[] = [];

function checkTitle(what: string, title: string): void {
  if (title.trim() === "") {
    failures.push({ what, detail: "empty title", value: title });
    return;
  }
  if (title.length > TITLE_MAX) {
    failures.push({ what, detail: `title is ${title.length} chars, over ${TITLE_MAX}`, value: title });
  }
  // A title that ends on a separator or a comma reads as a truncation bug, which
  // is exactly what it is.
  if (/[,\-–—|:;]\s*$/.test(title)) {
    failures.push({ what, detail: "title ends on punctuation", value: title });
  }
  if (/undefined|null|NaN|\$NaN/.test(title)) {
    failures.push({ what, detail: "title leaked a placeholder value", value: title });
  }
  if (/\s{2,}/.test(title)) {
    failures.push({ what, detail: "title has a double space", value: title });
  }
}

function checkDescription(what: string, description: string): void {
  if (!inBand(description)) {
    failures.push({
      what,
      detail: `description is ${description.trim().length} chars, outside ${DESC_MIN}-${DESC_MAX}`,
      value: description,
    });
  }
  if (/undefined|null|NaN/.test(description)) {
    failures.push({ what, detail: "description leaked a placeholder value", value: description });
  }
  if (/\s{2,}/.test(description)) {
    failures.push({ what, detail: "description has a double space", value: description });
  }
  // Markdown and newlines render literally inside a meta tag.
  if (/[*_#`\n\r]/.test(description)) {
    failures.push({ what, detail: "description contains markup", value: description });
  }
  if (!/[.!?]$/.test(description.trim())) {
    failures.push({ what, detail: "description does not end on a full stop", value: description });
  }
  /*
    A listing that is not for sale must never be described as being for sale.
    Its page is permanent (CLAUDE.md § 3 rule 11), so this is the check that
    stops a sold record advertising itself for the rest of the site's life.
  */
}

let listingCases = 0;

for (const propertyType of PROPERTY_TYPES) {
  for (const listingType of LISTING_TYPES) {
    for (const status of STATUSES) {
      for (const address of ADDRESSES) {
        for (const sparse of [false, true]) {
          const cityName = CITIES[listingCases % CITIES.length];
          const facts = {
            address,
            cityName,
            status,
            price: sparse ? null : 685_000,
            soldPrice: status === "sold" ? (sparse ? null : 662_500) : null,
            beds: sparse ? null : 4,
            baths: sparse ? null : 3,
            sqft: sparse ? null : 2_480,
            yearBuilt: sparse ? null : 2019,
            pool: !sparse,
            waterfront: propertyType === "villa" && !sparse,
            contractorsTake: sparse ? null : "Roof was replaced in 2021. Panel is a 200A Square D.",
            propertyType,
            listingType,
            features: sparse ? null : ["Fenced yard", "Screened lanai"],
          };

          const what = `listing ${propertyType}/${listingType}/${status}/${sparse ? "sparse" : "full"}/${address.length}ch`;
          const title = listingTitleFrom(facts);
          const description = listingDescriptionFrom(facts);

          checkTitle(what, title);
          checkDescription(what, description);

          const notForSale = status !== "active" && status !== "coming_soon";
          if (notForSale && /for sale/i.test(description)) {
            failures.push({
              what,
              detail: `a ${status} listing is described as for sale`,
              value: description,
            });
          }
          if (notForSale && /for sale/i.test(title)) {
            failures.push({ what, detail: `a ${status} title says for sale`, value: title });
          }

          listingCases += 1;
        }
      }
    }
  }
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

const LONG_BODY =
  "A VA loan lets an eligible buyer purchase with no down payment, and in Central Florida that changes which houses are reachable. " +
  "The appraisal is ordered through the VA panel rather than the lender, which adds a few days and one condition set. " +
  "Roof life, exposed wiring and standing water are the three findings that most often stop a file, and all three are visible on a walkthrough. " +
  "Below is the order the steps actually happen in, what each one costs, and where a Central Florida file tends to stall.";

const ARTICLE_KINDS = ["blog", "market_update", "guide"];
let articleCases = 0;

for (const kind of ARTICLE_KINDS) {
  for (const title of [
    "VA Loans",
    "How VA loans work in Central Florida",
    "Everything a first-time buyer in Seminole County needs to know about assumable mortgages before making an offer",
  ]) {
    for (const excerpt of [null, "A short one.", LONG_BODY.slice(0, 150)]) {
      for (const bodyText of [null, LONG_BODY]) {
        for (const cityName of [null, "Lake Mary"]) {
          const facts = { title, excerpt, bodyText, kind, cityName, publishedAt: "2026-09-14T12:00:00Z" };
          const what = `article ${kind}/${title.length}ch/excerpt:${excerpt ? excerpt.length : 0}/body:${bodyText ? "yes" : "no"}/city:${cityName ?? "none"}`;

          checkTitle(what, articleTitleFrom(facts));
          checkDescription(what, articleDescriptionFrom(facts));
          articleCases += 1;
        }
      }
    }
  }
}

/* ── Report ───────────────────────────────────────────────────────────────── */

if (failures.length > 0) {
  console.error(`\nSEO copy guard FAILED — ${failures.length} problem(s):\n`);
  // Grouped, because one missing clause shows up in hundreds of combinations and
  // an unbounded list buries the other faults.
  const seen = new Map<string, Failure>();
  for (const failure of failures) {
    const key = `${failure.detail.replace(/\d+/g, "N")}`;
    if (!seen.has(key)) seen.set(key, failure);
  }
  for (const [, failure] of seen) {
    console.error(`  ${failure.detail}`);
    console.error(`    case:  ${failure.what}`);
    console.error(`    value: ${failure.value}\n`);
  }
  console.error(`${seen.size} distinct fault(s) across ${failures.length} case(s).`);
  process.exit(1);
}

console.log(
  `SEO copy guard passed — ${listingCases} listing and ${articleCases} article combinations, ` +
    `every title within ${TITLE_MAX} and every description inside ${DESC_MIN}-${DESC_MAX}.`,
);
