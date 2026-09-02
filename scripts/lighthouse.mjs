#!/usr/bin/env node
/**
 * Lighthouse across every public page type — Phase 7 task 5.
 *
 * The roadmap's Definition of Done names five page types and two form factors,
 * so this runs all ten rather than spot-checking the home page. It fails on any
 * category below its threshold, which makes it usable as a launch gate rather
 * than as a number somebody once quoted in a status update.
 *
 *   BASE_URL=http://localhost:3111 node scripts/lighthouse.mjs
 *   ... --only=perf        one category, for quick iteration
 *   ... --form=mobile      one form factor
 *   ... --runs=3           median of N runs (see the note on variance below)
 *
 * VARIANCE. Lighthouse on a developer machine measures the machine as much as
 * the site: a background build or an antivirus scan moves Performance by 20
 * points. Accessibility, Best Practices and SEO are deterministic and are the
 * scores worth gating on here. Performance is recorded, and the number that
 * decides launch is the one measured against the Vercel deployment, on Vercel's
 * hardware, with the CDN in front of it. That is stated in docs/17 rather than
 * left as a footnote, because otherwise a red local Performance score gets
 * quietly re-run until it goes green.
 */
import { writeFileSync } from "node:fs";

import { launch } from "chrome-launcher";
import lighthouse from "lighthouse";

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

/** One representative URL per public page type. */
const PAGES = [
  ["home", "/"],
  ["search", "/search"],
  ["listing", "/listing/123-lakeview-dr-lake-mary"],
  ["city", "/lake-mary"],
  ["guide", "/guides/va-home-buyer"],
];

/** From docs/10-roadmap.md, Phase 7 Definition of Done. */
const THRESHOLDS = {
  performance: 90,
  accessibility: 95,
  "best-practices": 95,
  seo: 100,
};

const ONLY = arg("only", null);
const FORMS =
  arg("form", null) === "mobile"
    ? ["mobile"]
    : arg("form", null) === "desktop"
      ? ["desktop"]
      : ["mobile", "desktop"];
const RUNS = Number(arg("runs", "1"));

const CATEGORIES = ONLY
  ? Object.keys(THRESHOLDS).filter((c) => c.startsWith(ONLY))
  : Object.keys(THRESHOLDS);

const chrome = await launch({
  chromeFlags: [
    "--headless=new",
    "--disable-gpu",
    "--no-sandbox",
    // Extensions and the default profile both add noise to a cold measurement.
    "--disable-extensions",
    "--disable-background-networking",
  ],
  chromePath: process.env.CHROME_PATH,
});

const median = (numbers) =>
  [...numbers].sort((a, b) => a - b)[Math.floor(numbers.length / 2)];

const results = [];

try {
  for (const form of FORMS) {
    for (const [type, path] of PAGES) {
      const perRun = [];

      for (let run = 0; run < RUNS; run += 1) {
        const { lhr } = await lighthouse(
          `${BASE}${path}`,
          { port: chrome.port, output: "json", logLevel: "error" },
          {
            extends: "lighthouse:default",
            settings: {
              onlyCategories: CATEGORIES,
              formFactor: form,
              screenEmulation:
                form === "desktop"
                  ? { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false }
                  : { mobile: true, width: 412, height: 823, deviceScaleFactor: 1.75, disabled: false },
              throttling:
                form === "desktop"
                  ? { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1 }
                  : { rttMs: 150, throughputKbps: 1638.4, cpuSlowdownMultiplier: 4 },
            },
          },
        );

        perRun.push(lhr);
      }

      const scores = {};
      for (const category of CATEGORIES) {
        scores[category] = median(
          perRun.map((lhr) => Math.round((lhr.categories[category]?.score ?? 0) * 100)),
        );
      }

      const last = perRun[perRun.length - 1];
      const metric = (id) => last.audits[id]?.numericValue ?? null;

      results.push({
        type,
        path,
        form,
        scores,
        metrics: {
          lcp: metric("largest-contentful-paint"),
          cls: metric("cumulative-layout-shift"),
          tbt: metric("total-blocking-time"),
          fcp: metric("first-contentful-paint"),
        },
      });

      const line = CATEGORIES.map((c) => `${c.slice(0, 4)} ${String(scores[c]).padStart(3)}`).join("  ");
      console.log(`  ${form.padEnd(7)} ${type.padEnd(8)} ${line}`);
    }
  }
} finally {
  // chrome-launcher removes its temp profile on kill, and on Windows that
  // directory is still locked by the exiting process often enough that the
  // EPERM would otherwise crash the run *after* every measurement succeeded.
  try {
    await chrome.kill();
  } catch {
    /* the profile is under the OS temp dir; leaving it is harmless */
  }
}

/* ── report ──────────────────────────────────────────────────────────────── */

writeFileSync(
  "lighthouse-results.json",
  JSON.stringify({ base: BASE, takenAt: new Date().toISOString(), runs: RUNS, results }, null, 2),
);

const ms = (value) => (value === null ? "—" : `${(value / 1000).toFixed(1)}s`);

console.log("\n  metrics (mobile):");
for (const row of results.filter((r) => r.form === "mobile")) {
  console.log(
    `    ${row.type.padEnd(8)} LCP ${ms(row.metrics.lcp).padStart(6)}` +
      `  TBT ${String(Math.round(row.metrics.tbt ?? 0)).padStart(4)}ms` +
      `  CLS ${(row.metrics.cls ?? 0).toFixed(3)}`,
  );
}

const failures = [];
const perfFailures = [];

for (const row of results) {
  for (const category of CATEGORIES) {
    if (row.scores[category] < THRESHOLDS[category]) {
      const message = `${row.form}/${row.type}: ${category} ${row.scores[category]} < ${THRESHOLDS[category]}`;
      if (category === "performance") perfFailures.push(message);
      else failures.push(message);
    }
  }
}

console.log("");

if (failures.length > 0) {
  console.error(`✗ ${failures.length} deterministic score(s) below threshold:\n`);
  for (const failure of failures) console.error(`  ${failure}`);
}

if (perfFailures.length > 0) {
  console.error(
    `\n! ${perfFailures.length} Performance score(s) below ${THRESHOLDS.performance}:\n`,
  );
  for (const failure of perfFailures) console.error(`  ${failure}`);
  console.error(
    "\n  Performance measured on this machine is not the launch number. Re-run\n" +
      "  against the Vercel deployment before treating it as a pass or a fail:\n" +
      "  BASE_URL=https://thehousebossfl.com node scripts/lighthouse.mjs",
  );
}

if (failures.length === 0 && perfFailures.length === 0) {
  console.log("✓ every page type meets every threshold");
}

console.log("\n  full results: lighthouse-results.json");

// Accessibility, Best Practices and SEO are reproducible, so they gate.
// Performance is reported loudly and does not, for the reason above.
process.exit(failures.length > 0 ? 1 : 0);
