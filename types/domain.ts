/**
 * Hand-written normalized domain types.
 *
 * Components and pages see ONLY these — never a raw Supabase row
 * (CLAUDE.md hard rule 19). The mapping from `types/database.ts` rows lives in
 * `lib/queries/*` and nowhere else. That boundary is what lets a future MLS
 * provider return the same `Listing` shape without a single change downstream.
 */

/* ── Media ──────────────────────────────────────────────────────────────── */

/**
 * Discriminated union so a future MLS feed (whose photos are hotlinked from the
 * MLS CDN) needs no schema change. See docs/11-mls-future.md.
 *
 * `key` is the immutable base key with NO size suffix and NO extension.
 * The URL is built at runtime — CLAUDE.md hard rule 1.
 */
export type StoredPhoto = {
  kind: "stored";
  key: string;
  w: number;
  h: number;
  alt: string;
  /**
   * Tiny base64 WebP data URL (~24px wide, a few hundred bytes) used as the
   * next/image blur placeholder. Generated at upload time in Phase 2.
   */
  blur?: string;
  order?: number;
};

export type ExternalPhoto = {
  kind: "external";
  url: string;
  w: number;
  h: number;
  alt: string;
  order?: number;
};

export type Photo = StoredPhoto | ExternalPhoto;

export type PhotoSize = 1600 | 800 | 400;

/* ── Enums mirrored from the database CHECK constraints ─────────────────── */

export type ListingStatus =
  | "active"
  | "pending"
  | "sold"
  | "coming_soon"
  | "off_market";

export type ListingType =
  | "resale"
  | "new_construction"
  | "assumable"
  | "va_eligible"
  | "land";

export type PropertyType =
  | "single_family"
  | "townhouse"
  | "condo"
  | "villa"
  | "multi_family"
  | "land"
  | "manufactured";

export type LeadType =
  | "general"
  | "listing_inquiry"
  | "showing_request"
  | "seller"
  | "va"
  | "assumable"
  | "new_construction";

export type ArticleKind = "blog" | "market_update" | "guide";

/* ── Small shared shapes ────────────────────────────────────────────────── */

export type FaqItem = { q: string; a: string };

export type PlaceRef = { id: string; slug: string; name: string };

export type CityStats = {
  medianPrice?: number;
  medianPricePerSqft?: number;
  avgDaysOnMarket?: number;
  population?: number;
  schoolDistrict?: string;
  commuteToOrlando?: string;
  /** ISO date. Every statistic must carry the date it was true. */
  asOf?: string;
};

/* ── Listing ────────────────────────────────────────────────────────────── */

/** The trimmed shape a card needs. Backed by the `listing_card` view. */
export type ListingCard = {
  id: string;
  slug: string;
  status: ListingStatus;
  listingType: ListingType;
  propertyType: PropertyType;
  price: number;
  soldPrice: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  address: string;
  unit: string | null;
  zip: string | null;
  city: PlaceRef;
  communityId: string | null;
  cover: Photo | null;
  photosPurged: boolean;
  isFeatured: boolean;
  publishedAt: string | null;
  soldAt: string | null;
};

export type Listing = ListingCard & {
  halfBaths: number;
  lotSize: number | null;
  yearBuilt: number | null;
  garageSpaces: number;
  stories: number | null;
  pool: boolean;
  waterfront: boolean;
  features: string[];
  hoaFee: number | null;
  taxesAnnual: number | null;
  lat: number | null;
  lng: number | null;
  community: PlaceRef | null;
  headline: string | null;
  description: string | null;
  /** Her construction read on the property. The listing-page differentiator. */
  contractorsTake: string | null;
  photos: Photo[];
  virtualTour: string | null;
  metaTitle: string | null;
  metaDesc: string | null;
  keepPhotos: boolean;
  /** 'manual' today; 'stellar' once the MLS feed is connected. */
  source: string;
  mlsNumber: string | null;
  isLocked: boolean;
  updatedAt: string;
};

/* ── Places ─────────────────────────────────────────────────────────────── */

export type City = {
  id: string;
  slug: string;
  name: string;
  county: string;
  state: string;
  inSearch: boolean;
  isFlagship: boolean;
  heroKey: string | null;
  heroAlt: string | null;
  introMd: string | null;
  bodyMd: string | null;
  stats: CityStats;
  faq: FaqItem[];
  metaTitle: string | null;
  metaDesc: string | null;
};

export type Community = {
  id: string;
  slug: string;
  name: string;
  city: PlaceRef;
  heroKey: string | null;
  heroAlt: string | null;
  introMd: string | null;
  bodyMd: string | null;
  hoaInfo: string | null;
  amenities: string[];
  priceRange: { min: number; max: number } | null;
  faq: FaqItem[];
  metaTitle: string | null;
  metaDesc: string | null;
};

/* ── Content ────────────────────────────────────────────────────────────── */

export type ArticleCard = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  kind: ArticleKind;
  coverKey: string | null;
  coverAlt: string | null;
  city: PlaceRef | null;
  tags: string[];
  publishedAt: string | null;
  readingMin: number | null;
};

export type Article = ArticleCard & {
  /**
   * Questions this article answers (migration 021, brief §21).
   *
   * Rendered on the page AND emitted as FAQPage markup, from this one array.
   * Two sources would let the markup describe questions the page does not show,
   * which is a structured-data policy violation.
   */
  faq: FaqItem[];
  /** Tiptap document. Rendered by the rich-text renderer, never dangerouslySet. */
  bodyJson: unknown;
  bodyText: string | null;
  community: PlaceRef | null;
  metaTitle: string | null;
  metaDesc: string | null;
  ogKey: string | null;
  updatedAt: string;
};

export type Review = {
  id: string;
  authorName: string;
  authorRole: string | null;
  rating: number | null;
  body: string;
  source: string | null;
  sourceUrl: string | null;
  reviewedAt: string | null;
};

/* ── Search ─────────────────────────────────────────────────────────────── */

/**
 * Facet options come from the `listing_facets` view (hard rule 22).
 * `total: 0` options render DISABLED with their count rather than hidden — a
 * disabled option teaches the visitor what exists.
 */
export type FacetOption<T extends string = string> = {
  value: T;
  label: string;
  total: number;
};

export type Facets = {
  cities: FacetOption[];
  propertyTypes: FacetOption<PropertyType>[];
  listingTypes: FacetOption<ListingType>[];
  price: { min: number; max: number } | null;
  beds: { min: number; max: number } | null;
  sqft: { min: number; max: number } | null;
  year: { min: number; max: number } | null;
  total: number;
};

export type SearchResult = {
  listings: ListingCard[];
  total: number;
  page: number;
  pageCount: number;
};

/* ── Leads ──────────────────────────────────────────────────────────────── */

export type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string | null;
  leadType: LeadType;
  sourcePage: string | null;
  listingId: string | null;
  utm: Record<string, string> | null;
  status: "new" | "contacted" | "qualified" | "closed" | "spam";
  notes: string | null;
  createdAt: string;
};

/* ── Ops ────────────────────────────────────────────────────────────────── */

export type StorageUsage = {
  totalBytes: number;
  listingBytes: number;
  articleBytes: number;
  otherBytes: number;
  objectCount: number;
  /** Supabase free-tier ceiling, in bytes. */
  limitBytes: number;
};

/**
 * Editable site settings — one row, `site_settings.id = 1` (Phase 2).
 *
 * Every field is nullable because NULL means "the client has not supplied this
 * yet". Components fall back to the `PENDING` sentinel in `lib/site-config.ts`
 * and hide the block rather than render a placeholder phone number.
 */
export type SiteSettings = {
  phone: string | null;
  email: string | null;
  address: {
    street: string | null;
    locality: string | null;
    region: string | null;
    postalCode: string | null;
  };
  officeHours: string | null;
  /** Feeds the `sameAs` array in JSON-LD. Empty values are dropped. */
  profiles: Record<string, string>;
  positioning: string | null;
  announcement: string | null;
  announcementHref: string | null;
  ogKey: string | null;
  heroKey: string | null;
  brokerageName: string | null;
  /** Runtime branding overrides (migration 015). NULL means "use site-config". */
  brandName: string | null;
  legalName: string | null;
  logoKey: string | null;
  logoInvertKey: string | null;
  /**
   * The logo's real pixel size, read from `media` through the public view
   * (migration 016). Null when no logo is set.
   *
   * Needed so the header can reserve the right box before the image loads. The
   * component previously assumed 3:2 for every upload, which letterboxed any
   * other ratio and was the reason a transparent logo showed a pale plate in
   * the footer.
   */
  logoW: number | null;
  logoH: number | null;
  logoInvertW: number | null;
  logoInvertH: number | null;
  licenseReLabel: string | null;
  licenseReAuthority: string | null;
  licenseContractorLabel: string | null;
  licenseContractorAuthority: string | null;
  yearsExperience: number | null;
  licenseRe: string | null;
  licenseContractor: string | null;
  disclosureText: string | null;
  /**
   * WhatsApp number, any readable format (migration 017). NULL falls back to
   * `phone`; when both are null the floating button is not rendered.
   */
  whatsapp: string | null;
  updatedAt: string | null;
};

/** The admin-only half of the settings row. Never leaves the server. */
export type AdminSettings = SiteSettings & {
  leadNotifyEmail: string | null;
  autoresponderSubject: string | null;
  autoresponderBody: string | null;
  lastOrphanSweep: string | null;
  lastPurgeRun: string | null;
  lastSitemapPing: string | null;
};

/** A row in the Media library screen. */
export type MediaItem = {
  id: string;
  key: string;
  variants: number[];
  bytes: number;
  width: number | null;
  height: number | null;
  mime: string;
  entityType: "listing" | "article" | "city" | "community" | "profile" | "site";
  entityId: string | null;
  createdAt: string;
};

/** One row of the dashboard's "Needs attention" panel. */
export type AttentionItem = {
  id: string;
  severity: "high" | "medium" | "low";
  label: string;
  detail: string;
  href: string;
};
