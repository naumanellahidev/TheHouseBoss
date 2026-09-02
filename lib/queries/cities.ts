import { createSupabasePublicClient } from "@/lib/supabase/public";
import { toCity, toCommunity } from "@/lib/queries/mappers";
import type { City, Community } from "@/types/domain";

/**
 * All PUBLIC city and community reads.
 *
 * Cookie-free anon client: an unpublished row is invisible by policy rather
 * than by a `where` clause someone might forget, and the city pages stay
 * statically renderable (lib/supabase/public.ts).
 *
 * The admin needs to see unpublished cities in its selects, so it uses
 * `getAdminCities()` / `getAdminCommunities()` in lib/queries/admin.ts.
 */

const CITY_COLUMNS =
  "id, slug, name, county, state, in_search, is_flagship, hero_key, intro_md, body_md, stats_json, faq_json, meta_title, meta_desc";

export async function getCities(): Promise<City[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("cities")
    .select(CITY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`getCities: ${error.message}`);
  return (data ?? []).map(toCity);
}

/** The five the client named as search targets. Drives the city filter. */
export async function getSearchCities(): Promise<City[]> {
  const cities = await getCities();
  return cities.filter((c) => c.inSearch);
}

export async function getCityBySlug(slug: string): Promise<City | null> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("cities")
    .select(CITY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getCityBySlug(${slug}): ${error.message}`);
  return data ? toCity(data) : null;
}

/**
 * Slugs for `generateStaticParams` on `/[city]`.
 *
 * Excludes `lake-mary`: it has a literal route segment with sub-routes, and
 * emitting it here would create a duplicate route (docs/01 § Why [city] is a
 * dynamic segment but lake-mary is not).
 */
export async function getCitySlugsForStaticParams(): Promise<string[]> {
  const cities = await getCities();
  return cities.map((c) => c.slug).filter((s) => s !== "lake-mary");
}

const COMMUNITY_COLUMNS =
  "id, slug, name, city_id, hero_key, intro_md, body_md, hoa_info, amenities, price_range, faq_json, meta_title, meta_desc, cities(id, slug, name)";

export async function getCommunities(citySlug?: string): Promise<Community[]> {
  const db = createSupabasePublicClient();
  let query = db
    .from("communities")
    .select(COMMUNITY_COLUMNS)
    .order("sort_order", { ascending: true });

  if (citySlug) query = query.eq("cities.slug", citySlug);

  const { data, error } = await query;
  if (error) throw new Error(`getCommunities: ${error.message}`);

  const mapped = (data ?? []).map(toCommunity);
  // The embedded filter above cannot exclude parent rows, so narrow here too.
  return citySlug ? mapped.filter((c) => c.city.slug === citySlug) : mapped;
}

export async function getCommunityBySlug(
  slug: string,
): Promise<Community | null> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("communities")
    .select(COMMUNITY_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getCommunityBySlug(${slug}): ${error.message}`);
  return data ? toCommunity(data) : null;
}

export async function getCommunitySlugsForStaticParams(): Promise<string[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db.from("communities").select("slug");
  if (error) throw new Error(`getCommunitySlugsForStaticParams: ${error.message}`);
  return (data ?? []).map((r: { slug: string }) => r.slug);
}
