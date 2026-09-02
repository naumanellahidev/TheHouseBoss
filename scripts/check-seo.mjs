#!/usr/bin/env node
/**
 * SEO guard — the Phase 6 Definition of Done, asserted rather than eyeballed.
 *
 * Crawls a running server and checks, for every page that is supposed to be
 * indexed:
 *
 *   1. it is NOT noindex — the DoD item "no noindex on any page that should be
 *      indexed, asserted in a build check"
 *   2. its <title> is unique across the site and within the length budget
 *   3. its meta description is present and 140–158 characters
 *   4. it has a canonical URL
 *   5. its content is in the HTML SOURCE, not assembled by JavaScript — an
 *      assistant that cannot see the text cannot cite it (docs/08 § 2)
 *
 * And, for the pages that must NOT be indexed, that they say so.
 *
 *   BASE_URL=http://localhost:3111 node scripts/check-seo.mjs
 *
 * This is a check against a running build, not a static analysis, because the
 * thing that matters is what a crawler actually receives.
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Pages that must be indexable. */
const INDEXABLE = [
  "/",
  "/search",
  "/search/new-construction",
  "/sold",
  "/about",
  "/contact",
  "/reviews",
  "/guides",
  "/guides/va-home-buyer",
  "/assumable-mortgage-homes",
  "/new-construction-representation",
  "/sell-your-central-florida-home",
  "/market-updates",
  "/lake-mary",
  "/lake-mary/homes-for-sale",
  "/lake-mary/communities",
  "/lake-mary/blog",
  "/longwood",
  "/longwood/homes-for-sale",
  "/sanford",
  "/oviedo",
  "/communities/heathrow",
  "/listing/123-lakeview-dr-lake-mary",
];

/** Pages that must NOT be indexed. */
const NOINDEX = [
  "/legal/privacy",
  "/legal/terms",
  "/legal/accessibility",
  "/admin/login",
  // A filtered search is noindex, follow by the canonical policy (docs/08 § 5).
  "/search?city=lake-mary&beds=3",
];

/** Substrings that must appear in the raw HTML of a given page. */
const MUST_CONTAIN = {
  "/guides/va-home-buyer": ["Minimum Property Requirements", "Certificate of Eligibility"],
  "/listing/123-lakeview-dr-lake-mary": ["RealEstateListing", "Lakeview"],
  "/lake-mary": ["FAQPage", "Lake Mary"],
  "/sanford": ["Where Sanford sits"],
  "/about": ["hasCredential", "CRC1335654"],
};

const TITLE_MAX = 60;
const DESC_MIN = 140;
const DESC_MAX = 158;

const problems = [];
const warnings = [];
const titles = new Map();

const pick = (html, re) => html.match(re)?.[1]?.trim() ?? null;

const decode = (value) =>
  value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&#x2F;/g, "/");

async function fetchPage(path) {
  const response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { status: response.status, html: await response.text() };
}

console.log(`checking ${BASE}\n`);

for (const path of INDEXABLE) {
  let page;
  try {
    page = await fetchPage(path);
  } catch (error) {
    problems.push(`${path}: unreachable (${error.message})`);
    continue;
  }

  if (page.status !== 200) {
    problems.push(`${path}: expected 200, got ${page.status}`);
    continue;
  }

  const { html } = page;

  // 1. noindex
  const robots = pick(html, /<meta name="robots" content="([^"]*)"/i);
  if (robots && /noindex/i.test(robots)) {
    problems.push(`${path}: is noindex but should be indexable ("${robots}")`);
  }

  // 2. title
  const title = decode(pick(html, /<title>([^<]*)<\/title>/i) ?? "");
  if (!title) {
    problems.push(`${path}: no <title>`);
  } else {
    if (title.length > TITLE_MAX) {
      warnings.push(`${path}: title is ${title.length} chars (over ${TITLE_MAX}) — "${title}"`);
    }
    const seen = titles.get(title);
    if (seen) problems.push(`${path}: title is identical to ${seen} — "${title}"`);
    else titles.set(title, path);
  }

  // 3. description
  const description = decode(
    pick(html, /<meta name="description" content="([^"]*)"/i) ?? "",
  );
  if (!description) {
    problems.push(`${path}: no meta description`);
  } else if (description.length < DESC_MIN || description.length > DESC_MAX) {
    warnings.push(
      `${path}: description is ${description.length} chars (want ${DESC_MIN}–${DESC_MAX})`,
    );
  }

  // 4. canonical
  if (!/<link rel="canonical"/i.test(html)) {
    problems.push(`${path}: no canonical link`);
  }

  // 5. content is in the source, not built by JavaScript
  for (const needle of MUST_CONTAIN[path] ?? []) {
    if (!html.includes(needle)) {
      problems.push(`${path}: "${needle}" is not in the HTML source`);
    }
  }
}

for (const path of NOINDEX) {
  let page;
  try {
    page = await fetchPage(path);
  } catch (error) {
    problems.push(`${path}: unreachable (${error.message})`);
    continue;
  }

  const robots = pick(page.html, /<meta name="robots" content="([^"]*)"/i);
  if (!robots || !/noindex/i.test(robots)) {
    problems.push(`${path}: should be noindex, got "${robots ?? "no robots meta"}"`);
  }
}

/* ── robots.txt and llms.txt ─────────────────────────────────────────────── */

const AI_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "GPTBot",
  "PerplexityBot",
  "ClaudeBot",
  "Google-Extended",
];

try {
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  for (const bot of AI_BOTS) {
    if (!robots.includes(bot)) problems.push(`robots.txt: ${bot} is not listed`);
  }
  if (!/Disallow: \/admin/i.test(robots)) {
    problems.push("robots.txt: /admin is not disallowed");
  }
  if (!/Sitemap:/i.test(robots)) problems.push("robots.txt: no Sitemap line");
} catch (error) {
  problems.push(`robots.txt: unreachable (${error.message})`);
}

try {
  const llms = await (await fetch(`${BASE}/llms.txt`)).text();
  for (const needle of [
    "The House Boss",
    "SL3327932",
    "CRC1335654",
    "Not a mortgage lender",
    "/guides/va-home-buyer",
  ]) {
    if (!llms.includes(needle)) problems.push(`llms.txt: missing "${needle}"`);
  }
} catch (error) {
  problems.push(`llms.txt: unreachable (${error.message})`);
}

/* ── sitemap ─────────────────────────────────────────────────────────────── */

try {
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (urls.length === 0) problems.push("sitemap.xml: no URLs");

  for (const path of ["/", "/search", "/lake-mary", "/guides/va-home-buyer"]) {
    if (!urls.some((url) => url.endsWith(path))) {
      problems.push(`sitemap.xml: missing ${path}`);
    }
  }

  // A sitemap must never list a page we tell crawlers not to index.
  for (const path of ["/legal/privacy", "/legal/terms", "/legal/accessibility"]) {
    if (urls.some((url) => url.endsWith(path))) {
      problems.push(`sitemap.xml: lists ${path}, which is noindex`);
    }
  }

  console.log(`  sitemap.xml: ${urls.length} URLs`);
} catch (error) {
  problems.push(`sitemap.xml: unreachable (${error.message})`);
}


/* ── Structured data ─────────────────────────────────────────────────────── */

/**
 * Required properties per type.
 *
 * This is not a substitute for Google's Rich Results Test, which needs a public
 * URL and cannot be pointed at localhost. It catches the failure that test
 * would report — a graph missing a property the type requires — at the point
 * where it is cheap to fix, and it runs on every build rather than once before
 * launch.
 */
const REQUIRED = {
  RealEstateAgent: ["name", "url", "areaServed"],
  WebSite: ["url", "potentialAction"],
  Person: ["name", "jobTitle", "hasCredential"],
  RealEstateListing: ["url", "name", "offers", "mainEntity"],
  Article: ["headline", "author", "publisher"],
  FAQPage: ["mainEntity"],
  BreadcrumbList: ["itemListElement"],
  Place: ["name", "url", "address"],
  ItemList: ["itemListElement"],
  Service: ["name", "provider", "serviceType"],
};

const GRAPH_PAGES = [
  "/",
  "/about",
  "/lake-mary",
  "/communities/heathrow",
  "/listing/123-lakeview-dr-lake-mary",
  "/guides/va-home-buyer",
  "/search",
];

let graphCount = 0;

for (const path of GRAPH_PAGES) {
  let html;
  try {
    ({ html } = await fetchPage(path));
  } catch {
    continue;
  }

  const blocks = [
    ...html.matchAll(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
    ),
  ].map((m) => m[1]);

  if (blocks.length === 0) {
    problems.push(`${path}: no JSON-LD at all`);
    continue;
  }

  for (const raw of blocks) {
    let graph;
    try {
      graph = JSON.parse(raw.replace(/\u003c/g, "<"));
    } catch (error) {
      problems.push(`${path}: JSON-LD does not parse (${error.message})`);
      continue;
    }

    graphCount += 1;

    const type = graph["@type"];
    if (!type) {
      problems.push(`${path}: a JSON-LD graph has no @type`);
      continue;
    }
    if (!graph["@context"]) {
      problems.push(`${path}: ${type} has no @context`);
    }

    for (const key of REQUIRED[type] ?? []) {
      if (graph[key] === undefined || graph[key] === null) {
        problems.push(`${path}: ${type} is missing required property "${key}"`);
      }
    }

    // An empty array satisfies "present" but fails in the Rich Results Test.
    for (const [key, value] of Object.entries(graph)) {
      if (Array.isArray(value) && value.length === 0) {
        problems.push(`${path}: ${type} has an empty "${key}" array`);
      }
    }

    // docs/09 § 7 — never, from this data.
    if (type === "AggregateRating" || graph.aggregateRating) {
      problems.push(`${path}: emits AggregateRating, which docs/09 § 7 forbids`);
    }
  }
}

console.log(`  structured data: ${graphCount} graphs parsed`);

/* ── report ──────────────────────────────────────────────────────────────── */

for (const warning of warnings) console.log(`  ! ${warning}`);

if (problems.length > 0) {
  console.error(`\n✗ ${problems.length} SEO problem(s):\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(
  `\n✓ ${INDEXABLE.length} indexable pages, ${NOINDEX.length} noindex pages,` +
    ` robots.txt, llms.txt and sitemap.xml all correct` +
    (warnings.length ? ` (${warnings.length} warning(s) above)` : ""),
);
