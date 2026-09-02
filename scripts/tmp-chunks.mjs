import { gzipSync } from "node:zlib";
const BASE = "http://localhost:3123";
const html = await (await fetch(BASE + "/")).text();
const srcs = [...new Set([...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]))];
const rows = [];
for (const src of srcs) {
  const buf = Buffer.from(await (await fetch(src.startsWith("http") ? src : BASE + src)).arrayBuffer());
  rows.push({ src: src.replace(/^\/_next\/static\//, ""), gzipKB: +(gzipSync(buf).length / 1024).toFixed(1) });
}
rows.sort((a, b) => b.gzipKB - a.gzipKB);
for (const r of rows) console.log(String(r.gzipKB).padStart(8), r.src);
console.log("total", rows.reduce((n, r) => n + r.gzipKB, 0).toFixed(1), "kB gzipped");
