import { createSupabasePublicClient } from "@/lib/supabase/public";
import { toListing, toListingCard } from "@/lib/queries/mappers";
import { PAGE_SIZE, type SearchParams } from "@/lib/validation/search-params";
import type {
  Facets,
  FacetOption,
  Listing,
  ListingCard,
  ListingType,
  PropertyType,
  SearchResult,
} from "@/types/domain";

/**
 * All PUBLIC listing reads.
 *
 * Uses the cookie-free anon client, so `published = false` rows are invisible
 * by policy rather than by a `where` clause — and, just as importantly, these
 * pages stay statically renderable. Reading the session cookie here would opt
 * every listing page out of static generation (lib/supabase/public.ts).
 *
 * Admin reads, which must see drafts, live in lib/queries/admin.ts and use the
 * session client instead.
 *
 * Card lists select from the `listing_card` view so a grid of 24 never drags
 * `description` and a full `photos` array across the wire.
 */

const CARD_COLUMNS =
  "id, slug, status, listing_type, property_type, price, sold_price, beds, baths, sqft, address, unit, zip, city_id, city_slug, city_name, community_id, cover, photos_purged, is_featured, published_at, sold_at";

const FULL_COLUMNS = `
  id, slug, status, listing_type, property_type, price, sold_price,
  hoa_fee, taxes_annual, beds, baths, half_baths, sqft, lot_size, year_built,
  garage_spaces, stories, pool, waterfront, features,
  address, unit, city_id, community_id, zip, lat, lng,
  headline, description, contractors_take, photos, virtual_tour,
  meta_title, meta_desc, is_featured, published_at, sold_at, photos_purged,
  keep_photos, source, mls_number, is_locked, updated_at,
  cities(id, slug, name), communities(id, slug, name)
`;

/* ── Detail ─────────────────────────────────────────────────────────────── */

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listings")
    .select(FULL_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw new Error(`getListingBySlug(${slug}): ${error.message}`);
  return data ? toListing(data) : null;
}

/**
 * Hard rule 11: a published URL is permanent. Called from the not-found branch
 * so a normal request never pays for it (docs/01 § Redirect resolution).
 *
 * The stored `status_code` is returned and honoured by the caller. It is not
 * decoration: a 302/307 row is a deliberate temporary move, and treating every
 * row as permanent would make that unrecoverable in a crawler cache.
 */
export async function resolveRedirect(
  fromPath: string,
): Promise<{ toPath: string; permanent: boolean } | null> {
  const db = createSupabasePublicClient();
  const { data } = await db
    .from("redirects")
    .select("to_path, status_code")
    .eq("from_path", fromPath)
    .maybeSingle();

  if (!data?.to_path) return null;

  const code = Number(data.status_code ?? 308);
  return { toPath: data.to_path, permanent: code !== 302 && code !== 307 };
}

export async function getListingSlugsForStaticParams(): Promise<string[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listings")
    .select("slug")
    .order("published_at", { ascending: false })
    .limit(1000);

  if (error) throw new Error(`getListingSlugsForStaticParams: ${error.message}`);
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

/* ── Lists ──────────────────────────────────────────────────────────────── */

const AVAILABLE = ["active", "coming_soon", "pending"] as const;

export async function getFeaturedListings(limit = 6): Promise<ListingCard[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listing_card")
    .select(CARD_COLUMNS)
    .eq("is_featured", true)
    .in("status", AVAILABLE)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getFeaturedListings: ${error.message}`);
  return (data ?? []).map(toListingCard);
}

/**
 * Every available listing, newest first, for `/llms.txt`.
 *
 * Separate from `getFeaturedListings` because the audience is different: the
 * homepage wants the six she chose, an assistant wants the inventory it can
 * cite. Capped, because llms.txt is a map and not a feed — a file with four
 * hundred addresses in it stops being read.
 */
export async function getListingsForLlms(limit = 60): Promise<ListingCard[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listing_card")
    .select(CARD_COLUMNS)
    .in("status", AVAILABLE)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getListingsForLlms: ${error.message}`);
  return (data ?? []).map(toListingCard);
}

export async function getSoldListings(
  citySlug?: string,
  limit = 24,
): Promise<ListingCard[]> {
  const db = createSupabasePublicClient();
  let q = db
    .from("listing_card")
    .select(CARD_COLUMNS)
    .eq("status", "sold")
    .order("sold_at", { ascending: false })
    .limit(limit);

  if (citySlug) q = q.eq("city_slug", citySlug);

  const { data, error } = await q;
  if (error) throw new Error(`getSoldListings: ${error.message}`);
  return (data ?? []).map(toListingCard);
}

/** Same city, price within ±25%, excluding the listing itself. */
export async function getSimilarListings(
  listing: Listing,
  limit = 3,
): Promise<ListingCard[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listing_card")
    .select(CARD_COLUMNS)
    .eq("city_id", listing.city.id)
    .in("status", AVAILABLE)
    .neq("id", listing.id)
    .gte("price", Math.round(listing.price * 0.75))
    .lte("price", Math.round(listing.price * 1.25))
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getSimilarListings: ${error.message}`);
  return (data ?? []).map(toListingCard);
}

export async function countPublishedListings(): Promise<number> {
  const db = createSupabasePublicClient();
  const { count, error } = await db
    .from("listing_card")
    .select("id", { count: "exact", head: true })
    .in("status", AVAILABLE);

  if (error) throw new Error(`countPublishedListings: ${error.message}`);
  return count ?? 0;
}

/* ── Search ─────────────────────────────────────────────────────────────── */

export async function searchListings(p: SearchParams): Promise<SearchResult> {
  const db = createSupabasePublicClient();

  let q = db
    .from("listing_card")
    .select(CARD_COLUMNS, { count: "exact" })
    .in("status", AVAILABLE);

  if (p.city?.length) q = q.in("city_slug", p.city);
  if (p.type?.length) q = q.in("listing_type", p.type);
  if (p.property?.length) q = q.in("property_type", p.property);
  if (p.min != null) q = q.gte("price", p.min);
  if (p.max != null) q = q.lte("price", p.max);
  if (p.beds != null) q = q.gte("beds", p.beds);
  if (p.baths != null) q = q.gte("baths", p.baths);
  if (p.sqftMin != null) q = q.gte("sqft", p.sqftMin);

  // year_built and pool are not on the card view; they need the base table.
  // Keeping them here would force a wider select on every search, so they are
  // applied via a sub-filter on ids instead.
  if (p.yearMin != null || p.pool) {
    let sub = db.from("listings").select("id");
    if (p.yearMin != null) sub = sub.gte("year_built", p.yearMin);
    if (p.pool) sub = sub.eq("pool", true);
    const { data: ids, error: subError } = await sub.limit(2000);
    if (subError) throw new Error(`searchListings(sub): ${subError.message}`);
    const idList = (ids ?? []).map((r: { id: string }) => r.id);
    if (idList.length === 0) {
      return { listings: [], total: 0, page: 1, pageCount: 0 };
    }
    q = q.in("id", idList);
  }

  /*
    Keyword search.

    This used to match `address` and `slug` only, while `not-found.tsx` and the
    `SearchAction` in the JSON-LD both promise "address, city or keyword". A
    search action a crawler can follow and get nothing from is worse than not
    publishing one, so the promise is now kept:

      address    — on the card view
      city_name  — on the card view, which is why "Heathrow" now works
      zip        — on the card view
      headline
      description — both only on the base table

    The last two need the base table, so they are resolved to a bounded list of
    ids first and folded into the same `or` rather than issued as a second
    query. Bounded at 200 deliberately: a PostgREST `or` filter travels in the
    URL, and an unbounded id list is a 414 waiting for the day the inventory
    grows. Two hundred addresses is far past the point a keyword search is
    still useful.

    `slug` is dropped. It is derived from the address, so it never matched
    anything the address did not, and it let a visitor match on punctuation
    that is not visible anywhere on the page.
  */
  if (p.q) {
    // Characters that would otherwise terminate or inject into the PostgREST
    // filter expression. Not a security boundary — the anon key is limited by
    // RLS — but a malformed filter returns a 400, which reads as "search is
    // broken".
    const term = p.q.replace(/[%,()*:."\\]/g, " ").trim();

    if (term) {
      const clauses = [
        `address.ilike.%${term}%`,
        `city_name.ilike.%${term}%`,
        `zip.ilike.%${term}%`,
      ];

      const { data: textIds } = await db
        .from("listings")
        .select("id")
        .or(`headline.ilike.%${term}%,description.ilike.%${term}%`)
        .eq("published", true)
        .limit(200);

      const ids = (textIds ?? []).map((r: { id: string }) => r.id);
      if (ids.length > 0) clauses.push(`id.in.(${ids.join(",")})`);

      q = q.or(clauses.join(","));
    }
  }

  switch (p.sort) {
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "beds_desc":
      q = q.order("beds", { ascending: false, nullsFirst: false });
      break;
    case "sqft_desc":
      q = q.order("sqft", { ascending: false, nullsFirst: false });
      break;
    default:
      q = q.order("published_at", { ascending: false, nullsFirst: false });
  }

  const from = (p.page - 1) * PAGE_SIZE;
  q = q.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(`searchListings: ${error.message}`);

  const total = count ?? 0;
  return {
    listings: (data ?? []).map(toListingCard),
    total,
    page: p.page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/* ── Facets ─────────────────────────────────────────────────────────────── */

/** The `listing_facets` view is aggregate-only, so every column is nullable. */
type FacetRow = {
  city_slug: string | null;
  city_name: string | null;
  property_type: string | null;
  listing_type: string | null;
  total: number;
  min_price: number | null;
  max_price: number | null;
  min_beds: number | null;
  max_beds: number | null;
  min_sqft: number | null;
  max_sqft: number | null;
  min_year: number | null;
  max_year: number | null;
};

const num = (v: unknown): number | null =>
  v == null || !Number.isFinite(Number(v)) ? null : Number(v);

const PROPERTY_LABELS: Record<PropertyType, string> = {
  single_family: "Single family",
  townhouse: "Townhouse",
  condo: "Condo",
  villa: "Villa",
  multi_family: "Multi-family",
  land: "Land",
  manufactured: "Manufactured",
};

const LISTING_LABELS: Record<ListingType, string> = {
  resale: "Resale",
  new_construction: "New construction",
  assumable: "Assumable mortgage",
  va_eligible: "VA eligible",
  land: "Land",
};

/**
 * Hard rule 22: filter options are DERIVED, never hardcoded.
 *
 * Zero-count options are returned rather than dropped so the UI can render them
 * disabled with their count — a disabled option teaches the visitor what exists.
 */
export async function getFacets(): Promise<Facets> {
  const db = createSupabasePublicClient();
  const { data, error } = await db.from("listing_facets").select("*");
  if (error) throw new Error(`getFacets: ${error.message}`);

  const rows: FacetRow[] = (data ?? []).map((r) => ({
    city_slug: r.city_slug,
    city_name: r.city_name,
    property_type: r.property_type,
    listing_type: r.listing_type,
    total: Number(r.total ?? 0),
    min_price: num(r.min_price),
    max_price: num(r.max_price),
    min_beds: num(r.min_beds),
    max_beds: num(r.max_beds),
    min_sqft: num(r.min_sqft),
    max_sqft: num(r.max_sqft),
    min_year: num(r.min_year),
    max_year: num(r.max_year),
  }));

  const tally = <T extends string>(
    key: "property_type" | "listing_type",
    labels: Record<T, string>,
  ): FacetOption<T>[] => {
    const counts = new Map<string, number>();
    for (const r of rows) {
      const v = r[key];
      if (v) counts.set(v, (counts.get(v) ?? 0) + r.total);
    }
    return (Object.keys(labels) as T[]).map((value) => ({
      value,
      label: labels[value],
      total: counts.get(value) ?? 0,
    }));
  };

  const cityMap = new Map<string, FacetOption>();
  for (const r of rows) {
    if (!r.city_slug) continue;
    const existing = cityMap.get(r.city_slug);
    if (existing) existing.total += r.total;
    else
      cityMap.set(r.city_slug, {
        value: r.city_slug,
        label: r.city_name ?? r.city_slug,
        total: r.total,
      });
  }

  const range = (
    minKey: "min_price" | "min_beds" | "min_sqft" | "min_year",
    maxKey: "max_price" | "max_beds" | "max_sqft" | "max_year",
  ) => {
    const mins = rows.map((r) => r[minKey]).filter((n): n is number => n !== null);
    const maxs = rows.map((r) => r[maxKey]).filter((n): n is number => n !== null);
    if (!mins.length || !maxs.length) return null;
    return { min: Math.min(...mins), max: Math.max(...maxs) };
  };

  return {
    cities: [...cityMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
    propertyTypes: tally<PropertyType>("property_type", PROPERTY_LABELS),
    listingTypes: tally<ListingType>("listing_type", LISTING_LABELS),
    price: range("min_price", "max_price"),
    beds: range("min_beds", "max_beds"),
    sqft: range("min_sqft", "max_sqft"),
    year: range("min_year", "max_year"),
    total: rows.reduce((n, r) => n + r.total, 0),
  };
}


/** Homes for sale inside one community — the community page's grid. */
export async function getListingsByCommunity(
  communityId: string,
  limit = 6,
): Promise<ListingCard[]> {
  const db = createSupabasePublicClient();
  const { data, error } = await db
    .from("listing_card")
    .select(CARD_COLUMNS)
    .eq("community_id", communityId)
    .in("status", AVAILABLE)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getListingsByCommunity: ${error.message}`);
  return (data ?? []).map(toListingCard);
}
