import {
  composeDescription,
  DESC_MAX,
  DESC_MIN,
  firstSentences,
  inBand,
  phrasePosition,
  pickTitle,
  stripBrandSuffix,
  tidy,
  TITLE_MAX,
  trimTitle,
  trimToWord,
} from "@/lib/seo/auto/compose";
import { analyzeDocument } from "@/lib/seo/auto/document";
import { abbreviateAddress, listingVocab, placeShort, WANTS_FRESHNESS } from "@/lib/seo/auto/vocab";
import { formatPrice } from "@/lib/utils";
import type { Article, City, Community, Listing, ListingType, PropertyType } from "@/types/domain";

/**
 * Deterministic SEO generation.
 *
 * This is the FLOOR, not the fallback. Every published record gets a title and
 * a description from here whether or not a model is configured, whether or not
 * the network is up, and whether or not anyone typed anything. The Ollama layer
 * in `ollama.ts` improves the prose; it never provides the guarantee.
 *
 * ── How it composes ──────────────────────────────────────────────────────
 *
 * The arithmetic and the string handling live in `compose.ts`; the vocabulary
 * lives in `vocab.ts`. What is left here is the part that is actually about
 * search: which facts are worth which characters.
 *
 * Every generator below offers the composer several candidates, richest first,
 * and takes back the richest that fits its budget. The earlier version had one
 * pattern per record type and padded whatever came out short with brand text,
 * so a four-bedroom pool home with a contractor's report could reach the
 * 140-character floor on "… From The House Boss, Lake Mary FL." — in band, and
 * thirty characters that said nothing about the house.
 *
 * ── What "best level" means for a listing ────────────────────────────────
 *
 * Three things, in this order:
 *
 * 1. **The intent phrase comes first.** A listing description now opens
 *    "4 bed, 3 bath pool home for sale in Lake Mary, Florida" rather than with
 *    the street address. The address identifies the property to somebody who
 *    already has it; the phrase is what the other ninety-nine per cent of
 *    searches are made of, and on a phone the first line is all that is shown.
 * 2. **Rich-result facts are spent on before prose.** Beds, baths, square
 *    footage, year and price are what a `RealEstateListing` result can display
 *    and what an assistant quotes, so they outrank any sentence about the
 *    experience of living there.
 * 3. **The differentiator gets the leftovers.** The contractor's read is the one
 *    thing no other agent's listing in this market has (brief § 1), so it takes
 *    whatever room remains before the brand ladder is considered.
 *
 * ── Facts only ────────────────────────────────────────────────────────────
 *
 * Every value interpolated below comes from the record. Nothing is inferred,
 * estimated or embellished. On a property listing an invented number is a
 * misrepresentation under FREC advertising rules, not a stylistic problem, and
 * that constraint is what makes the deterministic generator the safe default
 * rather than the cheap one.
 */

export {
  DESC_MAX,
  DESC_MIN,
  firstSentences,
  inBand,
  phrasePosition,
  stripBrandSuffix,
  TITLE_MAX,
  trimTitle,
  trimToWord,
};

/* ── Listings ─────────────────────────────────────────────────────────────── */

/**
 * The facts a listing description is built from.
 *
 * Deliberately a plain shape rather than `Listing`. The admin's "Write it for
 * me" button has form values in hand and no saved record — a listing being
 * edited for the first time has no row to read back — so the generator has to
 * accept what the form knows. The `Listing` wrappers below adapt.
 *
 * `propertyType`, `listingType` and `waterfront` are optional because this
 * object crosses a server-action boundary from a form that may predate them.
 * `facts()` below fills them in rather than letting `undefined` reach the
 * vocabulary, where it would silently produce "Home" for a townhouse.
 */
export type ListingFacts = {
  address: string;
  cityName: string;
  status: string;
  price: number | null;
  soldPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  yearBuilt: number | null;
  pool: boolean;
  contractorsTake: string | null;
  propertyType?: PropertyType | null;
  listingType?: ListingType | null;
  waterfront?: boolean | null;
  /** Free-form features. Read only to confirm one the columns already imply. */
  features?: string[] | null;
};

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

/**
 * Normalise what arrived, so the vocabulary is never handed a surprise.
 *
 * The values come from a client form through a server action. An unrecognised
 * `propertyType` is not a reason to fail — a listing still deserves a
 * description — so it falls back to the commonest case and the copy is simply
 * less specific.
 */
function vocabOf(f: ListingFacts) {
  const propertyType =
    f.propertyType && PROPERTY_TYPES.includes(f.propertyType) ? f.propertyType : "single_family";
  const listingType =
    f.listingType && LISTING_TYPES.includes(f.listingType) ? f.listingType : "resale";

  return listingVocab({
    propertyType,
    listingType,
    status: f.status,
    pool: Boolean(f.pool),
    waterfront: Boolean(f.waterfront),
  });
}

/** "4 bed, 3 bath" — whichever of the two the record actually has. */
function bedBath(f: ListingFacts): string {
  return [f.beds ? `${f.beds} bed` : null, f.baths ? `${f.baths} bath` : null]
    .filter(Boolean)
    .join(", ");
}

/**
 * The listing title.
 *
 * The address leads, because a title is also a heading in a result list and the
 * address is what makes one listing distinguishable from the next. What follows
 * it is whatever the remaining characters buy, and the order of the candidates
 * is the ranking: bedroom count with a qualified noun ("4 Bed Pool Home") beats
 * the noun alone, which beats the price.
 *
 * Price last on purpose. It reads well and it earns clicks, but it is the one
 * element already displayed beside the result by every search surface that has
 * it, and it carries no search phrase at all.
 */
export function listingTitleFrom(f: ListingFacts): string {
  const v = vocabOf(f);
  const city = tidy(f.cityName);
  const address = tidy(f.address);
  const short = abbreviateAddress(address);
  const price = f.status === "sold" ? f.soldPrice : f.price;
  const money = price ? formatPrice(price, { compact: true }) : "";

  /*
    Heads, longest first — and every one of them names the city.

    The order is what makes the city non-negotiable: the composer works down the
    heads before it gives up on a tail, so a long address loses "Boulevard" and
    then loses "FL" long before it loses "Lake Mary". Which is the right trade:
    the street number is unique and the city is what people search.
  */
  const heads = [
    `${address}, ${placeShort(city)}`,
    short !== address ? `${short}, ${placeShort(city)}` : null,
    short !== address ? `${short}, ${city}` : `${address}, ${city}`,
  ].filter((h): h is string => Boolean(h));

  /*
    Tails, richest first.

    A property that is not for sale is described as what it is. Its page stays
    published forever (CLAUDE.md § 3 rule 11), so the title has to stay true
    after the sale — and "Sold" in a title is genuinely useful: it is what
    somebody researching what a street trades for is looking for, and it stops a
    buyer clicking through to a house they cannot buy.
  */
  const beds = f.beds ? `${f.beds} Bed` : "";
  const tails = v.forSale
    ? [
        beds ? `${beds} ${v.nounQualified}` : null,
        beds ? `${beds} ${v.noun}` : null,
        v.nounQualified,
        money || null,
        "",
      ]
    : [
        v.statusLabel && money ? `${v.statusLabel} ${money}` : null,
        v.statusLabel || null,
        "",
      ];

  /*
    Tail first, then head. Information the title would not otherwise carry beats
    the difference between "Drive" and "Dr", so the loop spends the address's
    spelling before it spends a fact.
  */
  const candidates: string[] = [];
  for (const tail of tails) {
    if (tail === null) continue;
    for (const head of heads) candidates.push(tail ? `${head} — ${tail}` : head);
  }
  candidates.push(short, address);

  return pickTitle(candidates);
}

export function autoListingTitle(listing: Listing): string {
  return listingTitleFrom(toFacts(listing));
}

const toFacts = (l: Listing): ListingFacts => ({
  address: l.address,
  cityName: l.city.name,
  status: l.status,
  price: l.price,
  soldPrice: l.soldPrice,
  beds: l.beds,
  baths: l.baths,
  sqft: l.sqft,
  yearBuilt: l.yearBuilt,
  pool: l.pool,
  contractorsTake: l.contractorsTake,
  propertyType: l.propertyType,
  listingType: l.listingType,
  waterfront: l.waterfront,
  features: l.features,
});

/**
 * The listing description.
 *
 * The openings are the interesting part. Each one is a complete, true sentence
 * about the property whose first words are the phrase somebody would type, and
 * they descend by how much of that phrase the record can support: specs plus a
 * qualified noun plus city plus price, then the same without the price, then the
 * noun and the city, and finally — for a record with almost nothing filled in —
 * the address form the first generator always used.
 */
export function listingDescriptionFrom(f: ListingFacts): string {
  const v = vocabOf(f);
  const price = f.status === "sold" ? f.soldPrice : f.price;
  const money = price ? formatPrice(price) : "";
  const city = tidy(f.cityName);
  const specs = bedBath(f);
  const address = tidy(f.address);

  /*
    "for sale in Lake Mary, Florida" / "sold in Lake Mary, Florida".

    One phrase rather than two branches, because every opening below needs the
    same verb and the status can change under any of them.
  */
  const availability = `${v.availability} in ${city}, Florida`;

  const openings = v.forSale
    ? [
        specs && money
          ? `${specs} ${v.nounQualifiedLower} ${availability} — ${money}.`
          : null,
        specs ? `${specs} ${v.nounQualifiedLower} ${availability}.` : null,
        money ? `${capitalise(v.nounQualifiedLower)} ${availability} — ${money}.` : null,
        `${capitalise(v.nounQualifiedLower)} ${availability}.`,
        money ? `${address}, ${city}, Florida — ${money}.` : `${address}, ${city}, Florida.`,
      ]
    : [
        /*
          A sold record is a market fact, and the sentence is written as one.
          "This 4 bed, 3 bath pool home sold in Lake Mary, Florida for $685,000"
          is what somebody researching a street is looking for, and it is the
          form an assistant can quote without turning it into an offer.
        */
        specs && money ? `${specs} ${v.nounQualifiedLower} ${availability} — ${money}.` : null,
        specs ? `${specs} ${v.nounQualifiedLower} ${availability}.` : null,
        `${capitalise(v.nounQualifiedLower)} ${availability} at ${address}.`,
        `${address}, ${city}, Florida — ${v.statusLabel || capitalise(v.availability)}.`,
      ];

  return composeDescription({
    openings,
    /*
      Ordered by what the characters buy.

      Square footage and year are rich-result fields and the two facts most often
      asked back by an assistant, so they go first. The street address comes next
      — it is in the title, but a description that repeats it is what makes an
      address search match the snippet as well as the heading. The contractor's
      read is the site's differentiator and takes what is left, and the licence
      line closes it when there is still room, because on a real-estate page the
      author's credentials are an E-E-A-T signal rather than a flourish.
    */
    clauses: [
      [
        f.sqft && f.yearBuilt
          ? `${f.sqft.toLocaleString()} sq ft, built ${f.yearBuilt}.`
          : null,
        f.sqft ? `${f.sqft.toLocaleString()} sq ft.` : null,
        f.yearBuilt ? `Built ${f.yearBuilt}.` : null,
      ],
      [`At ${address}.`],
      f.contractorsTake
        ? [
            "Includes a licensed residential contractor's read on the condition.",
            "With a licensed contractor's read on the condition.",
            "Includes a contractor's read on the condition.",
          ]
        : [
            "Photographs, key facts and a contractor's read on the condition.",
            "Photographs, key facts and a contractor's read.",
          ],
      [
        "Represented by Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
        "With Krisi Kakarova, Realtor and Certified Residential Contractor.",
        "With Krisi Kakarova, Realtor and licensed contractor.",
      ],
      /*
        The short closer, and the reason it exists.

        Every clause above is long, and the band is eighteen characters wide. A
        description sitting at 138 with nothing shorter than forty-six characters
        left to add cannot reach the floor, so the composer abandoned the richest
        opening and fell back to a plainer one that happened to land — measured on
        a four-bedroom pool home, the version with the price in it was discarded
        for the version without. A fifteen-character rung fixes that, and on a
        listing that is still for sale it is also the only call to action the
        snippet gets.
      */
      v.forSale
        ? [
            "See photos, the map and book a showing.",
            "See photos and book a showing.",
            "Book a showing.",
          ]
        : [
            "Photographs, full details and neighbourhood context.",
            "Photographs and full details.",
            "Full details.",
          ],
    ],
  });
}

export function autoListingDescription(listing: Listing): string {
  return listingDescriptionFrom(toFacts(listing));
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

export type ArticleFacts = {
  title: string;
  excerpt: string | null;
  bodyText: string | null;
  /** So a market update can carry its month. Optional: a draft has no date. */
  publishedAt?: string | null;
  kind?: string | null;
  cityName?: string | null;
};

/**
 * The article title.
 *
 * The author's words are kept and never rewritten — she wrote the headline and
 * it is also the H1. The only thing generation adds is a place, and only when
 * three things are true: the article is attached to a city, the title does not
 * already name it, and it fits inside the budget without displacing anything.
 *
 * That addition is worth the characters because an article about a market or a
 * process is ambiguous without it. "September Market Update" competes with every
 * market update published that month in the country; "September Market Update —
 * Lake Mary FL" competes with the handful about this city, which is the search
 * the page can actually win.
 */
export function articleTitleFrom(f: ArticleFacts): string {
  const title = stripBrandSuffix(tidy(f.title));
  const city = f.cityName ? tidy(f.cityName) : "";
  const namesCity = city !== "" && title.toLowerCase().includes(city.toLowerCase());

  if (!city || namesCity) return trimTitle(title);

  return pickTitle([`${title} — ${placeShort(city)}`, `${title} — ${city}`, title]);
}

export function autoArticleTitle(article: Article): string {
  return articleTitleFrom({
    title: article.title,
    excerpt: article.excerpt,
    bodyText: article.bodyText,
    publishedAt: article.publishedAt,
    kind: article.kind,
    cityName: article.city?.name ?? null,
  });
}

/**
 * Prefers the article's own opening over anything generated.
 *
 * An answer-first opening paragraph is exactly what an assistant extracts, so
 * when the body provides one it beats any summary we could compose. The
 * generated line is the safety net for a body that starts with a scene-setter.
 */
export function autoArticleDescription(article: Article): string {
  return articleDescriptionFrom(
    {
      title: article.title,
      excerpt: article.excerpt,
      bodyText: article.bodyText,
      publishedAt: article.publishedAt,
      kind: article.kind,
      cityName: article.city?.name ?? null,
    },
    article.bodyJson,
  );
}

/**
 * The text of the first `answerFirst` node in a Tiptap document.
 *
 * Delegates to the document analyser, which walks the tree rather than assuming
 * a depth: the node is a top-level block today, and a document shape that
 * changes should degrade to "not found" instead of throwing inside
 * `generateMetadata`.
 */
export function answerFirstText(doc: unknown): string {
  return analyzeDocument(doc).answerFirst;
}

/** "September 2026", in the timezone the site publishes in. */
function monthLabel(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "America/New_York",
  });
}

export function articleDescriptionFrom(f: ArticleFacts, bodyJson?: unknown): string {
  const body = tidy(f.bodyText ?? "");

  /*
    The `answerFirst` block wins over everything.

    That block is where the author states the direct answer, which makes it the
    best meta description the article contains and the reason the node exists in
    the editor at all. Reading it structurally rather than guessing at the first
    paragraph is what a marked-up document buys.
  */
  const answer = answerFirstText(bodyJson);
  if (answer && answer.length >= DESC_MIN) return trimToWord(answer, DESC_MAX);

  const excerpt = f.excerpt ? tidy(f.excerpt) : "";
  const month = WANTS_FRESHNESS[f.kind ?? ""] ? monthLabel(f.publishedAt) : "";
  const city = f.cityName ? tidy(f.cityName) : "";

  return composeDescription({
    openings: [answer, excerpt, firstSentences(body, DESC_MAX), firstSentences(body, 110), tidy(f.title)],
    clauses: [
      /*
        Freshness, and only where it is the news.

        A market update's month is a fact from `published_at` and it is the thing
        that tells a reader — and an assistant choosing between two pages — that
        these are this month's figures. On an evergreen guide the same clause
        makes the page look staler every month, so `WANTS_FRESHNESS` keeps it off
        those.
      */
      month ? [`Updated ${month}.`] : [],
      city ? [`Covering ${city} and Central Florida.`, `${city} and Central Florida.`] : [],
      [
        "Written by Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
        "By Krisi Kakarova, Realtor and Certified Residential Contractor.",
        "By Krisi Kakarova, Realtor and licensed contractor.",
      ],
      /*
        The short rung, for the same arithmetic as the listing closer.

        The author line is fifty-three characters at its shortest, so an excerpt
        of a hundred and twenty-six could not reach the floor with it and the
        composer fell through to using the raw headline as the description
        instead — a worse sentence, chosen only because it happened to be longer.
      */
      ["Written for Central Florida buyers.", "For Central Florida buyers."],
    ],
  });
}

/**
 * The description an article page publishes, whatever state it is in.
 *
 * ── Why the routes need this ──────────────────────────────────────────────
 *
 * `autoArticleDescription` composes from the body and never reads `meta_desc`,
 * because on publish `ensureArticleSeo` has already chosen between the two and
 * written the winner to `seo_pages`, which the route reads as an override. But a
 * page can be rendered before that write lands — a preview, a revalidation
 * racing the publish, a row the backfill has not reached — and in that window
 * the author's own description was being ignored in favour of a generated one.
 *
 * So the same precedence is applied here: her text when it is publishable, the
 * generated one otherwise.
 */
export function articleMetaDescription(article: Article): string {
  const own = article.metaDesc?.trim();
  if (own && inBand(own)) return own;
  return autoArticleDescription(article);
}

export function autoExcerpt(bodyText: string | null): string {
  return firstSentences(bodyText ?? "", 220);
}

/* ── Places ───────────────────────────────────────────────────────────────── */

/** Strip the markdown that would otherwise land in a meta tag. */
function plainFromMarkdown(value: string | null): string {
  return tidy((value ?? "").replace(/[#*_>`[\]()]/g, ""));
}

export function autoCityDescription(city: City): string {
  const intro = plainFromMarkdown(city.introMd);
  if (intro.length >= DESC_MIN) return trimToWord(intro, DESC_MAX);

  return composeDescription({
    openings: [
      intro,
      `Homes for sale in ${city.name}, Florida — ${city.county} County.`,
      `${city.name}, ${city.county} County, Florida.`,
    ],
    clauses: [
      [
        `Current listings, market context and local perspective on ${city.name}.`,
        `Listings, market context and local perspective.`,
      ],
      [
        "From Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
        "From Krisi Kakarova, Realtor and Certified Residential Contractor.",
      ],
    ],
  });
}

export function autoCommunityDescription(community: Community): string {
  const intro = plainFromMarkdown(community.introMd);
  if (intro.length >= DESC_MIN) return trimToWord(intro, DESC_MAX);

  return composeDescription({
    openings: [
      intro,
      `Homes for sale in ${community.name}, Central Florida.`,
      `${community.name}, Central Florida.`,
    ],
    clauses: [
      [
        `Current listings, local detail and what to look at before you offer.`,
        `Current listings and local detail.`,
      ],
      [
        "From Krisi Kakarova, Realtor and Certified Residential Building Contractor.",
        "From Krisi Kakarova, Realtor and Certified Residential Contractor.",
      ],
    ],
  });
}

/**
 * Alt text for a place's hero photograph.
 *
 * Deliberately says only what is CERTAIN about the picture: which place it is
 * of. A generator has not seen the image, and an invented description — "palm
 * trees at sunset", "aerial view" — is worse than a plain one: a screen-reader
 * user is told something that may not be there, and it is the kind of detail
 * nobody thinks to check.
 *
 * The place name is also the useful half for image search, which is what the
 * client asked this to serve.
 *
 * Only ever used to FILL A BLANK. Anything the admin types wins — she has seen
 * the photograph and this has not.
 */
export function autoCityHeroAlt(city: { name: string; county: string }): string {
  return `${city.name}, ${city.county} County, Florida`;
}

export function autoCommunityHeroAlt(community: {
  name: string;
  cityName?: string | null;
}): string {
  return community.cityName
    ? `${community.name} in ${community.cityName}, Florida`
    : `${community.name}, Central Florida`;
}
