/** Measures what a browser actually downloads for each route. */
import { gzipSync } from "node:zlib";

const BASE = "http://localhost:3123";
const ROUTES = ["/", "/about", "/guides/va-home-buyer", "/dev/styleguide"];
const BUDGET_KB = 120;

const rows = [];
for (const route of ROUTES) {
  const html = await (await fetch(BASE + route)).text();
  const srcs = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  const unique = [...new Set(srcs)];
  let raw = 0, gz = 0;
  for (const src of unique) {
    const url = src.startsWith("http") ? src : BASE + src;
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    raw += buf.length;
    gz += gzipSync(buf).length;
  }
  const htmlGz = gzipSync(Buffer.from(html)).length;
  rows.push({
    route,
    scripts: unique.length,
    jsRawKB: +(raw / 1024).toFixed(1),
    jsGzipKB: +(gz / 1024).toFixed(1),
    htmlGzipKB: +(htmlGz / 1024).toFixed(1),
  });
}

console.log(
  "route".padEnd(24) + "scripts".padStart(8) + "js raw".padStart(9) +
  "js gzip".padStart(9) + "html gzip".padStart(11) + "   budget",
);
let worst = 0;
for (const r of rows) {
  worst = Math.max(worst, r.jsGzipKB);
  console.log(
    r.route.padEnd(24) +
    String(r.scripts).padStart(8) +
    String(r.jsRawKB).padStart(9) +
    String(r.jsGzipKB).padStart(9) +
    String(r.htmlGzipKB).padStart(11) +
    (r.jsGzipKB <= BUDGET_KB ? "   ✓" : `   ✗ over ${BUDGET_KB}`),
  );
}
console.log(`\nworst first-load JS: ${worst} kB gzipped (budget ${BUDGET_KB} kB)`);
process.exit(worst <= BUDGET_KB ? 0 : 1);
