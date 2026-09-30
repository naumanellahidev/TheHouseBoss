import { DESC_MAX, DESC_MIN, inBand, TITLE_MAX } from "@/lib/seo/auto/compose";
import { analyzeDocument, countWords, headingOutlineIssue } from "@/lib/seo/auto/document";
import {
  articleTitleFrom,
  listingTitleFrom,
  type ArticleFacts,
  type ListingFacts,
} from "@/lib/seo/auto/generate";

/**
 * The on-page audit for one record.
 *
 * ── What this is for ──────────────────────────────────────────────────────
 *
 * The admin's SEO tab used to be two text fields, two character counters and a
 * result preview. All three tell you what you TYPED. None of them tells you that
 * the article has no answer-first block, that four photographs have no
 * alternative text, or that the page links nowhere — which are the things that
 * actually decide whether it gets found and whether an assistant can cite it.
 *
 * So this returns a list of named checks with a plain-English detail line and
 * the tab the fix lives on, and the panel renders it. The score is a summary of
 * the list, not the point of it: a number tells somebody they have a problem,
 * and a sentence tells them what to do about it.
 *
 * ── Why it is pure ───────────────────────────────────────────────────────
 *
 * No `server-only`, no imports that reach a database. It runs on every keystroke
 * in the form and again on the server before publish, on the same inputs, so the
 * two can never disagree. Anything that needs a query — whether a slug collides,
 * whether the sitemap has been pinged — belongs in Admin → SEO, not here.
 *
 * ── Weights ──────────────────────────────────────────────────────────────
 *
 * Chosen so that the things which cannot be fixed later weigh most. A missing
 * description is a five-second fix at any time; a listing published with no
 * photographs has already been crawled without them, and a sold listing's
 * larger derivatives are deleted after seven days (CLAUDE.md § 3 rule 10), so
 * the chance does not come back.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export type SeoCheck = {
  id: string;
  label: string;
  status: CheckStatus;
  /** One sentence. What is true now, or what to do — never both. */
  detail: string;
  weight: number;
  /** The form tab that fixes it, so the panel can offer to jump there. */
  tab?: string;
};

export type SeoAudit = {
  /** 0–100, weighted. */
  score: number;
  checks: SeoCheck[];
  /** Counts, so a panel header can say "3 to fix" without filtering twice. */
  failed: number;
  warned: number;
};

function summarise(checks: SeoCheck[]): SeoAudit {
  const max = checks.reduce((total, check) => total + check.weight, 0);
  const earned = checks.reduce(
    (total, check) =>
      total + (check.status === "pass" ? check.weight : check.status === "warn" ? check.weight / 2 : 0),
    0,
  );

  return {
    score: max === 0 ? 0 : Math.round((earned / max) * 100),
    checks,
    failed: checks.filter((c) => c.status === "fail").length,
    warned: checks.filter((c) => c.status === "warn").length,
  };
}

/** Three-way from two booleans, in the order they are usually written. */
function verdict(pass: boolean, warn: boolean): CheckStatus {
  return pass ? "pass" : warn ? "warn" : "fail";
}

/* ── Listings ─────────────────────────────────────────────────────────────── */

export type ListingAuditInput = ListingFacts & {
  slug: string;
  metaTitle: string | null;
  metaDesc: string | null;
  /** The public-facing body copy, not the meta description. */
  description: string | null;
  headline: string | null;
  photoCount: number;
  photosWithAlt: number;
  hasCommunity: boolean;
};

export function auditListing(input: ListingAuditInput): SeoAudit {
  const checks: SeoCheck[] = [];

  /* ── What search results show ──────────────────────────────────────── */

  const title = (input.metaTitle?.trim() || listingTitleFrom(input)).trim();
  const namesCity = title.toLowerCase().includes(input.cityName.trim().toLowerCase());

  checks.push({
    id: "title-length",
    label: "Title fits a search result",
    weight: 10,
    tab: "seo",
    status: verdict(title.length > 0 && title.length <= TITLE_MAX, title.length <= 55),
    detail:
      title.length === 0
        ? "There is no title yet. One is written from the address on publish."
        : title.length <= TITLE_MAX
          ? `${title.length} characters, plus the site name — inside the ${TITLE_MAX + 17} Google shows.`
          : `${title.length} characters. Google cuts the line at about 60 including the site name, so the end will be replaced with an ellipsis.`,
  });

  checks.push({
    id: "title-city",
    label: "Title names the city",
    weight: 8,
    tab: "seo",
    status: namesCity ? "pass" : "fail",
    detail: namesCity
      ? `“${input.cityName}” is in the title, which is what a local search matches on.`
      : `The title does not say ${input.cityName}. A property title with no place in it competes with every street of that name in the country.`,
  });

  const description = input.metaDesc?.trim() ?? "";
  checks.push({
    id: "description-band",
    label: "Description is the right length",
    weight: 10,
    tab: "seo",
    status:
      description === ""
        ? // Blank is not a fault. One is generated from the record on publish,
          // and a generated description is a good description — it is simply not
          // hers, which is worth saying rather than scoring against her.
          "warn"
        : verdict(inBand(description), description.length >= 110 && description.length <= 165),
    detail:
      description === ""
        ? `Empty, so one is written from this listing on publish. Press “Write it for me” to see it.`
        : inBand(description)
          ? `${description.length} characters — inside the ${DESC_MIN}–${DESC_MAX} a result displays in full.`
          : `${description.length} characters. Under ${DESC_MIN} wastes the line; over ${DESC_MAX} is cut off mid-sentence.`,
  });

  if (description !== "") {
    const early = description.toLowerCase().slice(0, 90).includes(input.cityName.toLowerCase());
    checks.push({
      id: "description-city",
      label: "Description says the city early",
      weight: 6,
      tab: "seo",
      status: verdict(early, description.toLowerCase().includes(input.cityName.toLowerCase())),
      detail: early
        ? "The city appears in the first line, which is the part a phone shows."
        : `Move ${input.cityName} nearer the start. On a phone only the first ninety characters or so are displayed.`,
    });
  }

  const slug = input.slug.trim();
  checks.push({
    id: "slug",
    label: "Web address is readable",
    weight: 6,
    tab: "seo",
    status: verdict(slug.length > 0 && slug.length <= 70, slug.length > 0 && slug.length <= 90),
    detail:
      slug.length === 0
        ? "No web address yet. Generate one from the address."
        : slug.length <= 70
          ? `/listing/${slug}`
          : `${slug.length} characters is long enough to be truncated in a shared link. Shorten it before publishing — afterwards it is permanent.`,
  });

  /* ── What the page itself contains ─────────────────────────────────── */

  const words = countWords(input.description ?? "");
  checks.push({
    id: "body",
    label: "Description is substantial",
    weight: 12,
    tab: "content",
    status: verdict(words >= 120, words >= 60),
    detail:
      words === 0
        ? "There is no description. This is the text a buyer reads and the text an assistant quotes — a listing without one is a photo gallery."
        : words >= 120
          ? `${words} words.`
          : `${words} words. Aim for 120 or more: enough to describe the layout, the lot and what was done to the house.`,
  });

  checks.push({
    id: "headline",
    label: "Headline written",
    weight: 5,
    tab: "content",
    status: (input.headline?.trim().length ?? 0) > 0 ? "pass" : "warn",
    detail:
      (input.headline?.trim().length ?? 0) > 0
        ? "Used as the page's heading and on the card."
        : "Optional, but it is the first line on the card and in a shared link.",
  });

  checks.push({
    id: "contractors-take",
    label: "The Contractor's Take",
    weight: 8,
    tab: "content",
    status: (input.contractorsTake?.trim().length ?? 0) > 0 ? "pass" : "warn",
    detail:
      (input.contractorsTake?.trim().length ?? 0) > 0
        ? "This is the part of the page no other agent's listing has, and it is what gets quoted."
        : "Your construction read on the roof, the panel and what a remodel would cost. It is the one thing on this page nobody else can write.",
  });

  /* ── Facts a rich result can display ──────────────────────────────── */

  const specs = [
    input.beds != null,
    input.baths != null,
    input.sqft != null,
    input.yearBuilt != null,
  ].filter(Boolean).length;

  checks.push({
    id: "specs",
    label: "Beds, baths, size and year",
    weight: 10,
    tab: "details",
    status: verdict(specs === 4, specs >= 2),
    detail:
      specs === 4
        ? "All four are set, so the structured data is complete."
        : `${specs} of 4 filled in. Each missing one is a field the structured data cannot publish and a filter this listing drops out of.`,
  });

  checks.push({
    id: "price",
    label: "Price set",
    weight: 6,
    tab: "basics",
    status: (input.status === "sold" ? input.soldPrice : input.price) ? "pass" : "warn",
    detail: (input.status === "sold" ? input.soldPrice : input.price)
      ? "Published in the structured data as an offer."
      : "Without a price the listing cannot appear in a price-filtered search or carry an offer in its structured data.",
  });

  const features = input.features?.filter((f) => f.trim() !== "").length ?? 0;
  checks.push({
    id: "features",
    label: "Features listed",
    weight: 4,
    tab: "details",
    status: verdict(features >= 3, features >= 1),
    detail:
      features >= 3
        ? `${features} features, which is what the amenity searches match on.`
        : "Add at least three. These are what somebody filtering for a fenced yard or a screened lanai is searching.",
  });

  /* ── Media ─────────────────────────────────────────────────────────── */

  checks.push({
    id: "photos",
    label: "Enough photographs",
    weight: 10,
    tab: "media",
    status: verdict(input.photoCount >= 6, input.photoCount >= 1),
    detail:
      input.photoCount === 0
        ? "No photographs. The first one is also the image used when the page is shared or shown as a rich result."
        : input.photoCount >= 6
          ? `${input.photoCount} of the 15 allowed.`
          : `${input.photoCount} photograph${input.photoCount === 1 ? "" : "s"}. Six or more is where a listing starts holding attention; fifteen is the limit.`,
  });

  if (input.photoCount > 0) {
    const missing = input.photoCount - input.photosWithAlt;
    checks.push({
      id: "alt-text",
      label: "Photographs have alt text",
      weight: 8,
      tab: "media",
      status: verdict(missing === 0, missing <= Math.floor(input.photoCount / 2)),
      detail:
        missing === 0
          ? "Every photograph is described, which is both an accessibility requirement and how they appear in image search."
          : `${missing} of ${input.photoCount} have no description. Admin → SEO can fill them from this listing's own details.`,
    });
  }

  /* ── Internal linking ─────────────────────────────────────────────── */

  checks.push({
    id: "community",
    label: "Linked to a community",
    weight: 4,
    tab: "basics",
    status: input.hasCommunity ? "pass" : "warn",
    detail: input.hasCommunity
      ? "The listing and the community page link to each other."
      : "Attaching a community gives this page a link from the community page, and gives the community page a current listing.",
  });

  return summarise(checks);
}

/* ── Articles ─────────────────────────────────────────────────────────────── */

export type ArticleAuditInput = ArticleFacts & {
  slug: string;
  metaTitle: string | null;
  metaDesc: string | null;
  coverKey: string | null;
  coverAlt: string | null;
  tags: string[];
  faqCount: number;
  bodyJson?: unknown;
};

export function auditArticle(input: ArticleAuditInput): SeoAudit {
  const checks: SeoCheck[] = [];
  const doc = analyzeDocument(input.bodyJson);
  // The document is authoritative when there is one; `body_text` is the fallback
  // for a form that has not loaded the editor yet.
  const words = doc.words > 0 ? doc.words : countWords(input.bodyText ?? "");

  const title = (input.metaTitle?.trim() || articleTitleFrom(input)).trim();

  checks.push({
    id: "title-length",
    label: "Title fits a search result",
    weight: 10,
    tab: "seo",
    status: verdict(title.length > 0 && title.length <= TITLE_MAX, title.length <= 55),
    detail:
      title.length <= TITLE_MAX
        ? `${title.length} characters, plus the site name.`
        : `${title.length} characters, so the end is replaced with an ellipsis in results. Write a shorter meta title — the headline on the page can stay as it is.`,
  });

  const description = input.metaDesc?.trim() ?? "";
  checks.push({
    id: "description-band",
    label: "Description is the right length",
    weight: 10,
    tab: "seo",
    status:
      description === ""
        ? "warn"
        : verdict(inBand(description), description.length >= 110 && description.length <= 165),
    detail:
      description === ""
        ? "Empty, so one is written on publish — from the answer-first block if there is one."
        : inBand(description)
          ? `${description.length} characters — inside the ${DESC_MIN}–${DESC_MAX} a result displays in full.`
          : `${description.length} characters, outside the ${DESC_MIN}–${DESC_MAX} a result displays in full.`,
  });

  checks.push({
    id: "excerpt",
    label: "Excerpt written",
    weight: 5,
    tab: "content",
    status: (input.excerpt?.trim().length ?? 0) > 0 ? "pass" : "warn",
    detail:
      (input.excerpt?.trim().length ?? 0) > 0
        ? "Shown on the card and used as the summary in the article's structured data."
        : "Used on the index cards and as a fallback description. The button beside the field writes one from the body.",
  });

  /* ── The body ──────────────────────────────────────────────────────── */

  checks.push({
    id: "length",
    label: "Long enough to be the answer",
    weight: 12,
    tab: "content",
    status: verdict(words >= 700, words >= 400),
    detail:
      words >= 700
        ? `${words} words.`
        : `${words} words. Seven hundred is roughly where an article stops being a summary of a subject and starts being the page somebody can stop at.`,
  });

  checks.push({
    id: "answer-first",
    label: "Opens with the answer",
    weight: 12,
    tab: "content",
    status: doc.hasAnswerFirst ? "pass" : "fail",
    detail: doc.hasAnswerFirst
      ? "The answer-first block is what an assistant quotes and what becomes the meta description."
      : "Add an answer-first block at the top — two or three sentences that answer the question outright. It is the single thing that decides whether an assistant can cite this page.",
  });

  const h2s = doc.headings.filter((h) => h.level === 2).length;
  checks.push({
    id: "headings",
    label: "Broken into sections",
    weight: 8,
    tab: "content",
    status: verdict(h2s >= 3, h2s >= 1),
    detail:
      h2s >= 3
        ? `${h2s} section headings.`
        : `${h2s} section heading${h2s === 1 ? "" : "s"}. Headings are how a reader scans and how a machine works out which part of the page answers which question.`,
  });

  const outline = headingOutlineIssue(doc.headings);
  if (doc.headings.length > 0) {
    checks.push({
      id: "outline",
      label: "Heading levels are in order",
      weight: 6,
      tab: "content",
      status: outline ? "fail" : "pass",
      detail:
        outline ??
        "Levels descend one at a time, so the page outline a screen reader and a crawler build is correct.",
    });
  }

  checks.push({
    id: "faq",
    label: "Questions answered on the page",
    weight: 10,
    tab: "content",
    status: verdict(input.faqCount >= 3, input.faqCount >= 1),
    detail:
      input.faqCount >= 3
        ? `${input.faqCount} questions, published on the page and as FAQ structured data.`
        : doc.questionHeadings.length > 0
          ? `${input.faqCount} added, and the body already has ${doc.questionHeadings.length} heading${doc.questionHeadings.length === 1 ? "" : "s"} phrased as a question. The suggest button will pair them with your own answers.`
          : "Three or more question-and-answer pairs give the page FAQ structured data, which is what a voice or chat answer is built from.",
  });

  checks.push({
    id: "internal-links",
    label: "Links to your own pages",
    weight: 10,
    tab: "content",
    status: verdict(doc.internalLinks.length >= 3, doc.internalLinks.length >= 1),
    detail:
      doc.internalLinks.length >= 3
        ? `${doc.internalLinks.length} internal links.`
        : `${doc.internalLinks.length}. Link the city, the service and any answer page you mention — that is how authority moves around the site and how a reader gets to the next step.`,
  });

  checks.push({
    id: "citations",
    label: "Cites a source",
    weight: 4,
    tab: "content",
    status: doc.externalLinks.length > 0 ? "pass" : "warn",
    detail:
      doc.externalLinks.length > 0
        ? `${doc.externalLinks.length} outbound citation${doc.externalLinks.length === 1 ? "" : "s"}.`
        : "A link to the VA, the county or Stellar MLS for a figure you quote is what makes the number checkable — by a reader and by an assistant deciding whether to trust the page.",
  });

  checks.push({
    id: "paragraphs",
    label: "Paragraphs stay readable",
    weight: 5,
    tab: "content",
    status: verdict(doc.longParagraphs === 0, doc.longParagraphs <= 2),
    detail:
      doc.longParagraphs === 0
        ? "No paragraph runs long enough to lose a reader on a phone."
        : `${doc.longParagraphs} paragraph${doc.longParagraphs === 1 ? " is" : "s are"} over ninety words. On a 360px screen that is fifteen unbroken lines.`,
  });

  /* ── Media and context ────────────────────────────────────────────── */

  checks.push({
    id: "cover",
    label: "Cover image with alt text",
    weight: 8,
    tab: "content",
    status: input.coverKey
      ? (input.coverAlt?.trim().length ?? 0) > 0
        ? "pass"
        : "fail"
      : "warn",
    detail: input.coverKey
      ? (input.coverAlt?.trim().length ?? 0) > 0
        ? "Used at the top of the article and as the image in a shared link."
        : "The cover image has no description. Add one — it is what a screen reader announces and what image search indexes."
      : "Without a cover image a shared link falls back to the site card, and the article index shows a placeholder.",
  });

  if (doc.images > 0) {
    const missing = doc.images - doc.imagesWithAlt;
    checks.push({
      id: "body-images",
      label: "Images in the body are described",
      weight: 6,
      tab: "content",
      status: missing === 0 ? "pass" : "fail",
      detail:
        missing === 0
          ? `All ${doc.images} described.`
          : `${missing} of ${doc.images} have no alt text.`,
    });
  }

  checks.push({
    id: "city",
    label: "Attached to a city",
    weight: 5,
    tab: "content",
    status: input.cityName ? "pass" : "warn",
    detail: input.cityName
      ? `Linked to ${input.cityName}, so the city hub lists it and the title can name it.`
      : "An article attached to a city is listed on that city's page and carries the place in its generated title.",
  });

  checks.push({
    id: "tags",
    label: "Tagged",
    weight: 4,
    tab: "content",
    status: verdict(input.tags.filter((t) => t.trim() !== "").length >= 2, input.tags.length >= 1),
    detail:
      input.tags.length >= 2
        ? `${input.tags.length} tags.`
        : "Two or more tags put the article on the related lists that link to it.",
  });

  return summarise(checks);
}

/** Wording for a score, so every surface describes the same number the same way. */
export function scoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 55) return "Needs work";
  return "Not ready";
}
