/**
 * Seed the geographic entity graph.
 *
 *   npm run seed:geo
 *
 * ── Why this is a script and not a SQL seed ───────────────────────────────
 *
 * It has to bind to the `cities` and `communities` rows that already exist, by
 * slug, and those ids differ between environments. A SQL seed would either
 * hardcode ids that are wrong everywhere but one database, or duplicate the
 * city names into a second place that then drifts.
 *
 * Idempotent: every write is an upsert on a natural key, so running it twice
 * changes nothing and running it after adding a city adds only that city.
 *
 * ── Where the geography comes from ────────────────────────────────────────
 *
 * The containment is a matter of public record — Lake Mary and Longwood are in
 * Seminole County, Orlando is in Orange County. The adjacency edges are the
 * judgement calls, and each one carries the reason it was asserted, in a
 * sentence, so a person reviewing a generated keyword can see the claim being
 * made rather than a bare edge in a graph.
 *
 * Coordinates are city centres to three decimal places, which is roughly
 * 100m — ample for "is this plausibly nearby" and deliberately not precise
 * enough to be mistaken for a property location.
 *
 * NOTHING here is invented. Where a relationship is uncertain it is left out:
 * an absent edge costs a keyword, a wrong edge puts a false claim about a
 * property's location on a page.
 */

import { createServiceClient } from "@/lib/supabase/service";

type Kind = "region" | "county" | "city" | "community" | "neighborhood";

const REGION = {
  slug: "central-florida",
  name: "Central Florida",
  /*
    `usable_in_copy` is true: "Central Florida homes for sale" is a phrase
    buyers genuinely use, unlike a county name.
  */
  usableInCopy: true,
};

const COUNTIES: { slug: string; name: string; usableInCopy: boolean }[] = [
  /*
    Both counties are barred from generated copy. "Homes for sale in Seminole
    County" is how a tax assessor writes, not how a buyer searches — but the
    county is still needed in the graph, because it is what makes Lake Mary and
    Longwood provably near each other, and it belongs in structured data.
  */
  { slug: "seminole-county", name: "Seminole County", usableInCopy: false },
  { slug: "orange-county", name: "Orange County", usableInCopy: false },
];

/** City slug -> county slug, plus an approximate centre. */
const CITY_FACTS: Record<
  string,
  { county: string; lat: number; lng: number }
> = {
  "lake-mary": { county: "seminole-county", lat: 28.759, lng: -81.318 },
  longwood: { county: "seminole-county", lat: 28.703, lng: -81.344 },
  sanford: { county: "seminole-county", lat: 28.8, lng: -81.273 },
  casselberry: { county: "seminole-county", lat: 28.678, lng: -81.328 },
  "winter-springs": { county: "seminole-county", lat: 28.699, lng: -81.308 },
  oviedo: { county: "seminole-county", lat: 28.67, lng: -81.208 },
  "altamonte-springs": { county: "seminole-county", lat: 28.661, lng: -81.365 },
  orlando: { county: "orange-county", lat: 28.538, lng: -81.379 },
};

/**
 * Adjacency, asserted deliberately and sparingly.
 *
 * Every pair here is one a Central Florida buyer would actually consider
 * together, and the reason says why. Orlando is linked only to Altamonte
 * Springs — it borders several of these on a map, but "homes near Orlando" on a
 * Sanford listing 30 minutes up I-4 is the kind of stretch §6 exists to stop.
 */
const ADJACENCY: { a: string; b: string; reason: string }[] = [
  {
    a: "lake-mary",
    b: "longwood",
    reason: "Directly adjacent along Ronald Reagan Boulevard; buyers routinely search both together.",
  },
  {
    a: "lake-mary",
    b: "sanford",
    reason: "Shares a border to the north; both sit on the I-4 corridor in Seminole County.",
  },
  {
    a: "longwood",
    b: "altamonte-springs",
    reason: "Adjacent along SR-434, and the two markets overlap heavily at the same price points.",
  },
  {
    a: "casselberry",
    b: "winter-springs",
    reason: "Directly adjacent; the boundary runs through shared neighbourhoods.",
  },
  {
    a: "casselberry",
    b: "altamonte-springs",
    reason: "Adjacent along SR-436, with a continuous residential corridor between them.",
  },
  {
    a: "winter-springs",
    b: "oviedo",
    reason: "Adjacent to the east; the two share the Oviedo school cluster and commute pattern.",
  },
  {
    a: "altamonte-springs",
    b: "orlando",
    reason: "The closest of these cities to Orlando proper, immediately north on I-4.",
  },
];

async function main() {
  const db = createServiceClient();

  /** Upsert one entity and return its id. Keyed on (kind, slug). */
  async function put(row: {
    kind: Kind;
    slug: string;
    name: string;
    parentId?: string | null;
    cityId?: string | null;
    communityId?: string | null;
    lat?: number | null;
    lng?: number | null;
    usableInCopy?: boolean;
  }): Promise<string> {
    const { data, error } = await db
      .from("geo_entities")
      .upsert(
        {
          kind: row.kind,
          slug: row.slug,
          name: row.name,
          parent_id: row.parentId ?? null,
          city_id: row.cityId ?? null,
          community_id: row.communityId ?? null,
          lat: row.lat ?? null,
          lng: row.lng ?? null,
          usable_in_copy: row.usableInCopy ?? true,
        },
        { onConflict: "kind,slug" },
      )
      .select("id")
      .single();

    if (error) throw new Error(`${row.kind}/${row.slug}: ${error.message}`);
    return data.id;
  }

  // ── Region, then counties ────────────────────────────────────────────────
  const regionId = await put({
    kind: "region",
    slug: REGION.slug,
    name: REGION.name,
    parentId: null,
    usableInCopy: REGION.usableInCopy,
  });
  console.log(`region     ${REGION.name}`);

  const countyIds: Record<string, string> = {};
  for (const county of COUNTIES) {
    countyIds[county.slug] = await put({
      kind: "county",
      slug: county.slug,
      name: county.name,
      parentId: regionId,
      usableInCopy: county.usableInCopy,
    });
    console.log(`county     ${county.name}${county.usableInCopy ? "" : "  (context only)"}`);
  }

  // ── Cities, bound to the editorial rows that already exist ───────────────
  const { data: cities, error: cityError } = await db
    .from("cities")
    .select("id, slug, name");
  if (cityError) throw new Error(`cities: ${cityError.message}`);

  const cityIds: Record<string, string> = {};
  for (const city of cities ?? []) {
    const facts = CITY_FACTS[city.slug];
    if (!facts) {
      // A city page exists that this script has no county for. Skipped rather
      // than guessed: an entity with the wrong parent is worse than none.
      console.log(`city       ${city.name}  — SKIPPED, no county recorded`);
      continue;
    }
    cityIds[city.slug] = await put({
      kind: "city",
      slug: city.slug,
      name: city.name,
      parentId: countyIds[facts.county],
      cityId: city.id,
      lat: facts.lat,
      lng: facts.lng,
    });
    console.log(`city       ${city.name}`);
  }

  // ── Communities, parented to their city ──────────────────────────────────
  const { data: communities, error: communityError } = await db
    .from("communities")
    .select("id, slug, name, city_id, cities(slug)");
  if (communityError) throw new Error(`communities: ${communityError.message}`);

  for (const community of communities ?? []) {
    const city = Array.isArray(community.cities)
      ? community.cities[0]
      : community.cities;
    const parent = city?.slug ? cityIds[city.slug] : undefined;
    if (!parent) {
      console.log(`community  ${community.name}  — SKIPPED, city not in the graph`);
      continue;
    }
    await put({
      kind: "community",
      slug: community.slug,
      name: community.name,
      parentId: parent,
      communityId: community.id,
    });
    console.log(`community  ${community.name}`);
  }

  // ── Adjacency, both directions ───────────────────────────────────────────
  //
  // Stored as two rows rather than one row read in both directions. A single
  // row would mean every query has to check `from_id OR to_id`, which cannot
  // use the index on `from_id` and turns the commonest lookup in the engine
  // into a sequential scan.
  let edges = 0;
  for (const link of ADJACENCY) {
    const a = cityIds[link.a];
    const b = cityIds[link.b];
    if (!a || !b) {
      console.log(`adjacency  ${link.a} <-> ${link.b}  — SKIPPED, city missing`);
      continue;
    }

    const { error } = await db.from("geo_entity_links").upsert(
      [
        { from_id: a, to_id: b, kind: "adjacent", reason: link.reason },
        { from_id: b, to_id: a, kind: "adjacent", reason: link.reason },
      ],
      { onConflict: "from_id,to_id,kind" },
    );
    if (error) throw new Error(`adjacency ${link.a}/${link.b}: ${error.message}`);
    edges += 2;
  }
  console.log(`\nadjacency  ${edges} directed edges`);

  const { count } = await db
    .from("geo_entities")
    .select("id", { count: "exact", head: true });
  console.log(`total      ${count} entities in the graph`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
