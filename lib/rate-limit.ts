/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately not Redis. This site runs on a single small Vercel project with
 * one admin and modest public traffic; a per-instance limiter stops the abuse
 * that actually happens (a bot hammering /api/leads, a runaway upload loop)
 * without adding a paid dependency to a $20/month budget.
 *
 * Known limit, stated rather than hidden: Vercel may run several lambda
 * instances, so the effective ceiling is `limit x instances`. For the numbers
 * in docs/09 § 5 (5 leads per IP per hour) that is an acceptable slack. If real
 * spam appears, the escalation is Upstash Redis behind this same interface, not
 * a rewrite of the callers.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Stops the map growing without bound in a long-lived instance. */
function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfter: 0 };
  }

  existing.count += 1;
  const retryAfter = Math.ceil((existing.resetAt - now) / 1000);

  return {
    ok: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    retryAfter,
  };
}

/**
 * Best-effort client IP. Vercel sets `x-forwarded-for`; the first entry is the
 * client. Falls back to a constant so a missing header degrades to a global
 * limit rather than to no limit at all.
 */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}

/** docs/09 § 5: 5 lead submissions per IP per hour. */
export const LEAD_LIMIT = { limit: 5, windowMs: 60 * 60 * 1000 };

/** docs/07 § 2: 30 uploads per minute per user. */
export const UPLOAD_LIMIT = { limit: 30, windowMs: 60 * 1000 };

/** docs/06 § 1: 3 magic links per email per 15 minutes. */
export const MAGIC_LINK_LIMIT = { limit: 3, windowMs: 15 * 60 * 1000 };
