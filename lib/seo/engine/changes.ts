import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * SEO change detection (brief §26, §27).
 *
 * ── Why not just regenerate every time ────────────────────────────────────
 *
 * §27 is explicit: do not regenerate everything unnecessarily. Three reasons it
 * matters here, in increasing order of importance.
 *
 * The cheap one is cost. A save that changes a typo in the description should
 * not spend a model call and a queue slot.
 *
 * The real one is CHURN. Every regeneration rewrites `seo_pages`, which
 * `revalidatePath` then pushes to the public site. A description that changes
 * every time the agent adjusts a photo caption is a description search engines
 * see flapping, and a page whose metadata never settles is a page they trust
 * less than one that does.
 *
 * The one nobody expects is the audit log. `seo_generation_runs` is the answer
 * to "what did the AI change and when" (§34), and a run recorded on every save
 * buries the three that mattered under four hundred that changed nothing.
 *
 * ── What counts as meaningful ─────────────────────────────────────────────
 *
 * Exactly the fields the generators actually read. §27 names most of them —
 * price, status, location, features, construction status — and the rule that
 * decides the rest is simple: if a field cannot change the output, changing it
 * is not a reason to run.
 *
 * `description` is deliberately IN the list even though keywords do not use it,
 * because `autoListingDescription` does. `updated_at`, `is_featured` and
 * `keep_photos` are deliberately OUT: none of them reaches any generated string.
 */

/** The listing fields any generator reads. Order is irrelevant; membership is not. */
const LISTING_SIGNIFICANT = [
  "address",
  "unit",
  "city_id",
  "community_id",
  "zip",
  "status",
  "listing_type",
  "property_type",
  "price",
  "sold_price",
  "sold_at",
  "beds",
  "baths",
  "half_baths",
  "sqft",
  "lot_size",
  "year_built",
  "garage_spaces",
  "pool",
  "waterfront",
  "hoa_fee",
  "taxes_annual",
  "description",
  "contractors_take",
  "published",
] as const;

export type ChangeVerdict = {
  changed: boolean;
  /** Which fields differed. Empty when nothing did, or on a first run. */
  fields: string[];
  reason: string;
};

/**
 * A stable fingerprint of the fields that matter.
 *
 * Sorted and JSON-encoded rather than hashed. The stored value is read by a
 * person debugging "why did this not regenerate", and a hex digest answers that
 * question with nothing at all.
 */
export function listingFingerprint(row: Record<string, unknown>): string {
  const subset: Record<string, unknown> = {};
  for (const key of [...LISTING_SIGNIFICANT].sort()) {
    subset[key] = row[key] ?? null;
  }
  return JSON.stringify(subset);
}

/**
 * Has anything the generators read actually changed since the last run?
 *
 * A record with no completed run always returns `changed: true` — never having
 * been generated is the strongest possible reason to generate.
 */
export async function listingNeedsSeo(
  listingId: string,
  row: Record<string, unknown>,
): Promise<ChangeVerdict> {
  const db = createServiceClient();
  const current = listingFingerprint(row);

  const { data: last } = await db
    .from("seo_generation_runs")
    .select("changes")
    .eq("listing_id", listingId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const previous = (last?.changes as { fingerprint?: string } | null)?.fingerprint;

  if (!previous) {
    return {
      changed: true,
      fields: [],
      reason: "This listing has never had its SEO worked out.",
    };
  }

  if (previous === current) {
    return {
      changed: false,
      fields: [],
      reason: "Nothing that affects the wording has changed.",
    };
  }

  /*
    Name the fields, not just the fact. §27 gives examples — "if bedroom count
    changes, the feature keyword cluster must be recalculated" — and an operator
    reading the history wants that sentence, not "something changed".
  */
  const before = JSON.parse(previous) as Record<string, unknown>;
  const after = JSON.parse(current) as Record<string, unknown>;
  const fields = Object.keys(after).filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );

  return {
    changed: true,
    fields,
    reason: `${fields.join(", ")} changed.`,
  };
}

/**
 * A fingerprint for the record types that are not listings.
 *
 * Deliberately coarse — a title, a body and a place. Articles and place pages
 * have far fewer fields that reach a generated string, and enumerating them
 * would be a list that has to be maintained in step with three schemas for very
 * little gain.
 */
export function textFingerprint(parts: (string | null | undefined)[]): string {
  return JSON.stringify(parts.map((p) => (p ?? "").trim()));
}
