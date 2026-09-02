#!/usr/bin/env node
/**
 * Rasterises app/icon.svg into the binary icon formats browsers still ask for.
 *
 *   app/apple-icon.png   180x180  iOS home screen
 *   public/favicon.ico    32x32   the request every browser makes anyway
 *
 * Uses the Chromium that Playwright already installed, so there is no image
 * dependency in the runtime bundle. Re-run this when the client supplies the
 * real logo:
 *
 *   PLAYWRIGHT_BROWSERS_PATH=D:/ms-playwright node scripts/generate-icons.mjs
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const SVG = await readFile("app/icon.svg", "utf8");

async function render(size) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: size, height: size },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<!doctype html><style>
       html,body{margin:0;padding:0;width:${size}px;height:${size}px}
       svg{display:block;width:${size}px;height:${size}px}
     </style>${SVG}`,
    { waitUntil: "load" },
  );
  const png = await page.screenshot({ omitBackground: false });
  await browser.close();
  return png;
}

/** Minimal ICO container around a single embedded PNG. */
function pngToIco(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0); // width
  entry.writeUInt8(size >= 256 ? 0 : size, 1); // height
  entry.writeUInt8(0, 2); // palette
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8); // payload size
  entry.writeUInt32LE(header.length + entry.length, 12); // payload offset

  return Buffer.concat([header, entry, png]);
}

await mkdir("public", { recursive: true });

const apple = await render(180);
await writeFile("app/apple-icon.png", apple);
console.log(`✓ app/apple-icon.png      180x180  ${apple.length} bytes`);

const small = await render(32);
const ico = pngToIco(small, 32);
await writeFile("public/favicon.ico", ico);
console.log(`✓ public/favicon.ico       32x32   ${ico.length} bytes`);
