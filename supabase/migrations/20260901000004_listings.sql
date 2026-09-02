-- 004_listings.sql
-- The listings table.
--
-- Three constraints here are the database half of the hard rules in CLAUDE.md.
-- The UI and the API enforce the same things; all three layers must agree.
--   listings_photo_limit           HR3  — max 15 photos
--   listings_published_needs_photo HR6  — no published listing renders empty
--   listings_sold_fields                — a sold listing always has date + price
--
-- The six MLS columns and sync_log are unused today and MUST NOT BE REMOVED.
-- They are what makes adding Stellar MLS later a provider file plus a cron
-- route instead of a migration against a live database. See docs/11-mls-future.

create table listings (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,

  -- ── state ───────────────────────────────────────────────────────────────
  status         text not null default 'active'
                 check (status in ('active','pending','sold','coming_soon','off_market')),
  listing_type   text not null default 'resale'
                 check (listing_type in ('resale','new_construction','assumable','va_eligible','land')),
  property_type  text not null default 'single_family'
                 check (property_type in
                   ('single_family','townhouse','condo','villa','multi_family','land','manufactured')),

  -- ── money ───────────────────────────────────────────────────────────────
  price          numeric(12,2) not null check (price >= 0),
  hoa_fee        numeric(10,2),
  taxes_annual   numeric(10,2),

  -- ── physical ────────────────────────────────────────────────────────────
  beds           int          check (beds between 0 and 20),
  baths          numeric(3,1) check (baths between 0 and 20),
  half_baths     int not null default 0,
  sqft           int          check (sqft between 0 and 100000),
  lot_size       numeric(10,2),                    -- acres
  year_built     int          check (year_built between 1800 and 2100),
  garage_spaces  int not null default 0,
  stories        int,
  pool           boolean not null default false,
  waterfront     boolean not null default false,
  features       text[] not null default '{}',

  -- ── location ────────────────────────────────────────────────────────────
  address        text not null,
  unit           text,
  city_id        uuid not null references cities(id) on delete restrict,
  community_id   uuid references communities(id) on delete set null,
  zip            text,
  lat            numeric(9,6),
  lng            numeric(9,6),

  -- ── content ─────────────────────────────────────────────────────────────
  headline           text,
  description        text,
  contractors_take   text,   -- her construction read; the listing differentiator
  photos             jsonb not null default '[]'::jsonb,
  virtual_tour       text,
  floorplan_key      text,

  -- ── seo ─────────────────────────────────────────────────────────────────
  meta_title     text,
  meta_desc      text,

  -- ── lifecycle ───────────────────────────────────────────────────────────
  is_featured    boolean not null default false,
  published      boolean not null default false,
  published_at   timestamptz,
  sold_at        timestamptz,
  sold_price     numeric(12,2),
  purge_after    timestamptz,
  photos_purged  boolean not null default false,
  keep_photos    boolean not null default false,

  -- ── MLS-ready, unused today. DO NOT REMOVE. ─────────────────────────────
  source         text not null default 'manual',
  source_id      text,
  mls_number     text,
  synced_at      timestamptz,
  is_locked      boolean not null default false,
  raw            jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint listings_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint listings_source_unique unique (source, source_id),
  constraint listings_photos_is_array check (jsonb_typeof(photos) = 'array'),
  constraint listings_photo_limit check (jsonb_array_length(photos) <= 15),
  constraint listings_published_needs_photo check (
    published = false or jsonb_array_length(photos) >= 1
  ),
  constraint listings_sold_fields check (
    status <> 'sold' or (sold_at is not null and sold_price is not null)
  )
);

comment on column listings.photos is
  'Array of a discriminated union so a future MLS feed needs no schema change: '
  '{ kind:"stored", key, w, h, alt, blur } for our own images (key only — never '
  'a full URL, HR1) or { kind:"external", url, w, h, alt } for MLS hotlinks.';

comment on column listings.raw is
  'Reserved for a future MLS payload. Stays NULL until then — it is the single '
  'largest bloat risk against the 500 MB budget.';

comment on column listings.contractors_take is
  'Rendered as a distinct callout on the listing page. No other agent listing '
  'in the market can carry this, so it is a first-class column, not a tag.';

-- ---------------------------------------------------------------------------
-- Indexes. The partial predicates are deliberate: they keep the indexes small,
-- which matters on a 500 MB budget.
-- ---------------------------------------------------------------------------

create index listings_browse_idx
  on listings (published, status, city_id, price desc)
  where published = true;

create index listings_type_idx
  on listings (listing_type)
  where published = true;

create index listings_new_construction_idx
  on listings (city_id, price)
  where published = true and listing_type = 'new_construction';

create index listings_featured_idx
  on listings (is_featured, published_at desc)
  where published = true and is_featured = true;

create index listings_community_idx
  on listings (community_id)
  where published = true and community_id is not null;

create index listings_sold_idx
  on listings (sold_at desc)
  where status = 'sold';

-- Drives the daily purge-sold-photos cron (HR10).
create index listings_purge_idx
  on listings (purge_after)
  where status = 'sold' and photos_purged = false and keep_photos = false;

create index listings_features_idx on listings using gin (features);

create index listings_fts_idx on listings using gin (
  to_tsvector(
    'english',
    coalesce(address, '') || ' ' ||
    coalesce(headline, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(zip, '')
  )
);
