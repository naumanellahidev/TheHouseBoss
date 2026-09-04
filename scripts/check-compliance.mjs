#!/usr/bin/env node
/**
 * Compliance guard — the launch checklist in docs/09-compliance-legal.md § 9,
 * automated for every item a machine can actually decide.
 *
 * The items it CANNOT decide are listed at the end as an explicit hand-off,
 * because a checklist that silently omits the human items reads as though they
 * passed. Broker sign-off is not something a script can grant.
 *
 *   BASE_URL=http://localhost:3111 node scripts/check-compliance.mjs
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** A representative page of every public type. */
const PAGES = [
  "/",
  "/search",
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
  "/communities/heathrow",
  "/sanford",
  "/listing/123-lakeview-dr-lake-mary",
  "/legal/privacy",
  "/legal/terms",
  "/legal/accessibility",
];

/**
 * The expected disclosure values.
 *
 * Read from `site_settings` when the service key is available, falling back to
 * the launch values. This used to be four hardcoded literals, which meant the
 * guard asserted the values the site was BUILT with rather than the values it
 * currently renders — so the moment an administrator edited the brokerage name
 * in the dashboard, this script failed on all 21 pages with "could not isolate
 * the brokerage and agent elements" and reported a compliance breach that did
 * not exist.
 *
 * The fallbacks are kept deliberately. Without a service key (CI, a fresh
 * clone) the guard still runs and still checks something real; it simply checks
 * the launch values.
 */
async function expectedDisclosure() {
  const fallback = {
    agent: "Krisi Kakarova",
    brokerage: "World Properties Group",
    re: "SL3327932",
    contractor: "CRC1335654",
  };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("  (no service key — checking the launch values)");
    return fallback;
  }

  try {
    const response = await fetch(
      `${url}/rest/v1/site_settings?id=eq.1&select=legal_name,brokerage_name,license_re,license_contractor`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    const [row] = await response.json();
    return {
      agent: row?.legal_name || fallback.agent,
      brokerage: row?.brokerage_name || fallback.brokerage,
      re: row?.license_re || fallback.re,
      contractor: row?.license_contractor || fallback.contractor,
    };
  } catch (error) {
    console.log(`  (settings unreadable: ${error.message} — using launch values)`);
    return fallback;
  }
}

const expected = await expectedDisclosure();
const AGENT_NAME = expected.agent;
const BROKERAGE = expected.brokerage;
const RE_LICENCE = expected.re;
const CONTRACTOR_LICENCE = expected.contractor;

const failures = [];
const notes = [];

const strip = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<style[\s\S]*?<\/style>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/\s+/g, " ");

console.log(`checking ${BASE}\n`);

/* ── 1. Florida advertising disclosure, on EVERY page ────────────────────── */

let checked = 0;

for (const path of PAGES) {
  let html;
  try {
    const response = await fetch(`${BASE}${path}`);
    if (response.status !== 200) {
      failures.push(`${path}: returned ${response.status}`);
      continue;
    }
    html = await response.text();
  } catch (error) {
    failures.push(`${path}: unreachable (${error.message})`);
    continue;
  }

  checked += 1;
  const text = strip(html);

  // HR15 — the disclosure is on every public page.
  for (const [label, needle] of [
    ["agent name", AGENT_NAME],
    ["brokerage", BROKERAGE],
    ["real estate licence", RE_LICENCE],
    ["contractor licence", CONTRACTOR_LICENCE],
  ]) {
    if (!text.includes(needle)) {
      failures.push(`${path}: compliance footer is missing the ${label} (${needle})`);
    }
  }

  // Fair Housing marks (docs/09 § 2).
  if (!/Equal Housing Opportunity/i.test(text)) {
    failures.push(`${path}: no Equal Housing Opportunity mark`);
  }

  // The REALTOR mark may only be used if NAR membership is confirmed. Until
  // that answer arrives it must not appear (docs/09 § 2, open decision 4).
  if (/REALTOR®/.test(text)) {
    failures.push(
      `${path}: uses the REALTOR® mark, which requires confirmed NAR membership`,
    );
  }

  // No placeholder ever reaches a public page.
  //
  // PENDING is matched case-SENSITIVELY on purpose: it is the uppercase
  // sentinel from lib/site-config.ts, and "Pending" is a legitimate listing
  // status that appears as a badge on the search page.
  if (/\bPENDING\b/.test(text)) {
    failures.push(`${path}: contains the PENDING sentinel from site-config`);
  }
  for (const placeholder of ["lorem ipsum", "XXX-XXX", "TODO:", "FIXME"]) {
    if (text.toLowerCase().includes(placeholder.toLowerCase())) {
      failures.push(`${path}: contains the placeholder "${placeholder}"`);
    }
  }
}

console.log(`  disclosure and Fair Housing: ${checked} pages checked`);

/* ── 2. FREC 61J2-10.026 — brokerage sized at least as prominently ───────── */

/**
 * The rule is about rendered prominence, so this reads the actual class names
 * the compliance footer uses rather than trusting that it still does what it
 * did when it was written. It is the one place in the codebase where a design
 * change is also a regulatory change.
 */
const SIZE_ORDER = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl"];
const WEIGHT_ORDER = ["font-normal", "font-medium", "font-semibold", "font-bold"];

try {
  const html = await (await fetch(`${BASE}/`)).text();

  // <ComplianceFooter /> carries a data-compliance-footer hook precisely so
  // this check can find it without depending on the surrounding markup.
  const start = html.indexOf("data-compliance-footer");
  if (start === -1) {
    failures.push(
      "compliance footer: data-compliance-footer not found — is <ComplianceFooter /> still rendered?",
    );
  } else {
    const region = html.slice(start, start + 4000);

    // Each name sits in its own <p>, so the classes on that element are the
    // ones that actually govern its rendering.
    const paragraphs = [...region.matchAll(/<p class="([^"]*)"[^>]*>([\s\S]*?)<\/p>/g)].map(
      (m) => ({ classes: m[1], text: m[2].replace(/<[^>]+>/g, "") }),
    );

    const brokerageEl = paragraphs.find((p) => p.text.includes(BROKERAGE));
    const agentEl = paragraphs.find(
      (p) => p.text.includes(AGENT_NAME) && !p.text.includes(BROKERAGE),
    );

    if (!brokerageEl || !agentEl) {
      failures.push(
        "compliance footer: could not isolate the brokerage and agent elements to compare",
      );
    } else {
      const rank = (classes, order, fallback) => {
        const found = order.filter((token) =>
          new RegExp(`(^| )${token}( |$)`).test(classes),
        );
        return found.length ? order.indexOf(found[found.length - 1]) : fallback;
      };

      const brokerSize = rank(brokerageEl.classes, SIZE_ORDER, 2);
      const agentSize = rank(agentEl.classes, SIZE_ORDER, 2);
      const brokerWeight = rank(brokerageEl.classes, WEIGHT_ORDER, 0);
      const agentWeight = rank(agentEl.classes, WEIGHT_ORDER, 0);

      if (brokerSize < agentSize) {
        failures.push(
          `FREC 61J2-10.026: the brokerage name renders SMALLER than the agent name (${SIZE_ORDER[brokerSize]} vs ${SIZE_ORDER[agentSize]})`,
        );
      } else if (brokerWeight < agentWeight) {
        failures.push(
          `FREC 61J2-10.026: the brokerage name renders LIGHTER than the agent name (${WEIGHT_ORDER[brokerWeight]} vs ${WEIGHT_ORDER[agentWeight]})`,
        );
      } else {
        console.log(
          `  FREC sizing: brokerage ${SIZE_ORDER[brokerSize]}/${WEIGHT_ORDER[brokerWeight]} >= agent ${SIZE_ORDER[agentSize]}/${WEIGHT_ORDER[agentWeight]}`,
        );
      }
    }
  }
} catch (error) {
  failures.push(`compliance footer check failed: ${error.message}`);
}

/* ── 3. Disclaimers, per the docs/09 § 6 table ───────────────────────────── */

const DISCLAIMERS = [
  ["/guides/va-home-buyer", /not lending advice/i],
  ["/guides/va-home-buyer", /Department of Veterans Affairs/i],
  ["/assumable-mortgage-homes", /not lending advice/i],
  ["/assumable-mortgage-homes", /not legal advice/i],
  ["/new-construction-representation", /not legal advice/i],
  ["/sell-your-central-florida-home", /not an appraisal/i],
  ["/market-updates", /not an appraisal/i],
  ["/listing/123-lakeview-dr-lake-mary", /not legal advice/i],
];

for (const [path, pattern] of DISCLAIMERS) {
  try {
    const text = strip(await (await fetch(`${BASE}${path}`)).text());
    if (!pattern.test(text)) {
      failures.push(`${path}: missing the disclaimer matching ${pattern}`);
    }
  } catch (error) {
    failures.push(`${path}: unreachable (${error.message})`);
  }
}

console.log(`  disclaimers: ${DISCLAIMERS.length} placements checked`);

/* ── 4. Reviews — no AggregateRating, ever ───────────────────────────────── */

try {
  const html = await (await fetch(`${BASE}/reviews`)).text();
  if (html.includes("AggregateRating") || html.includes("aggregateRating")) {
    failures.push("/reviews: emits AggregateRating, which docs/09 § 7 forbids");
  } else {
    console.log("  reviews: no AggregateRating markup");
  }
} catch (error) {
  failures.push(`/reviews: unreachable (${error.message})`);
}

/* ── 5. Legal pages exist, are dated, and are linked ─────────────────────── */

for (const path of ["/legal/privacy", "/legal/terms", "/legal/accessibility"]) {
  try {
    const text = strip(await (await fetch(`${BASE}${path}`)).text());
    if (!/Last (updated|reviewed):/i.test(text)) {
      failures.push(`${path}: carries no date`);
    }
  } catch (error) {
    failures.push(`${path}: unreachable (${error.message})`);
  }
}

try {
  const html = await (await fetch(`${BASE}/`)).text();
  for (const path of ["/legal/privacy", "/legal/terms", "/legal/accessibility"]) {
    if (!html.includes(`href="${path}"`)) {
      failures.push(`the footer does not link to ${path}`);
    }
  }
  console.log("  legal pages: present, dated and linked");
} catch (error) {
  failures.push(`footer link check failed: ${error.message}`);
}

/* ── 6. Admin is not crawlable ───────────────────────────────────────────── */

try {
  const robots = await (await fetch(`${BASE}/robots.txt`)).text();
  if (!/Disallow: \/admin/i.test(robots)) {
    failures.push("robots.txt does not disallow /admin");
  }

  const login = await (await fetch(`${BASE}/admin/login`)).text();
  if (!/noindex/i.test(login)) failures.push("/admin/login is not noindex");

  console.log("  admin: disallowed in robots.txt and noindex");
} catch (error) {
  failures.push(`admin crawlability check failed: ${error.message}`);
}

/* ── report ──────────────────────────────────────────────────────────────── */

for (const note of notes) console.log(`  ! ${note}`);

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} compliance failure(s):\n`);
  for (const failure of failures) console.error(`  ${failure}`);
  process.exit(1);
}

console.log("\n✓ every automatable compliance item passes");
console.log(`
STILL REQUIRES A PERSON — these cannot be checked by a script, and none of
them is implied by the pass above:

  [ ] Broker at ${BROKERAGE} has reviewed and approved the site
  [ ] "The House Boss" confirmed registered with the DBPR as a trade name
  [ ] NAR membership confirmed, or the REALTOR® mark deliberately left unused
  [ ] Photo rights confirmed for every image on the site
  [ ] Every listing description read for Fair Housing language
  [ ] Client has acknowledged the Stellar MLS deferral in writing
  [ ] Double opt-in and unsubscribe tested end to end once Resend is live
  [ ] A physical postal address present in every marketing email

  Tracked in docs/15-client-launch-checklist.md.`);
