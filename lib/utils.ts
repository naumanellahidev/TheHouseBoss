import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/*
  tailwind-merge only knows Tailwind's default type scale. Our sizes are theme
  tokens (`--text-h2` → `text-h2`), and a `text-*` class it does not recognise
  as a size is filed as a COLOUR — so `cn("text-h2", "text-foreground-invert")`
  kept the colour and silently dropped the size. Every inverted SectionHeader
  heading rendered at body size because of it. Registering the scale here makes
  size and colour separate groups again.
*/
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        { text: ["display", "h1", "h2", "h3", "h4", "lead", "body", "overline"] },
      ],
    },
  },
});

/** Merge Tailwind classes with correct conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Single source of price formatting (CLAUDE.md § 5).
 * Never inline toLocaleString anywhere else.
 */
export function formatPrice(
  value: number | null | undefined,
  opts: { compact?: boolean } = {},
): string {
  if (value == null) return "Price on request";
  if (opts.compact && value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  }
  if (opts.compact && value >= 1_000) {
    return `$${Math.round(value / 1_000)}k`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** 2410 -> "2,410" */
export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}

/** 2.5 -> "2.5", 3 -> "3" */
export function formatBaths(value: number | null | undefined): string {
  if (value == null) return "—";
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/** URL-safe slug from arbitrary text. Never used for storage keys (HR4). */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
