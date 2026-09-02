#!/usr/bin/env node
/**
 * Launch guard: fails if any client-supplied value is still a placeholder.
 *
 * lib/site-config.ts marks unknown values as PENDING so the site renders
 * cleanly during the build. None may survive to production.
 *
 * Run: npm run check:pending   (a Phase 7 launch-checklist item)
 */
import { readFile } from "node:fs/promises";

const FILE = "lib/site-config.ts";
const source = await readFile(FILE, "utf8");

const pending = source
  .split("\n")
  .map((line, i) => ({ line: i + 1, text: line.trim() }))
  .filter(
    ({ text }) =>
      text.includes("PENDING") &&
      !text.startsWith("*") &&
      !text.startsWith("//") &&
      !text.startsWith("export const PENDING") &&
      !text.includes("isPending") &&
      !text.includes("value === PENDING"),
  );

if (pending.length === 0) {
  console.log("✓ pending guard: every client value is supplied");
  process.exit(0);
}

console.error(
  `\n✗ pending guard: ${pending.length} value(s) still awaiting the client\n`,
);
for (const p of pending) console.error(`  ${FILE}:${p.line}  ${p.text}`);
console.error(
  "\n  These are tracked in PROGRESS.md under 'Blocked on client content'.",
);
console.error("  This check is expected to fail until Phase 7.\n");
process.exit(1);
