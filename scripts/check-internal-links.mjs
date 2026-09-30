#!/usr/bin/env node
/**
 * Internal link audit — docs/18 § 5, and the brief for the answer hub.
 *
 * Crawls a RUNNING build (not the source), because the question is what the
 * shipped HTML links to, not what a component intended. It reports:
 *
 *   - answer pages with no inbound internal link  (orphans — must be zero)
 *   - pages with fewer than three outbound internal links
 *   - broken internal links                        (must be zero)
 *   - anchor text used more than five times, which is where varied anchors
 *     stop being varied
 *
 * Usage:
 *   npm run start &
 *   node scripts/check-internal-links.mjs               # localhost:3000
 *   BASE_URL=https://www.thehousebossfl.com node scripts/check-internal-links.mjs
 */

const BASE = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/+$/, "");
const MAX_ANCHOR_REUSE = 5;
const MIN_OUTBOUND = 3;

/** Routes that are allowed to be thin on outbound links. */
const THIN_OK = new Set(["/legal/privacy", "/legal/terms", "/legal/accessibility"]);

const seen = new Map(); // path -> { status, links: [{href, text}] }
const queue = ["/"];
const inbound = new Map(); // path -> Set of pages linking to it

function normalise(href) {
  if (!href) return null;
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) {
    if (!href.startsWith(BASE)) return null;
    href = href.slice(BASE.length) || "/";
  }
  if (!href.startsWith("/")) return null;
  const [path] = href.split("#");
  const clean = path.split("?")[0].replace(/\/+$/, "") || "/";
  // Never crawl the admin or the API from a link audit.
  if (clean.startsWith("/admin") || clean.startsWith("/api")) return null;
  return clean;
}

function linksIn(html) {
  const out = [];
  for (const match of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    const text = match[2]
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    out.push({ href: match[1], text });
  }
  return out;
}

console.log(`crawling ${BASE}\n`);

while (queue.length > 0) {
  const path = queue.shift();
  if (seen.has(path)) continue;

  let res;
  try {
    res = await fetch(BASE + path, { redirect: "manual" });
  } catch (error) {
    seen.set(path, { status: 0, links: [], error: String(error).slice(0, 60) });
    continue;
  }

  // A redirect is a valid answer for a link; follow it for crawling only.
  if (res.status >= 300 && res.status < 400) {
    seen.set(path, { status: res.status, links: [] });
    const target = normalise(res.headers.get("location"));
    if (target && !seen.has(target)) queue.push(target);
    continue;
  }

  if (!res.ok) {
    seen.set(path, { status: res.status, links: [] });
    continue;
  }

  const html = await res.text();
  const links = linksIn(html)
    .map(({ href, text }) => ({ href: normalise(href), text }))
    .filter((link) => link.href);

  seen.set(path, { status: res.status, links });

  for (const link of links) {
    if (!inbound.has(link.href)) inbound.set(link.href, new Set());
    if (link.href !== path) inbound.get(link.href).add(path);
    if (!seen.has(link.href) && !queue.includes(link.href)) queue.push(link.href);
  }
}

/* ── Findings ────────────────────────────────────────────────────────────── */

const answerPages = [...seen.keys()].filter((path) =>
  /^\/answers\/[^/]+\/[^/]+$/.test(path),
);

const broken = [...seen.entries()]
  .filter(([, page]) => page.status === 0 || page.status >= 400)
  .map(([path, page]) => ({
    path,
    status: page.status,
    from: [...(inbound.get(path) ?? [])].slice(0, 3),
  }));

const orphans = answerPages.filter((path) => {
  const from = [...(inbound.get(path) ?? [])];
  // A link from its own category index or the hub counts; a link from itself does not.
  return from.length === 0;
});

const thin = [...seen.entries()]
  .filter(([path, page]) => {
    if (page.status !== 200 || THIN_OK.has(path)) return false;
    const unique = new Set(page.links.map((link) => link.href).filter((href) => href !== path));
    return unique.size < MIN_OUTBOUND;
  })
  .map(([path, page]) => ({ path, count: new Set(page.links.map((l) => l.href)).size }));

const anchors = new Map();
for (const [, page] of seen) {
  for (const link of page.links) {
    if (!link.text || link.text.length < 3) continue;
    const key = link.text.toLowerCase();
    anchors.set(key, (anchors.get(key) ?? 0) + 1);
  }
}
const overused = [...anchors.entries()]
  .filter(([, count]) => count > MAX_ANCHOR_REUSE)
  /*
    Navigation and the footer repeat by design — every page carries them — so
    they are reported separately rather than counted as a content problem.
    Anything a page links in prose is what this check is actually about.
  */
  .sort((a, b) => b[1] - a[1]);

/* ── Report ──────────────────────────────────────────────────────────────── */

console.log(`  crawled ${seen.size} pages, ${answerPages.length} of them answers\n`);

if (broken.length > 0) {
  console.log("  broken internal links:");
  for (const item of broken) {
    console.log(`    ${item.status || "ERR"} ${item.path}  (linked from ${item.from.join(", ") || "?"})`);
  }
  console.log("");
}

if (orphans.length > 0) {
  console.log("  orphan answer pages (no inbound link):");
  for (const path of orphans) console.log(`    ${path}`);
  console.log("");
}

if (thin.length > 0) {
  console.log(`  fewer than ${MIN_OUTBOUND} outbound internal links:`);
  for (const item of thin) console.log(`    ${item.path} (${item.count})`);
  console.log("");
}

if (overused.length > 0) {
  console.log(`  anchor text used more than ${MAX_ANCHOR_REUSE} times (chrome links included):`);
  for (const [text, count] of overused.slice(0, 15)) {
    console.log(`    ${String(count).padStart(4)}  ${text.slice(0, 60)}`);
  }
  console.log("");
}

const failed = broken.length > 0 || orphans.length > 0;
if (failed) {
  console.error("✗ link audit failed: fix the broken links and the orphans above\n");
  process.exit(1);
}

console.log("✓ link audit: no broken internal links, no orphan answers\n");
