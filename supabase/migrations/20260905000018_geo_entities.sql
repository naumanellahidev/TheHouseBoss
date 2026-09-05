-- 018_geo_entities.sql
--
-- The geographic entity graph (brief §55, §56).
--
-- WHY THIS EXISTS
--
-- The SEO engine has to answer "is this location genuinely relevant to this
-- property" before it may put a place name in a title or a keyword. Today the
-- only geography in the schema is `cities` plus a `county` TEXT column on it,
-- so the honest answer to "is Heathrow near this listing" is a string compare.
--
-- A model that cannot express "Heathrow is a community inside Lake Mary, which
-- is in Seminole County, which is in Central Florida" cannot stop a generator
-- writing "homes near Tampa" onto a Lake Mary listing. Brief §6 and §57 both
-- turn on that check, so the graph comes first.
--
-- SHAPE
--
--   geo_entities            one row per place, self-referencing via parent_id
--   geo_entity_links        typed edges that a tree cannot express
--   listing_geo_relevance   which places a listing may legitimately mention
--
-- The self-reference carries containment (community -> city -> county ->
-- region). `geo_entity_links` carries everything else: "adjacent to",
-- "commonly searched with". Those are not containment, and modelling them as a
-- second parent would corrupt the tree that containment queries depend on.
--
-- ROLLBACK
--   drop table listing_geo_relevance, geo_entity_links, geo_entities cascade;
--   drop type geo_link_kind, geo_entity_kind;

create type geo_entity_kind as enum (
  'region',
  'county',
  'city',
  'community',
  'neighborhood'
);

create table geo_entities (
  id          uuid primary key default gen_random_uuid(),
  kind        geo_entity_kind not null,
  name        text not null,
  slug        text not null,

  -- Containment. NULL only for a region, which is the root.
  parent_id   uuid references geo_entities(id) on delete restrict,

  -- The row this entity IS, where one already exists. `cities` and
  -- `communities` remain the editorial records — they own the hero image, the
  -- intro copy and the public page — and this table owns the relationships
  -- between them. Duplicating the editorial content here would create two
  -- places to edit a city description, and they would disagree within a week.
  city_id      uuid references cities(id) on delete cascade,
  community_id uuid references communities(id) on delete cascade,

  -- Optional centre, for distance sanity checks. Not PostGIS: two numerics and
  -- the haversine formula answer "is this plausibly nearby" without a GIST
  -- index or an extension (docs/02, the 500 MB budget).
  lat         numeric(9, 6),
  lng         numeric(9, 6),

  -- Whether the SEO engine may use this place in generated copy at all.
  --
  -- A county is a real entity and a useful parent, but "homes for sale in
  -- Seminole County" is not how buyers search — so a county can exist in the
  -- graph, be used for context and structured data, and still be barred from
  -- keyword generation. That is a per-row editorial decision, not something
  -- derivable from `kind`.
  usable_in_copy boolean not null default true,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  unique (kind, slug),

  -- A region is the root, and nothing else may be.
  constraint geo_entities_root_is_region
    check ((parent_id is null) = (kind = 'region')),

  -- An entity mirrors at most one editorial record.
  constraint geo_entities_one_source
    check (num_nonnulls(city_id, community_id) <= 1)
);

create index geo_entities_parent_idx on geo_entities (parent_id);
create index geo_entities_kind_idx on geo_entities (kind);
create index geo_entities_city_idx on geo_entities (city_id) where city_id is not null;

create trigger touch_geo_entities
  before update on geo_entities
  for each row execute function touch_updated_at();

comment on table geo_entities is
  'The geographic graph the SEO engine reasons over. Containment lives in '
  'parent_id; every other relationship lives in geo_entity_links.';

-- ---------------------------------------------------------------------------
-- Non-containment edges.
-- ---------------------------------------------------------------------------

create type geo_link_kind as enum (
  -- Shares a border, or is a short drive. The edge that makes "homes near
  -- Longwood" defensible on a Lake Mary listing.
  'adjacent',
  -- Different places buyers routinely consider together.
  'commonly_searched_with'
);

create table geo_entity_links (
  id        uuid primary key default gen_random_uuid(),
  from_id   uuid not null references geo_entities(id) on delete cascade,
  to_id     uuid not null references geo_entities(id) on delete cascade,
  kind      geo_link_kind not null,

  -- Why this edge exists, in a sentence, for a person.
  --
  -- Brief §7 requires every location to carry a relevance reason, and §85 asks
  -- the admin to see why the engine chose a keyword. That answer has to be
  -- stored where the relationship is asserted; reconstructing it later from a
  -- graph walk produces a plausible sentence rather than the real reason.
  reason    text not null,

  created_at timestamptz not null default now(),

  unique (from_id, to_id, kind),
  constraint geo_entity_links_no_self check (from_id <> to_id)
);

create index geo_entity_links_from_idx on geo_entity_links (from_id);

-- ---------------------------------------------------------------------------
-- Which places a given listing may legitimately mention.
--
-- Derived, cached, and re-derived when a listing's location changes (§27). A
-- table rather than a view because the SEO engine reads it on every generation
-- and the walk is recursive — and because a person must be able to override a
-- machine decision about geography, which a view cannot hold.
-- ---------------------------------------------------------------------------

create table listing_geo_relevance (
  listing_id  uuid not null references listings(id) on delete cascade,
  entity_id   uuid not null references geo_entities(id) on delete cascade,

  -- 1 = the property is IN this place. 2 = its city or community. 3 = adjacent.
  -- 4 = county. 5 = region. Mirrors the five layers in brief §6, and the
  -- generator uses it to order keywords: layers 1 and 2 are always fair game,
  -- layer 3 needs the property to have nothing better, layer 5 is context only.
  layer       smallint not null check (layer between 1 and 5),
  reason      text not null,

  -- Set by a person, and never overwritten by the engine.
  pinned      boolean not null default false,
  excluded    boolean not null default false,

  created_at  timestamptz not null default now(),

  primary key (listing_id, entity_id)
);

create index listing_geo_relevance_entity_idx on listing_geo_relevance (entity_id);

-- ---------------------------------------------------------------------------
-- RLS. Public reads the graph — it drives public-facing copy and internal
-- links, and there is nothing private in a list of place names. Writes are
-- admin-only.
-- ---------------------------------------------------------------------------

alter table geo_entities enable row level security;
alter table geo_entity_links enable row level security;
alter table listing_geo_relevance enable row level security;

create policy "public read geo_entities" on geo_entities
  for select to anon, authenticated using (true);
create policy "admin all geo_entities" on geo_entities
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "public read geo_entity_links" on geo_entity_links
  for select to anon, authenticated using (true);
create policy "admin all geo_entity_links" on geo_entity_links
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "public read listing_geo_relevance" on listing_geo_relevance
  for select to anon, authenticated using (true);
create policy "admin all listing_geo_relevance" on listing_geo_relevance
  for all to authenticated using (is_admin()) with check (is_admin());
