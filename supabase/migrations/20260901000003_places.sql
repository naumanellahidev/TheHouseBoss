-- 003_places.sql
-- Cities and communities.
--
-- Two levels, resolved from the client's overlapping lists (docs/01 § Cities vs
-- communities):
--   city      — an incorporated municipality with its own landing page
--   community — a neighborhood or CDP inside a city (e.g. Heathrow)
--
-- `in_search` marks the five cities the client named as search targets; the
-- other three get content pages only.

create table cities (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  county       text not null,
  state        text not null default 'FL',

  in_search    boolean not null default false,
  is_flagship  boolean not null default false,
  sort_order   int not null default 0,

  hero_key     text,
  intro_md     text,
  body_md      text,
  stats_json   jsonb not null default '{}'::jsonb,
  faq_json     jsonb not null default '[]'::jsonb,

  meta_title   text,
  meta_desc    text,

  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint cities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint cities_faq_is_array check (jsonb_typeof(faq_json) = 'array'),
  constraint cities_stats_is_object check (jsonb_typeof(stats_json) = 'object')
);

create index cities_published_idx on cities (published, sort_order);
create index cities_in_search_idx on cities (in_search) where published = true;

comment on column cities.stats_json is
  'Fixed keys, rendered by <StatTiles />: medianPrice, medianPricePerSqft, '
  'avgDaysOnMarket, population, schoolDistrict, commuteToOrlando, asOf. '
  'asOf is required — every published statistic must carry its date.';

comment on column cities.faq_json is
  'Array of { q, a }. Feeds BOTH the visible accordion and the FAQPage JSON-LD; '
  'the two must never diverge.';

-- ---------------------------------------------------------------------------

create table communities (
  id          uuid primary key default gen_random_uuid(),
  city_id     uuid not null references cities(id) on delete restrict,
  slug        text unique not null,
  name        text not null,

  hero_key    text,
  intro_md    text,
  body_md     text,
  hoa_info    text,
  amenities   text[] not null default '{}',
  price_range jsonb,
  faq_json    jsonb not null default '[]'::jsonb,

  meta_title  text,
  meta_desc   text,

  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint communities_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint communities_faq_is_array check (jsonb_typeof(faq_json) = 'array')
);

create index communities_city_idx on communities (city_id, published, sort_order);
