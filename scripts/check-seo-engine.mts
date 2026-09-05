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

if (failures > 0) {
  console.error(`
✗ seo engine guard: ${failures} case(s) behaved wrongly
`);
  process.exit(1);
}

console.log(
  `
✓ seo engine guard: ${cases.length} validation rules behave as specified`,
);
