import "server-only";

import { createServiceClient } from "@/lib/supabase/service";

/**
 * Which places a listing may legitimately mention (brief §6, §7).
 *
 * ── The problem this solves ───────────────────────────────────────────────
 *
 * A generator that is handed a city name and told to write local copy will
 * happily produce "homes near Orlando" for a Sanford listing thirty minutes up
 * I-4, because "Orlando" has search volume and the model has no way to know the
 * claim is a stretch. §6 is explicit that a location must be geographically
 * valid and genuinely connected, not merely popular.
 *
 * So the model is never asked which places are nearby. It is handed a list this
 * function derived from the graph, and it may use those and nothing else.
 *
 * ── The five layers ───────────────────────────────────────────────────────
 *
 *   1  the community the property is in
 *   2  its city
 *   3  cities that are genuinely adjacent
 *   4  county — context and structured data, barred from copy by default
 *   5  region — "Central Florida"
 *
 * Layer is not a ranking of importance, it is a statement of how far the claim
 * reaches. The generator uses it to decide what may appear in a title (1 and 2)
 * versus what may only appear as supporting context (3 and 5).
 *
 * ── Why adjacency is not transitive ───────────────────────────────────────
 *
 * Lake Mary is adjacent to Longwood, and Longwood to Altamonte Springs. That
 * does not make Altamonte Springs near Lake Mary in any sense a buyer would
 * accept. The walk is deliberately one hop; chaining it would reconstruct the
 * whole county within three steps and produce exactly the keyword sprawl the
 * layering exists to prevent.
 */

export type GeoRelevance = {
  entityId: string;
  kind: "region" | "county" | "city" | "community" | "neighborhood";
  name: string;
  slug: string;
  layer: 1 | 2 | 3 | 4 | 5;
  reason: string;
  /** False for a county by default: real place, not a phrase buyers search. */
  usableInCopy: boolean;
};

type EntityRow = {
  id: string;
  kind: GeoRelevance["kind"];
  name: string;
  slug: string;
  parent_id: string | null;
  usable_in_copy: boolean;
};

/**
 * Walk the graph for one place.
 *
 * Named for a PLACE, not a listing, because articles, cities and communities
 * need exactly the same walk — an article about Lake Mary may mention the same
 * neighbours a Lake Mary listing may. `resolveListingGeo` below is the alias
 * the listing path already uses.
 *
 * Pure read — it computes and returns, and `persistListingGeo` below is what
 * writes. Keeping them apart means the result can be shown in the admin for
 * review (§32) without committing anything.
 */
export async function resolveGeo(place: {
  citySlug: string;
  communitySlug?: string | null;
}): Promise<GeoRelevance[]> {
  const db = createServiceClient();

  const { data: entities, error } = await db
    .from("geo_entities")
    .select("id, kind, name, slug, parent_id, usable_in_copy");

  if (error) throw new Error(`resolveGeo: ${error.message}`);

  const rows = (entities ?? []) as EntityRow[];
  const byId = new Map(rows.map((r) => [r.id, r]));
  const cityRow = rows.find((r) => r.kind === "city" && r.slug === place.citySlug);

  /*
    No city in the graph means no defensible geography at all. Returning an
    empty list is correct: the generator then writes about the record without a
    location claim, which is worse copy and not a false statement. Silently
    falling back to the city NAME would be the failure this module exists to
    prevent.
  */
  if (!cityRow) return [];

  const out: GeoRelevance[] = [];
  const seen = new Set<string>();

  const add = (row: EntityRow, layer: GeoRelevance["layer"], reason: string) => {
    if (seen.has(row.id)) return;
    seen.add(row.id);
    out.push({
      entityId: row.id,
      kind: row.kind,
      name: row.name,
      slug: row.slug,
      layer,
      reason,
      usableInCopy: row.usable_in_copy,
    });
  };

  // Layer 1 — the community, when the listing is in one.
  if (place.communitySlug) {
    const community = rows.find(
      (r) => r.kind === "community" && r.slug === place.communitySlug,
    );
    if (community) {
      add(community, 1, `This is in the ${community.name} community.`);
    }
  }

  // Layer 2 — its city.
  add(cityRow, 2, `This is in ${cityRow.name}.`);

  // Layer 3 — one hop of adjacency, and one hop only.
  const { data: links } = await db
    .from("geo_entity_links")
    .select("to_id, reason")
    .eq("from_id", cityRow.id)
    .eq("kind", "adjacent");

  for (const link of links ?? []) {
    const neighbour = byId.get(link.to_id);
    if (neighbour) add(neighbour, 3, link.reason);
  }

  // Layers 4 and 5 — the containment chain above the city.
  let parent = cityRow.parent_id ? byId.get(cityRow.parent_id) : undefined;
  while (parent) {
    add(
      parent,
      parent.kind === "county" ? 4 : 5,
      parent.kind === "county"
        ? `${cityRow.name} is in ${parent.name}.`
        : `${cityRow.name} is part of ${parent.name}.`,
    );
    parent = parent.parent_id ? byId.get(parent.parent_id) : undefined;
  }

  return out;
}

/**
 * Cache the walk against the listing, preserving human overrides.
 *
 * `pinned` and `excluded` are set by a person (§32, §57) and are never
 * overwritten here. A regeneration that silently discarded an operator's "no,
 * do not mention Sanford on this listing" would make the override useless the
 * first time anything else about the listing changed.
 */
export async function persistListingGeo(
  listingId: string,
  relevance: GeoRelevance[],
): Promise<void> {
  const db = createServiceClient();

  const { data: existing } = await db
    .from("listing_geo_relevance")
    .select("entity_id, pinned, excluded")
    .eq("listing_id", listingId);

  const overrides = new Map(
    (existing ?? [])
      .filter((r) => r.pinned || r.excluded)
      .map((r) => [r.entity_id, r]),
  );

  /*
    Delete-then-insert, scoped to rows nobody has touched. A blanket delete
    would take the overrides with it; an upsert alone would leave rows for
    places that are no longer relevant after the listing moved city.
  */
  const keep = [...overrides.keys()];
  let del = db.from("listing_geo_relevance").delete().eq("listing_id", listingId);
  if (keep.length > 0) del = del.not("entity_id", "in", `(${keep.join(",")})`);
  await del;

  const rows = relevance
    .filter((r) => !overrides.has(r.entityId))
    .map((r) => ({
      listing_id: listingId,
      entity_id: r.entityId,
      layer: r.layer,
      reason: r.reason,
    }));

  if (rows.length === 0) return;

  const { error } = await db
    .from("listing_geo_relevance")
    .upsert(rows, { onConflict: "listing_id,entity_id" });

  if (error) console.error(`[geo] persist ${listingId}: ${error.message}`);
}

/**
 * The places the SEO engine is allowed to name, in the order it should prefer.
 *
 * Excludes anything a person excluded, anything barred from copy, and — the
 * point of the whole module — anything the graph does not connect to this
 * listing. A caller cannot accidentally reach a place by any other route,
 * because this is the only function that returns names for copy.
 */
export async function usableGeoForCopy(listingId: string): Promise<
  { name: string; layer: number; reason: string }[]
> {
  const db = createServiceClient();

  const { data, error } = await db
    .from("listing_geo_relevance")
    .select("layer, reason, excluded, geo_entities(name, usable_in_copy)")
    .eq("listing_id", listingId)
    .order("layer");

  if (error || !data) return [];

  return data
    .filter((row) => {
      const entity = Array.isArray(row.geo_entities)
        ? row.geo_entities[0]
        : row.geo_entities;
      return !row.excluded && entity?.usable_in_copy;
    })
    .map((row) => {
      const entity = Array.isArray(row.geo_entities)
        ? row.geo_entities[0]
        : row.geo_entities;
      return {
        name: (entity as { name: string }).name,
        layer: row.layer,
        reason: row.reason,
      };
    });
}

/**
 * The listing spelling of `resolveGeo`.
 *
 * Kept because the listing path reads better for it and because renaming a
 * function used in a publish action to save one word is not worth the diff.
 */
export const resolveListingGeo = resolveGeo;
