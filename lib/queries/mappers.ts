import type {
  Article,
  ArticleCard,
  City,
  CityStats,
  Community,
  FaqItem,
  Listing,
  ListingCard,
  Photo,
  Review,
} from "@/types/domain";

/**
 * The row → domain boundary (CLAUDE.md hard rule 19).
 *
 * Every mapper is defensive: `types/database.ts` is a permissive placeholder
 * until the real generated file lands, and a database column can be null in
 * ways a component should never have to think about. A mapper never throws on
 * a malformed row — it returns a shape the UI can render.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

const num = (v: unknown): number | null =>
  v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null;

const numOr = (v: unknown, fallback: number): number => num(v) ?? fallback;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;

const arr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Tolerates a legacy shape with no `kind` by assuming a stored photo. */
export function toPhoto(v: unknown): Photo | null {
  if (!v || typeof v !== "object") return null;
  const p = v as Row;

  if (p.kind === "external" || (typeof p.url === "string" && !p.key)) {
    if (typeof p.url !== "string") return null;
    return {
      kind: "external",
      url: p.url,
      w: numOr(p.w, 1600),
      h: numOr(p.h, 1200),
      alt: typeof p.alt === "string" ? p.alt : "",
      order: num(p.order) ?? undefined,
    };
  }

  if (typeof p.key !== "string") return null;
  return {
    kind: "stored",
    key: p.key,
    w: numOr(p.w, 1600),
    h: numOr(p.h, 1200),
    alt: typeof p.alt === "string" ? p.alt : "",
    blur: typeof p.blur === "string" ? p.blur : undefined,
    order: num(p.order) ?? undefined,
  };
}

export function toPhotos(v: unknown): Photo[] {
  if (!Array.isArray(v)) return [];
  return v
    .map(toPhoto)
    .filter((p): p is Photo => p !== null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

export function toFaq(v: unknown): FaqItem[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (x): x is FaqItem =>
        !!x && typeof x === "object" &&
        typeof (x as Row).q === "string" &&
        typeof (x as Row).a === "string",
    )
    .map((x) => ({ q: x.q, a: x.a }));
}

export function toCityStats(v: unknown): CityStats {
  if (!v || typeof v !== "object") return {};
  const s = v as Row;
  return {
    medianPrice: num(s.medianPrice) ?? undefined,
    medianPricePerSqft: num(s.medianPricePerSqft) ?? undefined,
    avgDaysOnMarket: num(s.avgDaysOnMarket) ?? undefined,
    population: num(s.population) ?? undefined,
    schoolDistrict: str(s.schoolDistrict) ?? undefined,
    commuteToOrlando: str(s.commuteToOrlando) ?? undefined,
    asOf: str(s.asOf) ?? undefined,
  };
}

/* ── Listings ───────────────────────────────────────────────────────────── */

/** Maps a `listing_card` view row. */
export function toListingCard(row: Row): ListingCard {
  return {
    id: row.id,
    slug: row.slug,
    status: row.status,
    listingType: row.listing_type,
    propertyType: row.property_type,
    price: numOr(row.price, 0),
    soldPrice: num(row.sold_price),
    beds: num(row.beds),
    baths: num(row.baths),
    sqft: num(row.sqft),
    address: row.address ?? "",
    unit: str(row.unit),
    zip: str(row.zip),
    city: {
      id: row.city_id,
      slug: row.city_slug ?? row.cities?.slug ?? "",
      name: row.city_name ?? row.cities?.name ?? "",
    },
    communityId: row.community_id ?? null,
    cover: toPhoto(row.cover) ?? toPhotos(row.photos)[0] ?? null,
    photosPurged: Boolean(row.photos_purged),
    isFeatured: Boolean(row.is_featured),
    publishedAt: str(row.published_at),
    soldAt: str(row.sold_at),
  };
}

/** Maps a full `listings` row joined to its city and community. */
export function toListing(row: Row): Listing {
  const community = row.communities
    ? {
        id: row.communities.id,
        slug: row.communities.slug,
        name: row.communities.name,
      }
    : null;

  return {
    ...toListingCard(row),
    city: {
      id: row.city_id,
      slug: row.cities?.slug ?? row.city_slug ?? "",
      name: row.cities?.name ?? row.city_name ?? "",
    },
    halfBaths: numOr(row.half_baths, 0),
    lotSize: num(row.lot_size),
    yearBuilt: num(row.year_built),
    garageSpaces: numOr(row.garage_spaces, 0),
    stories: num(row.stories),
    pool: Boolean(row.pool),
    waterfront: Boolean(row.waterfront),
    features: arr(row.features),
    hoaFee: num(row.hoa_fee),
    taxesAnnual: num(row.taxes_annual),
    lat: num(row.lat),
    lng: num(row.lng),
    community,
    headline: str(row.headline),
    description: str(row.description),
    contractorsTake: str(row.contractors_take),
    photos: toPhotos(row.photos),
    virtualTour: str(row.virtual_tour),
    metaTitle: str(row.meta_title),
    metaDesc: str(row.meta_desc),
    keepPhotos: Boolean(row.keep_photos),
    source: row.source ?? "manual",
    mlsNumber: str(row.mls_number),
    isLocked: Boolean(row.is_locked),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

/* ── Places ─────────────────────────────────────────────────────────────── */

export function toCity(row: Row): City {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    county: row.county ?? "",
    state: row.state ?? "FL",
    inSearch: Boolean(row.in_search),
    isFlagship: Boolean(row.is_flagship),
    heroKey: str(row.hero_key),
    heroAlt: str(row.hero_alt),
    introMd: str(row.intro_md),
    bodyMd: str(row.body_md),
    stats: toCityStats(row.stats_json),
    faq: toFaq(row.faq_json),
    metaTitle: str(row.meta_title),
    metaDesc: str(row.meta_desc),
  };
}

export function toCommunity(row: Row): Community {
  const pr = row.price_range;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: {
      id: row.city_id,
      slug: row.cities?.slug ?? "",
      name: row.cities?.name ?? "",
    },
    heroKey: str(row.hero_key),
    heroAlt: str(row.hero_alt),
    introMd: str(row.intro_md),
    bodyMd: str(row.body_md),
    hoaInfo: str(row.hoa_info),
    amenities: arr(row.amenities),
    priceRange:
      pr && num(pr.min) != null && num(pr.max) != null
        ? { min: Number(pr.min), max: Number(pr.max) }
        : null,
    faq: toFaq(row.faq_json),
    metaTitle: str(row.meta_title),
    metaDesc: str(row.meta_desc),
  };
}

/* ── Content ────────────────────────────────────────────────────────────── */

export function toArticleCard(row: Row): ArticleCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title ?? "",
    excerpt: str(row.excerpt),
    kind: row.kind ?? "blog",
    coverKey: str(row.cover_key),
    coverAlt: str(row.cover_alt),
    city: row.cities
      ? { id: row.city_id, slug: row.cities.slug, name: row.cities.name }
      : null,
    tags: arr(row.tags),
    publishedAt: str(row.published_at),
    readingMin: num(row.reading_min),
  };
}

export function toArticle(row: Row): Article {
  return {
    ...toArticleCard(row),
    bodyJson: row.body_json ?? {},
    bodyText: str(row.body_text),
    // Migration 021. The same shape cities and communities already use, so
    // FaqRepeater, FaqAccordion and faqJsonLd all work unchanged.
    faq: toFaq(row.faq_json),
    community: row.communities
      ? {
          id: row.community_id,
          slug: row.communities.slug,
          name: row.communities.name,
        }
      : null,
    metaTitle: str(row.meta_title),
    metaDesc: str(row.meta_desc),
    ogKey: str(row.og_key),
    updatedAt: row.updated_at ?? new Date(0).toISOString(),
  };
}

export function toReview(row: Row): Review {
  return {
    id: row.id,
    authorName: row.author_name ?? "",
    authorRole: str(row.author_role),
    rating: num(row.rating),
    body: row.body ?? "",
    source: str(row.source),
    sourceUrl: str(row.source_url),
    reviewedAt: str(row.reviewed_at),
  };
}
