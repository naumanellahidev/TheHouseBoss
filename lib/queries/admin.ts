import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { toCity, toCommunity, toListing, toPhotos, toReview } from "@/lib/queries/mappers";
import { getStorageUsage, getUpcomingPurge } from "@/lib/queries/media";
import type {
  AdminReview,
  ArticleKind,
  AttentionItem,
  City,
  Community,
  Listing,
  ListingStatus,
  ListingType,
  MediaItem,
  Photo,
  StorageUsage,
} from "@/types/domain";

/**
 * Admin-only reads.
 *
 * These use the RLS-respecting server client, not the service client. The admin
 * session satisfies `admin all listings`, so drafts are visible — and if one of
 * these functions is ever called from a path without an admin session, RLS
 * returns published rows only rather than leaking the whole table. That is a
 * strictly better failure mode than a service-role query with a forgotten
 * `requireAdmin()`.
 *
 * The exceptions are `media` and `leads`, which have no public read policy at
 * all; those keep using the service client (lib/queries/media.ts, leads.ts).
 */

export const ADMIN_PAGE_SIZE = 25;

export type AdminListingRow = {
  id: string;
  slug: string;
  address: string;
  unit: string | null;
  cityName: string;
  citySlug: string;
  price: number;
  beds: number | null;
  baths: number | null;
  status: ListingStatus;
  listingType: ListingType;
  published: boolean;
  photoCount: number;
  missingAlt: number;
  cover: Photo | null;
  updatedAt: string;
  soldAt: string | null;
  isFeatured: boolean;
};

export type AdminListingFilters = {
  status?: ListingStatus;
  citySlug?: string;
  listingType?: ListingType;
  published?: boolean;
  hasPhotos?: boolean;
  search?: string;
  sort?: "updated" | "price_desc" | "price_asc" | "created";
  page?: number;
};

const LIST_COLUMNS =
  "id, slug, address, unit, price, beds, baths, status, listing_type, published, photos, updated_at, sold_at, is_featured, city_id, cities(slug, name)";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toAdminRow(row: Record<string, any>): AdminListingRow {
  const photos = toPhotos(row.photos);
  const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;

  return {
    id: row.id,
    slug: row.slug,
    address: row.address ?? "",
    unit: row.unit ?? null,
    cityName: city?.name ?? "—",
    citySlug: city?.slug ?? "",
    price: Number(row.price ?? 0),
    beds: row.beds == null ? null : Number(row.beds),
    baths: row.baths == null ? null : Number(row.baths),
    status: row.status,
    listingType: row.listing_type,
    published: Boolean(row.published),
    photoCount: photos.length,
    missingAlt: photos.filter((p) => !p.alt?.trim()).length,
    cover: photos[0] ?? null,
    updatedAt: row.updated_at,
    soldAt: row.sold_at ?? null,
    isFeatured: Boolean(row.is_featured),
  };
}

export async function getAdminListings(filters: AdminListingFilters = {}): Promise<{
  rows: AdminListingRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const db = await createSupabaseServerClient();
  const page = Math.max(1, filters.page ?? 1);

  let q = db.from("listings").select(LIST_COLUMNS, { count: "exact" });

  if (filters.status) q = q.eq("status", filters.status);
  if (filters.listingType) q = q.eq("listing_type", filters.listingType);
  if (filters.published !== undefined) q = q.eq("published", filters.published);
  if (filters.search) {
    const term = filters.search.replace(/[%,()]/g, " ").trim();
    if (term) q = q.or(`address.ilike.%${term}%,mls_number.ilike.%${term}%`);
  }

  switch (filters.sort) {
    case "price_desc":
      q = q.order("price", { ascending: false });
      break;
    case "price_asc":
      q = q.order("price", { ascending: true });
      break;
    case "created":
      q = q.order("created_at", { ascending: false });
      break;
    default:
      q = q.order("updated_at", { ascending: false });
  }

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  q = q.range(from, from + ADMIN_PAGE_SIZE - 1);

  const { data, count, error } = await q;
  if (error) throw new Error(`getAdminListings: ${error.message}`);

  let rows = (data ?? []).map(toAdminRow);

  // City and photo-count filters run here rather than in SQL: `cities.slug`
  // cannot be filtered through an embed without dropping parent rows, and
  // `jsonb_array_length` is not expressible through PostgREST. Both operate on
  // a single page of 25, so the cost is nil.
  if (filters.citySlug) rows = rows.filter((r) => r.citySlug === filters.citySlug);
  if (filters.hasPhotos !== undefined) {
    rows = rows.filter((r) => (filters.hasPhotos ? r.photoCount > 0 : r.photoCount === 0));
  }

  const total = count ?? rows.length;
  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/** The editor's initial values. Includes drafts; RLS gates it on admin. */
export async function getAdminListingById(
  id: string,
): Promise<(Listing & { published: boolean }) | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("listings")
    .select(
      `id, slug, status, listing_type, property_type, price, sold_price,
       hoa_fee, taxes_annual, beds, baths, half_baths, sqft, lot_size, year_built,
       garage_spaces, stories, pool, waterfront, features,
       address, unit, city_id, community_id, zip, lat, lng,
       headline, description, contractors_take, photos, virtual_tour,
       meta_title, meta_desc, is_featured, published, published_at, sold_at,
       photos_purged, keep_photos, source, mls_number, is_locked, updated_at,
       cities(id, slug, name), communities(id, slug, name)`,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAdminListingById(${id}): ${error.message}`);
  if (!data) return null;

  return { ...toListing(data), published: Boolean(data.published) };
}

/** Autocomplete source for the features tag input (docs/06 § 4, Tab 2). */
export async function getKnownFeatures(): Promise<string[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("listings").select("features").limit(500);
  if (error) throw new Error(`getKnownFeatures: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const feature of (row.features ?? []) as string[]) {
      const clean = feature.trim();
      if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([feature]) => feature);
}

/** Live uniqueness check for the slug field in the SEO tab. */
export async function isSlugAvailable(
  slug: string,
  exceptId?: string,
): Promise<boolean> {
  const db = await createSupabaseServerClient();
  let q = db.from("listings").select("id").eq("slug", slug).limit(1);
  if (exceptId) q = q.neq("id", exceptId);

  const { data, error } = await q;
  if (error) throw new Error(`isSlugAvailable: ${error.message}`);
  return (data ?? []).length === 0;
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

export type DashboardStats = {
  newLeads7d: number;
  publishedListings: number;
  activeListings: number;
  draftListings: number;
  publishedArticles: number;
  storage: StorageUsage;
  upcomingPurge: { count: number; date: string | null; freesBytes: number };
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await createSupabaseServerClient();
  const service = createServiceClient();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [leads, published, active, draft, articles, storage, purge] =
    await Promise.all([
      service
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", weekAgo),
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("published", true),
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
      db
        .from("listings")
        .select("id", { count: "exact", head: true })
        .eq("published", false),
      db
        .from("articles")
        .select("id", { count: "exact", head: true })
        .eq("status", "published"),
      getStorageUsage(),
      getUpcomingPurge(),
    ]);

  // "Next purge: 3 listings on Sep 12 — frees 8.5 MB" (docs/06 § 3). Only the
  // listings sharing the earliest due date are counted, because that is the
  // batch the next nightly run will actually take.
  const nextDate = purge[0]?.purgeAfter ?? null;
  const sameDay = nextDate
    ? purge.filter((p) => p.purgeAfter.slice(0, 10) === nextDate.slice(0, 10))
    : [];

  return {
    newLeads7d: leads.count ?? 0,
    publishedListings: published.count ?? 0,
    activeListings: active.count ?? 0,
    draftListings: draft.count ?? 0,
    publishedArticles: articles.count ?? 0,
    storage,
    upcomingPurge: {
      count: sameDay.length,
      date: nextDate,
      freesBytes: sameDay.reduce((n, p) => n + p.freesBytes, 0),
    },
  };
}

/**
 * The "Needs attention" panel — docs/06 § 3.
 *
 * This is what keeps the site healthy without the client needing to understand
 * SEO, so it is computed from real rows rather than being a static checklist.
 * Ordered by severity, then by how many rows are affected.
 */
export async function getNeedsAttention(): Promise<AttentionItem[]> {
  const db = await createSupabaseServerClient();
  const items: AttentionItem[] = [];

  const [listingRows, articleRows, cityRows] = await Promise.all([
    db
      .from("listings")
      .select("id, slug, address, status, published, photos, meta_desc, sold_at, photos_purged, keep_photos, purge_after")
      .limit(500),
    db.from("articles").select("id, title, status, created_at").limit(500),
    db.from("cities").select("id, slug, name, published, intro_md").limit(50),
  ]);

  const listings = listingRows.data ?? [];
  const now = Date.now();

  const overdue = listings.filter(
    (l) =>
      l.status === "sold" &&
      !l.photos_purged &&
      !l.keep_photos &&
      l.purge_after &&
      new Date(l.purge_after).getTime() < now - 86_400_000,
  );
  if (overdue.length > 0) {
    items.push({
      id: "purge-overdue",
      severity: "high",
      label: `${overdue.length} sold ${overdue.length === 1 ? "listing has" : "listings have"} not purged`,
      detail:
        "Their large photos are past the 7-day mark and are still using storage. Run the purge from Settings → Maintenance.",
      href: "/admin/settings#maintenance",
    });
  }

  const missingAlt = listings.filter((l) =>
    toPhotos(l.photos).some((p) => !p.alt?.trim()),
  );
  if (missingAlt.length > 0) {
    items.push({
      id: "missing-alt",
      severity: "high",
      label: `${missingAlt.length} ${missingAlt.length === 1 ? "listing has" : "listings have"} photos without alt text`,
      detail:
        "Alt text is an accessibility requirement and blocks publishing. Add it on the Media tab.",
      href: "/admin/listings",
    });
  }

  const thinPhotos = listings.filter(
    (l) => l.published && toPhotos(l.photos).length < 5,
  );
  if (thinPhotos.length > 0) {
    items.push({
      id: "thin-photos",
      severity: "medium",
      label: `${thinPhotos.length} published ${thinPhotos.length === 1 ? "listing has" : "listings have"} fewer than 5 photos`,
      detail: "Listings with fewer than five photos get materially less engagement.",
      href: "/admin/listings?hasPhotos=true",
    });
  }

  const noMeta = listings.filter((l) => l.published && !l.meta_desc?.trim());
  if (noMeta.length > 0) {
    items.push({
      id: "no-meta",
      severity: "medium",
      label: `${noMeta.length} published ${noMeta.length === 1 ? "listing is" : "listings are"} missing a meta description`,
      detail:
        "Without one, search engines and assistants write their own summary from whatever text they find first.",
      href: "/admin/listings?published=true",
    });
  }

  const staleDrafts = (articleRows.data ?? []).filter(
    (a) =>
      a.status !== "published" &&
      new Date(a.created_at).getTime() < now - 30 * 86_400_000,
  );
  if (staleDrafts.length > 0) {
    items.push({
      id: "stale-drafts",
      severity: "low",
      label: `${staleDrafts.length} ${staleDrafts.length === 1 ? "article has" : "articles have"} been in draft over 30 days`,
      detail: "Publish them or delete them — a stalled draft is a decision not yet made.",
      href: "/admin/articles",
    });
  }

  const emptyCities = (cityRows.data ?? []).filter(
    (c) => c.published && !c.intro_md?.trim(),
  );
  if (emptyCities.length > 0) {
    items.push({
      id: "empty-cities",
      severity: "low",
      label: `${emptyCities.length} published ${emptyCities.length === 1 ? "city page has" : "city pages have"} no content`,
      detail: `A published city page with no text ranks for nothing: ${emptyCities.map((c) => c.name).join(", ")}.`,
      href: "/admin/cities",
    });
  }

  const rank = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.severity] - rank[b.severity]);
}

/* ── Media library ──────────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMediaItem(row: Record<string, any>): MediaItem {
  return {
    id: row.id,
    key: row.key,
    variants: (row.variants ?? []).map(Number),
    bytes: Number(row.bytes ?? 0),
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    mime: row.mime ?? "image/webp",
    entityType: row.entity_type,
    entityId: row.entity_id ?? null,
    createdAt: row.created_at,
  };
}

export async function getMediaItems(opts: {
  entityType?: MediaItem["entityType"];
  sort?: "bytes" | "created";
  page?: number;
} = {}): Promise<{ rows: MediaItem[]; total: number; page: number; pageCount: number }> {
  const db = createServiceClient();
  const page = Math.max(1, opts.page ?? 1);

  let q = db
    .from("media")
    .select("id, key, variants, bytes, width, height, mime, entity_type, entity_id, created_at", {
      count: "exact",
    });

  if (opts.entityType) q = q.eq("entity_type", opts.entityType);
  q = q.order(opts.sort === "created" ? "created_at" : "bytes", {
    ascending: false,
  });

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`getMediaItems: ${error.message}`);

  const total = count ?? 0;
  return {
    rows: (data ?? []).map(toMediaItem),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/**
 * Which entity a media row belongs to, resolved to something clickable.
 * Deleting media that is still referenced is blocked, and the block needs a
 * link to the referencing entity (docs/06 § 9).
 */
export async function getMediaReferences(
  keys: string[],
): Promise<Map<string, { label: string; href: string }>> {
  const out = new Map<string, { label: string; href: string }>();
  if (keys.length === 0) return out;

  const db = await createSupabaseServerClient();
  const { data } = await db.from("listings").select("id, address, photos").limit(1000);

  for (const listing of data ?? []) {
    for (const photo of toPhotos(listing.photos)) {
      if (photo.kind !== "stored") continue;
      if (!keys.includes(photo.key)) continue;
      out.set(photo.key, {
        label: listing.address as string,
        href: `/admin/listings/${listing.id}/edit?tab=media`,
      });
    }
  }

  return out;
}

/* ── Places, admin view ─────────────────────────────────────────────────── */

/**
 * Cities and communities INCLUDING unpublished ones.
 *
 * `lib/queries/cities.ts` reads as the anonymous role so the public city pages
 * stay statically renderable, which means it only ever returns published rows.
 * The listing editor has to be able to file a listing under a city that has not
 * been published yet, so it reads through the session client instead.
 */
export async function getAdminCities(): Promise<(City & { published: boolean })[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("cities")
    .select(
      "id, slug, name, county, state, in_search, is_flagship, hero_key, hero_alt, intro_md, body_md, stats_json, faq_json, meta_title, meta_desc, published",
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`getAdminCities: ${error.message}`);
  return (data ?? []).map((row) => ({ ...toCity(row), published: Boolean(row.published) }));
}

export async function getAdminCommunities(): Promise<(Community & { published: boolean })[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("communities")
    .select(
      "id, slug, name, city_id, hero_key, hero_alt, intro_md, body_md, hoa_info, amenities, price_range, faq_json, meta_title, meta_desc, published, cities(id, slug, name)",
    )
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`getAdminCommunities: ${error.message}`);
  return (data ?? []).map((row) => ({
    ...toCommunity(row),
    published: Boolean(row.published),
  }));
}

/* ── Articles, admin view ───────────────────────────────────────────────── */

const ADMIN_ARTICLE_COLUMNS =
  "id, slug, title, excerpt, kind, status, city_id, community_id, tags, cover_key, cover_alt, meta_title, meta_desc, og_key, published_at, reading_min, updated_at, created_at, cities(id, slug, name)";

export type AdminArticleRow = {
  id: string;
  slug: string;
  title: string;
  kind: ArticleKind;
  status: "draft" | "published" | "archived";
  cityName: string | null;
  tags: string[];
  publishedAt: string | null;
  readingMin: number | null;
  updatedAt: string;
  createdAt: string;
};

export async function getAdminArticles(opts: {
  kind?: ArticleKind;
  status?: "draft" | "published" | "archived";
  search?: string;
  page?: number;
} = {}): Promise<{
  rows: AdminArticleRow[];
  total: number;
  page: number;
  pageCount: number;
}> {
  const db = await createSupabaseServerClient();
  const page = Math.max(1, opts.page ?? 1);

  let q = db.from("articles").select(ADMIN_ARTICLE_COLUMNS, { count: "exact" });

  if (opts.kind) q = q.eq("kind", opts.kind);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.search) {
    const term = opts.search.replace(/[%,()]/g, " ").trim();
    if (term) q = q.ilike("title", `%${term}%`);
  }

  q = q.order("updated_at", { ascending: false });

  const from = (page - 1) * ADMIN_PAGE_SIZE;
  const { data, count, error } = await q.range(from, from + ADMIN_PAGE_SIZE - 1);
  if (error) throw new Error(`getAdminArticles: ${error.message}`);

  const total = count ?? 0;
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rows: (data ?? []).map((row: Record<string, any>) => {
      const city = Array.isArray(row.cities) ? row.cities[0] : row.cities;
      return {
        id: row.id,
        slug: row.slug,
        title: row.title,
        kind: row.kind,
        status: row.status,
        cityName: city?.name ?? null,
        tags: row.tags ?? [],
        publishedAt: row.published_at ?? null,
        readingMin: row.reading_min ?? null,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
      };
    }),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE)),
  };
}

/** The editor's initial values. Includes drafts; RLS gates it on admin. */
export async function getAdminArticleById(id: string) {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("articles")
    .select(`${ADMIN_ARTICLE_COLUMNS}, body_json, body_text, faq_json`)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAdminArticleById(${id}): ${error.message}`);
  return data ?? null;
}

/** Autocomplete source for the article tag input. */
export async function getKnownTags(): Promise<string[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("articles").select("tags").limit(500);
  if (error) throw new Error(`getKnownTags: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const tag of (row.tags ?? []) as string[]) {
      const clean = tag.trim();
      if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([tag]) => tag);
}

/* ── Places and reviews, admin view ─────────────────────────────────────── */

export async function getAdminCityById(
  id: string,
): Promise<(City & { published: boolean }) | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("cities")
    .select(
      "id, slug, name, county, state, in_search, is_flagship, hero_key, hero_alt, intro_md, body_md, stats_json, faq_json, meta_title, meta_desc, published",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAdminCityById(${id}): ${error.message}`);
  return data ? { ...toCity(data), published: Boolean(data.published) } : null;
}

export async function getAdminCommunityById(
  id: string,
): Promise<(Community & { published: boolean }) | null> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("communities")
    .select(
      "id, slug, name, city_id, hero_key, hero_alt, intro_md, body_md, hoa_info, amenities, price_range, faq_json, meta_title, meta_desc, published, cities(id, slug, name)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`getAdminCommunityById(${id}): ${error.message}`);
  return data ? { ...toCommunity(data), published: Boolean(data.published) } : null;
}

/** Reviews INCLUDING unpublished ones, in display order. */
export async function getAdminReviews(): Promise<AdminReview[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("reviews")
    .select(
      "id, author_name, author_email, author_role, rating, body, source, source_url, reviewed_at, published, sort_order, submitted_at",
    )
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAdminReviews: ${error.message}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: Record<string, any>) => ({
    ...toReview(row),
    published: Boolean(row.published),
    sortOrder: Number(row.sort_order ?? 0),
    /*
      This read goes through the RLS client rather than the service role, so it
      is the signed-in admin's own privileges that make the email visible.
      Migration 024 revoked anon's SELECT on that column; `authenticated` kept
      it, which is the whole reason this query can ask for it and the public
      one cannot.
    */
    authorEmail: typeof row.author_email === "string" ? row.author_email : null,
    submittedAt: typeof row.submitted_at === "string" ? row.submitted_at : null,
  }));
}

/**
 * Reviews a visitor sent that nobody has published or thrown away yet.
 *
 * `submitted_at is not null` is what separates these from an unpublished review
 * the admin typed and has not finished — a draft of their own is not something
 * to badge them about.
 */
export async function countPendingReviews(): Promise<number> {
  const db = createServiceClient();
  const { count, error } = await db
    .from("reviews")
    .select("id", { count: "exact", head: true })
    .eq("published", false)
    .not("submitted_at", "is", null);

  if (error) throw new Error(`countPendingReviews: ${error.message}`);
  return count ?? 0;
}

/** Autocomplete source for the community amenities tag input. */
export async function getKnownAmenities(): Promise<string[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("communities").select("amenities").limit(200);
  if (error) throw new Error(`getKnownAmenities: ${error.message}`);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    for (const amenity of (row.amenities ?? []) as string[]) {
      const clean = amenity.trim();
      if (clean) counts.set(clean, (counts.get(clean) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([amenity]) => amenity);
}

/* ── Dashboard: the wider picture ─────────────────────────────────────────── */

export type DashboardPulse = {
  /** Leads this week and last, so the tile can show a real direction. */
  leadsThisWeek: number;
  leadsLastWeek: number;
  /** Lead pipeline, counted by status. */
  leadsByStatus: { status: string; count: number }[];
  /** Inventory by status, for the same reason. */
  listingsByStatus: { status: string; count: number }[];
  /** Content totals, so the empty column has something true to say. */
  communities: number;
  reviews: number;
  draftArticles: number;
  /** Total value of everything currently for sale. */
  activeInventoryValue: number;
};

/**
 * The numbers the dashboard needs beyond the six headline tiles.
 *
 * ── Why a delta and not just a total ──────────────────────────────────────
 *
 * "New leads (7d): 4" is a fact with no meaning attached. Four is good if last
 * week was one and bad if last week was twelve, and the operator cannot tell
 * which from the tile. The previous period costs one more count query and turns
 * a number into information.
 *
 * ── Why nothing here is estimated ─────────────────────────────────────────
 *
 * Every field is a count or a sum over real rows. The dashboard is the screen
 * the client trusts most, and a plausible-looking figure that turns out to be
 * invented poisons everything else on it.
 */
export async function getDashboardPulse(): Promise<DashboardPulse> {
  const service = createServiceClient();
  const db = await createSupabaseServerClient();

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const twoWeeksAgo = new Date(Date.now() - 14 * 86_400_000).toISOString();

  const [lastWeek, leadRows, listingRows, communities, reviews, draftArticles, activeValue] =
    await Promise.all([
      service
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("created_at", twoWeeksAgo)
        .lt("created_at", weekAgo),
      /*
        Statuses are grouped in JS rather than with a Postgres GROUP BY.
        PostgREST cannot express one without a view or an RPC, and adding either
        for a handful of rows on one screen is more machinery than the question
        deserves.
      */
      service.from("leads").select("status"),
      db.from("listings").select("status").eq("published", true),
      db.from("communities").select("id", { count: "exact", head: true }).eq("published", true),
      db.from("reviews").select("id", { count: "exact", head: true }).eq("published", true),
      db.from("articles").select("id", { count: "exact", head: true }).eq("status", "draft"),
      db.from("listings").select("price").eq("published", true).in("status", ["active", "coming_soon", "pending"]),
    ]);

  const tally = (rows: { status: string | null }[] | null) => {
    const counts = new Map<string, number>();
    for (const row of rows ?? []) {
      const key = row.status ?? "unknown";
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
  };

  const leadsThisWeek = (
    await service
      .from("leads")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo)
  ).count ?? 0;

  return {
    leadsThisWeek,
    leadsLastWeek: lastWeek.count ?? 0,
    leadsByStatus: tally(leadRows.data as { status: string | null }[] | null),
    listingsByStatus: tally(listingRows.data as { status: string | null }[] | null),
    communities: communities.count ?? 0,
    reviews: reviews.count ?? 0,
    draftArticles: draftArticles.count ?? 0,
    activeInventoryValue: (activeValue.data ?? []).reduce(
      (sum, row) => sum + Number(row.price ?? 0),
      0,
    ),
  };
}

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: string | null;
  createdAt: string;
  actor: string | null;
};

/**
 * What has happened lately, from `audit_logs` (brief §78).
 *
 * ── Why this belongs on the dashboard ─────────────────────────────────────
 *
 * The screen showed six totals and a list of leads, which says what EXISTS but
 * nothing about what is happening. An activity feed is the difference between a
 * dashboard that looks like a report and one that looks like a system somebody
 * is running — and unlike most "activity" widgets this one is not invented, it
 * is the audit trail that already records every publish, every settings change
 * and every sign-in.
 */
export async function getRecentActivity(limit = 8): Promise<ActivityEntry[]> {
  const service = createServiceClient();

  /*
    Two queries, not one embedded join.

    `audit_logs.user_id` references `auth.users`, NOT `profiles`, so PostgREST
    cannot resolve `profiles(...)` from here — it answers PGRST200, "no
    relationship found". The first version did exactly that: the request 400'd,
    this function returned an empty array, and the dashboard displayed "Nothing
    recorded yet" over 151 real rows. A silent failure that reads as an honest
    empty state is the worst kind, so the fallback below is deliberately NOT
    silent about a broken read.

    `profiles.id` is the same uuid as the auth user, so one extra `in` query
    resolves every name at once rather than per row.
  */
  const { data, error } = await service
    .from("audit_logs")
    .select("id, action, entity_type, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(`[getRecentActivity] ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))] as string[];

  const names = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await service
      .from("profiles")
      .select("id, full_name, username")
      .in("id", userIds);

    for (const profile of profiles ?? []) {
      const name = profile.full_name ?? profile.username;
      if (name) names.set(profile.id, name);
    }
  }

  return data.map((row) => ({
    id: row.id,
    action: String(row.action),
    entityType: row.entity_type,
    createdAt: row.created_at,
    // Null for an action taken by a cron or a deleted account. The component
    // renders "The system" rather than a blank.
    actor: row.user_id ? (names.get(row.user_id) ?? null) : null,
  }));
}
