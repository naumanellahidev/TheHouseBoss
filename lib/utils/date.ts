import { siteConfig } from "@/lib/site-config";

/**
 * THE date formatter (CLAUDE.md § 5).
 *
 * Everything is stored as `timestamptz` and rendered in `America/New_York`,
 * never in the viewer's timezone. A Florida real-estate site showing "sold
 * yesterday" to someone in Berlin because their clock is six hours ahead is a
 * factual error about a transaction date.
 *
 * Pinning the timezone also makes server and client output identical, which is
 * what stops React hydration mismatches on any date rendered inside a client
 * component.
 */

const TZ = siteConfig.timezone;

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** "12 September 2026" / "12 Sep 2026, 4:30 pm" */
export function formatDateTime(
  value: string | Date | null | undefined,
  opts: { dateOnly?: boolean; long?: boolean } = {},
): string {
  const date = toDate(value);
  if (!date) return "—";

  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    day: "numeric",
    month: opts.long ? "long" : "short",
    year: "numeric",
    ...(opts.dateOnly
      ? {}
      : { hour: "numeric", minute: "2-digit", hour12: true }),
  }).format(date);
}

/** "Sep 12, 2026" — the compact form used in tables. */
export function formatDate(value: string | Date | null | undefined): string {
  return formatDateTime(value, { dateOnly: true });
}

/** ISO date for a <time datetime> attribute and for JSON-LD. */
export function isoDate(value: string | Date | null | undefined): string | null {
  return toDate(value)?.toISOString() ?? null;
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

/**
 * "3 hours ago", "in 2 days".
 *
 * Used in the admin only. It is deliberately absent from public pages: a
 * relative timestamp on a listing hides the actual date, and every statistic on
 * this site has to display the date it was true (docs/14 § 1, rule 4).
 */
export function relativeTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";

  const diff = date.getTime() - Date.now();
  const abs = Math.abs(diff);

  if (abs < 60_000) return "just now";

  const formatter = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  for (const [unit, ms] of UNITS) {
    if (abs >= ms) return formatter.format(Math.round(diff / ms), unit);
  }
  return "just now";
}

/**
 * "2026-09-13" — the calendar day in New York, for grouping rows by day.
 *
 * `en-CA` because it is the locale whose short date is already ISO order, so
 * the string sorts and compares correctly without reassembly.
 */
export function dayKey(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** "Sep 13" from a `dayKey`. Read as UTC, because the key is already a New York day. */
export function formatShortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** "Saturday, September 13" in New York. */
export function formatLongDay(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

/** 0–23, the hour in New York — for "Good morning" on the dashboard. */
export function hourInNewYork(value: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      hour: "numeric",
      hourCycle: "h23",
    }).format(value),
  );
}

/** "5m", "3h", "2d", "6w" — for a time rail with room for a few characters. */
export function compactAgo(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/** "Saved 2 min ago" for the editor's autosave indicator (docs/06 § 4). */
export function shortAgo(value: Date | null): string {
  if (!value) return "";
  const seconds = Math.round((Date.now() - value.getTime()) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}
