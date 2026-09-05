/**
 * Guard: the SEO keyword validator actually rejects (brief §57, §86).
 *
 *   npm run check:seo-engine
 *
 * ── Why this is a guard and not a Playwright test ─────────────────────────
 *
 * It imports `server-only` modules, which throw outside the `react-server`
 * condition, and it needs no browser. It sits with `check:tokens` and
 * `check:contrast` because it is the same kind of thing: a rule the codebase
 * claims to enforce, checked rather than trusted.
 *
 * ── Why it matters ────────────────────────────────────────────────────────
 *
 * When the engine ran across the real listings it produced 43 keywords and
 * rejected none — because every one was legitimately fine. A validator that
 * has never rejected anything is indistinguishable from a validator that
 * cannot. Each case below is a claim the system must refuse to publish: a
 * location it cannot support, a feature the record denies, a financing claim
 * with nothing behind it, the stuffed title §13 names explicitly.
 *
 * Adding a rule to `validate.ts` means adding a case here. A rule with no case
 * is a rule nobody has seen work.
 */

import { validateKeywords } from "@/lib/seo/engine/validate";
import type { GeoRelevance } from "@/lib/seo/geo/relevance";

const lakeMary: GeoRelevance = {
  entityId: "11111111-1111-4111-8111-111111111111",
  kind: "city", name: "Lake Mary", slug: "lake-mary",
  layer: 2, reason: "The property is in Lake Mary.", usableInCopy: true,
};
const seminole: GeoRelevance = {
  entityId: "22222222-2222-4222-8222-222222222222",
  kind: "county", name: "Seminole County", slug: "seminole-county",
  layer: 4, reason: "Lake Mary is in Seminole County.", usableInCopy: false,
};

const settings = {
  requireGeoRelevance: true,
  requireVerifiedFeatures: true,
  blockKeywordStuffing: true,
};

const cases: {
  label: string;
  shouldAccept: boolean;
  kw: Parameters<typeof validateKeywords>[0][number];
}[] = [
  { label: "a place the graph does not connect", shouldAccept: false, kw: {
      keyword: "homes for sale near Tampa FL", kind: "nearby", intent: "local",
      geoEntityId: "99999999-9999-4999-8999-999999999999",
      evidence: "n/a", score: 50 } },
  { label: "a place marked context-only", shouldAccept: false, kw: {
      keyword: "homes for sale in Seminole County FL", kind: "regional", intent: "local",
      geoEntityId: seminole.entityId, evidence: "n/a", score: 40 } },
  { label: "a location with no entity attached", shouldAccept: false, kw: {
      keyword: "homes for sale in Winter Park", kind: "nearby", intent: "local",
      geoEntityId: null, evidence: "n/a", score: 50 } },
  { label: "a feature the record denies", shouldAccept: false, kw: {
      keyword: "waterfront homes in Lake Mary FL", kind: "feature", intent: "property_feature",
      geoEntityId: lakeMary.entityId, evidence: "n/a", score: 80 } },
  { label: "an unsupported VA claim", shouldAccept: false, kw: {
      keyword: "VA homes for sale in Lake Mary FL", kind: "intent", intent: "va",
      geoEntityId: lakeMary.entityId, evidence: "n/a", score: 80 } },
  { label: "VA mentioned under the wrong intent", shouldAccept: false, kw: {
      keyword: "VA approved homes Lake Mary FL", kind: "feature", intent: "property_feature",
      geoEntityId: lakeMary.entityId, evidence: "n/a", score: 80 } },
  { label: "subjective filler", shouldAccept: false, kw: {
      keyword: "luxury homes for sale in Lake Mary FL", kind: "primary", intent: "transactional",
      geoEntityId: lakeMary.entityId, evidence: "n/a", score: 90 } },
  { label: "the §13 stuffed title", shouldAccept: false, kw: {
      keyword: "Lake Mary homes for sale Lake Mary FL real estate", kind: "primary", intent: "transactional",
      geoEntityId: lakeMary.entityId, evidence: "n/a", score: 90 } },
  { label: "no evidence", shouldAccept: false, kw: {
      keyword: "homes for sale in Lake Mary FL", kind: "primary", intent: "transactional",
      geoEntityId: lakeMary.entityId, evidence: "  ", score: 90 } },
  { label: "a valid one, for contrast", shouldAccept: true, kw: {
      keyword: "pool homes for sale in Lake Mary FL", kind: "feature", intent: "property_feature",
      geoEntityId: lakeMary.entityId, evidence: "The listing records a pool.", score: 86 } },
];

const verified = new Set(["pool", "beds"]);   // no waterfront, no va_eligible

let failures = 0;

for (const c of cases) {
  const r = validateKeywords([c.kw], {
    geo: [lakeMary, seminole],
    verifiedFeatures: verified,
    settings,
  });

  const accepted = r.accepted.length > 0;
  const ok = accepted === c.shouldAccept;
  if (!ok) failures += 1;

  const mark = ok ? "✓" : "✗";
  const verdict = accepted ? "accepted" : "rejected";
  console.log(`  ${mark} ${verdict.padEnd(9)} ${c.label}`);
  if (!ok) {
    console.log(
      `      expected it to be ${c.shouldAccept ? "accepted" : "rejected"}`,
    );
  }
  if (!accepted && r.rejected[0]) {
    console.log(`      ↳ ${r.rejected[0].reason}`);
  }
}

/*
  No summary here.

  There was one, and it printed "N validation rules behave as specified" before
  the FAQ and alt-text checks below had run — so a failure in those produced a
  success line followed by a failure. The summary belongs after every check,
  which is at the bottom of the file.
*/
const validationCases = cases.length;

/* ── §21 FAQ discovery, and §65 alt text ─────────────────────────────────── */

/*
  Both of these exist to NOT invent things, so the cases that matter are the
  ones where they decline. A generator that always produces output is easy to
  demonstrate and impossible to trust.
*/

const { suggestFaqFromDocument } = await import("@/lib/seo/engine/faq");

const doc = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "What should buyers know about new construction?" }] },
    { type: "paragraph", content: [{ type: "text", text: "The sales office works for the builder, and registration on the first visit is what governs whether you can be represented at all." }] },
    // A question with nothing under it — must be skipped.
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Is Lake Mary a good area for buyers?" }] },
    { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "Where to start" }] },
    { type: "paragraph", content: [{ type: "text", text: "Somewhere sensible, with enough words to clear the minimum length that this check enforces." }] },
  ],
};

const faqs = suggestFaqFromDocument(doc);
const faqOk =
  faqs.length === 1 &&
  faqs[0].q.startsWith("What should buyers know") &&
  !faqs.some((f) => f.q.startsWith("Is Lake Mary")) &&
  !faqs.some((f) => f.q === "Where to start");

console.log(
  `\n  ${faqOk ? "\u2713" : "\u2717"} FAQ discovery takes answered questions only`,
);
if (!faqOk) {
  console.error(`      got ${faqs.length}: ${faqs.map((f) => f.q).join(" | ")}`);
  failures += 1;
}

const { suggestAltText } = await import("@/lib/seo/engine/alt-text");

const fakeListing = {
  address: "123 Lakeview Dr",
  city: { name: "Lake Mary" },
  community: null,
  photos: [
    { alt: "" },
    { alt: "A written description somebody typed" },
    { alt: "  " },
  ],
} as unknown as Parameters<typeof suggestAltText>[0];

const alts = suggestAltText(fakeListing);
const altOk =
  alts.length === 2 &&
  alts[0].index === 0 &&
  alts[1].index === 2 &&
  // Nothing has seen the image, so nothing may claim what is in it.
  !alts.some((a) => /pool|granite|kitchen|spacious|modern|beautiful/i.test(a.suggestion));

console.log(`  ${altOk ? "\u2713" : "\u2717"} Alt text skips written descriptions and claims no content`);
if (!altOk) {
  console.error(`      got: ${alts.map((a) => `${a.index}:${a.suggestion}`).join(" | ")}`);
  failures += 1;
}

if (failures > 0) {
  console.error(`
✗ seo engine guard: ${failures} check(s) behaved wrongly
`);
  process.exit(1);
}

console.log(
  `
✓ seo engine guard: ${validationCases} validation rules, FAQ discovery ` +
    "and alt-text suggestion all behave as specified",
);
