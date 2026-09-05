-- 019_seo_engine.sql
--
-- The SEO intelligence engine's data model (brief §33–§35, §53, §54, §57).
--
-- WHY NOT A JSON BLOB
--
-- §54 is explicit, and it is right. The questions this data has to answer are
-- relational: "which listings target a keyword mentioning Longwood", "which
-- pages have no primary keyword", "what changed in the last run". A jsonb
-- column answers none of those without a sequential scan and a function call
-- per row, and it cannot be constrained — nothing stops a generator writing a
-- keyword for a city the property is not in.
--
-- Flexible AI output still goes in jsonb (`before_data`, `after_data`), because
-- that genuinely is a document. The searchable relationships do not.
--
-- POLYMORPHIC OWNERSHIP
--
-- A keyword belongs to a listing, an article, a city, a community, or a static
-- path. The usual shape for that is `entity_type` + `entity_id`, which cannot
-- have a foreign key and therefore cannot cascade — so deleting a listing
-- leaves its keywords behind for a cron to find.
--
-- Instead each table carries four nullable FK columns and a CHECK that exactly
-- one is set (the same pattern `geo_entities` already uses for city_id /
-- community_id). Referential integrity is real, deletes cascade, and "which
-- listing does this belong to" is a join rather than a convention.
--
-- ROLLBACK
--   drop table seo_internal_links, seo_keyword_cluster_members,
--     seo_keyword_clusters, seo_keywords, seo_generation_runs cascade;
--   drop table seo_settings;
--   drop type seo_keyword_kind, seo_search_intent, seo_run_status,
--     seo_run_trigger, seo_automation_mode, seo_link_status;

-- ---------------------------------------------------------------------------
-- Vocabulary
-- ---------------------------------------------------------------------------

create type seo_keyword_kind as enum (
  'primary',       -- the one phrase the page is most trying to answer
  'secondary',     -- close variants of the primary
  'long_tail',     -- longer, lower-volume, higher-intent
  'feature',       -- a verified property attribute plus a place
  'intent',        -- buyer situation: VA, assumable, new construction
  'nearby',        -- an adjacent place, from the geo graph
  'regional'       -- county or region-level context
);

-- §9. Why a person would type the phrase.
create type seo_search_intent as enum (
  'transactional',
  'commercial',
  'informational',
  'navigational',
  'local',
  'buyer',
  'property_feature',
  'new_construction',
  'va',
  'assumable_mortgage',
  'community',
  'neighborhood'
);

create type seo_run_status as enum ('queued', 'processing', 'completed', 'failed');

create type seo_run_trigger as enum (
  'publish',
  'manual',
  'bulk',
  'content_change',
  'backfill'
);

create type seo_automation_mode as enum ('review', 'auto');

create type seo_link_status as enum ('proposed', 'accepted', 'rejected');

-- ---------------------------------------------------------------------------
-- §34, §35. Every AI SEO operation, with what it changed.
-- ---------------------------------------------------------------------------

create table seo_generation_runs (
  id            uuid primary key default gen_random_uuid(),

  listing_id    uuid references listings(id) on delete cascade,
  article_id    uuid references articles(id) on delete cascade,
  city_id       uuid references cities(id) on delete cascade,
  community_id  uuid references communities(id) on delete cascade,
  -- Static pages: /new-construction-representation and friends. They have no
  -- row anywhere, and they are still first-class SEO entities (§108).
  path          text,

  trigger       seo_run_trigger not null,
  status        seo_run_status not null default 'queued',

  -- The model that produced this, recorded per run rather than read from env
  -- at display time. Env changes; what generated a given row does not.
  model         text,

  -- §35. Which version of the engine and the prompt produced this output, so a
  -- later "why is the copy from March worse" has an answer.
  engine_version text not null,
  prompt_version text not null,

  -- §32. Nothing is applied without one of these being set in review mode.
  approved_by   uuid references profiles(id) on delete set null,
  approved_at   timestamptz,
  rejected_at   timestamptz,

  before_data   jsonb,
  after_data    jsonb,
  changes       jsonb,
  error         text,

  created_at    timestamptz not null default now(),
  completed_at  timestamptz,

  constraint seo_generation_runs_one_owner check (
    num_nonnulls(listing_id, article_id, city_id, community_id)
      + (path is not null)::int = 1
  ),
  -- A run cannot be both approved and rejected.
  constraint seo_generation_runs_one_verdict check (
    approved_at is null or rejected_at is null
  )
);

create index seo_generation_runs_listing_idx on seo_generation_runs (listing_id)
  where listing_id is not null;
create index seo_generation_runs_created_idx on seo_generation_runs (created_at desc);
-- The review queue: everything finished and awaiting a human.
create index seo_generation_runs_pending_idx on seo_generation_runs (created_at desc)
  where status = 'completed' and approved_at is null and rejected_at is null;

comment on table seo_generation_runs is
  'Brief §34. One row per AI SEO operation, holding before/after and who '
  'approved it. This is the answer to "what did the AI change and when".';

-- ---------------------------------------------------------------------------
-- §8, §9, §10. Keywords, each with the evidence that supports it.
-- ---------------------------------------------------------------------------

create table seo_keywords (
  id            uuid primary key default gen_random_uuid(),

  listing_id    uuid references listings(id) on delete cascade,
  article_id    uuid references articles(id) on delete cascade,
  city_id       uuid references cities(id) on delete cascade,
  community_id  uuid references communities(id) on delete cascade,
  path          text,

  keyword       text not null,
  kind          seo_keyword_kind not null,
  intent        seo_search_intent not null,

  /*
    The place this keyword names, when it names one.

    This is the column that makes §57 enforceable. A keyword mentioning
    Longwood carries the Longwood entity id, and a validator can then check
    that `listing_geo_relevance` actually connects it to this listing — rather
    than string-matching a place name out of a phrase and hoping.
  */
  geo_entity_id uuid references geo_entities(id) on delete set null,

  /*
    §85. Why this keyword was chosen, in a sentence, for a person.

    Not optional. A keyword with no stated support is exactly the kind the
    engine is supposed to refuse to generate, so the schema refuses to store
    one.
  */
  evidence      text not null,

  -- 0–100. Ordering within a kind, not a quality score invented for display
  -- (§30 forbids invented scores).
  score         smallint not null default 50 check (score between 0 and 100),

  -- Set by a person. The engine never overwrites either.
  pinned        boolean not null default false,
  excluded      boolean not null default false,

  run_id        uuid references seo_generation_runs(id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint seo_keywords_one_owner check (
    num_nonnulls(listing_id, article_id, city_id, community_id)
      + (path is not null)::int = 1
  ),
  -- No leading/trailing space, no empty keyword, and a hard ceiling: a
  -- "keyword" of 200 characters is a sentence somebody pasted.
  constraint seo_keywords_shape check (
    keyword = btrim(keyword) and char_length(keyword) between 3 and 120
  )
);

-- The same phrase must not be stored twice for one owner. Four partial unique
-- indexes rather than one over the nullable columns, because NULLs do not
-- compare equal and a composite unique index would let duplicates through.
create unique index seo_keywords_listing_uniq
  on seo_keywords (listing_id, lower(keyword)) where listing_id is not null;
create unique index seo_keywords_article_uniq
  on seo_keywords (article_id, lower(keyword)) where article_id is not null;
create unique index seo_keywords_city_uniq
  on seo_keywords (city_id, lower(keyword)) where city_id is not null;
create unique index seo_keywords_community_uniq
  on seo_keywords (community_id, lower(keyword)) where community_id is not null;
create unique index seo_keywords_path_uniq
  on seo_keywords (path, lower(keyword)) where path is not null;

create index seo_keywords_geo_idx on seo_keywords (geo_entity_id)
  where geo_entity_id is not null;
create index seo_keywords_intent_idx on seo_keywords (intent);

-- ---------------------------------------------------------------------------
-- §8. Named clusters, so the admin sees groups rather than a flat list.
-- ---------------------------------------------------------------------------

create table seo_keyword_clusters (
  id            uuid primary key default gen_random_uuid(),

  listing_id    uuid references listings(id) on delete cascade,
  article_id    uuid references articles(id) on delete cascade,
  city_id       uuid references cities(id) on delete cascade,
  community_id  uuid references communities(id) on delete cascade,
  path          text,

  label         text not null,
  kind          seo_keyword_kind not null,
  intent        seo_search_intent not null,
  created_at    timestamptz not null default now(),

  constraint seo_keyword_clusters_one_owner check (
    num_nonnulls(listing_id, article_id, city_id, community_id)
      + (path is not null)::int = 1
  )
);

create table seo_keyword_cluster_members (
  cluster_id  uuid not null references seo_keyword_clusters(id) on delete cascade,
  keyword_id  uuid not null references seo_keywords(id) on delete cascade,
  position    smallint not null default 0,
  primary key (cluster_id, keyword_id)
);

-- ---------------------------------------------------------------------------
-- §16, §87. Internal links the engine proposes, and a person accepts.
--
-- `to_path` is a path and not a foreign key on purpose: a link may point at a
-- static page that has no row. §87 requires the target to exist, which is a
-- check performed when the link is proposed and re-checked by the broken-link
-- audit (§88) — a constraint here could only express half of it.
-- ---------------------------------------------------------------------------

create table seo_internal_links (
  id            uuid primary key default gen_random_uuid(),

  listing_id    uuid references listings(id) on delete cascade,
  article_id    uuid references articles(id) on delete cascade,
  city_id       uuid references cities(id) on delete cascade,
  community_id  uuid references communities(id) on delete cascade,
  from_path     text,

  to_path       text not null,
  anchor        text not null,
  reason        text not null,
  status        seo_link_status not null default 'proposed',

  run_id        uuid references seo_generation_runs(id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint seo_internal_links_one_owner check (
    num_nonnulls(listing_id, article_id, city_id, community_id)
      + (from_path is not null)::int = 1
  ),
  constraint seo_internal_links_target check (to_path like '/%')
);

create index seo_internal_links_to_idx on seo_internal_links (to_path);
create index seo_internal_links_status_idx on seo_internal_links (status);

-- ---------------------------------------------------------------------------
-- §33, §91. Engine settings. One row, like site_settings.
-- ---------------------------------------------------------------------------

create table seo_settings (
  id                        smallint primary key default 1 check (id = 1),

  -- §32. `review` is the default deliberately: a system that rewrites the
  -- client's copy the first time it runs, before anyone has seen what it
  -- produces, will be switched off and never switched on again.
  mode                      seo_automation_mode not null default 'review',

  -- Scope (§91)
  enable_listings           boolean not null default true,
  enable_articles           boolean not null default true,
  enable_cities             boolean not null default true,
  enable_communities        boolean not null default true,
  enable_static_pages       boolean not null default true,

  -- Capabilities (§33)
  enable_geographic         boolean not null default true,
  enable_keywords           boolean not null default true,
  enable_internal_links     boolean not null default true,
  enable_schema             boolean not null default true,
  enable_image_alt          boolean not null default false,
  enable_continuous         boolean not null default true,

  -- Safety (§33, §86). Every one defaults ON, and each is a rule the engine
  -- enforces rather than a preference it considers.
  require_verified_features boolean not null default true,
  require_geo_relevance     boolean not null default true,
  block_keyword_stuffing    boolean not null default true,
  require_review_for_major  boolean not null default true,

  -- §37. Bulk protection. The provider permits one request in flight; see the
  -- measurement in lib/seo/auto/pool.ts.
  bulk_batch_size           smallint not null default 25
    check (bulk_batch_size between 1 and 100),

  updated_at                timestamptz not null default now()
);

insert into seo_settings (id) values (1) on conflict (id) do nothing;

create trigger touch_seo_settings
  before update on seo_settings
  for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- RLS.
--
-- Keywords and internal links are read by the PUBLIC site — they drive the
-- rendered internal links and the copy — so anon may select them. Generation
-- runs and settings are operational: they hold before/after snapshots and who
-- approved what, which is nobody's business outside the dashboard.
-- ---------------------------------------------------------------------------

alter table seo_keywords enable row level security;
alter table seo_keyword_clusters enable row level security;
alter table seo_keyword_cluster_members enable row level security;
alter table seo_internal_links enable row level security;
alter table seo_generation_runs enable row level security;
alter table seo_settings enable row level security;

create policy "public read seo_keywords" on seo_keywords
  for select to anon, authenticated using (not excluded);
create policy "admin all seo_keywords" on seo_keywords
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "public read seo_keyword_clusters" on seo_keyword_clusters
  for select to anon, authenticated using (true);
create policy "admin all seo_keyword_clusters" on seo_keyword_clusters
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "public read seo_keyword_cluster_members" on seo_keyword_cluster_members
  for select to anon, authenticated using (true);
create policy "admin all seo_keyword_cluster_members" on seo_keyword_cluster_members
  for all to authenticated using (is_admin()) with check (is_admin());

-- Only ACCEPTED links reach the public site. A proposal is a suggestion
-- awaiting review (§32) and must never render.
create policy "public read accepted seo_internal_links" on seo_internal_links
  for select to anon, authenticated using (status = 'accepted');
create policy "admin all seo_internal_links" on seo_internal_links
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin all seo_generation_runs" on seo_generation_runs
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin all seo_settings" on seo_settings
  for all to authenticated using (is_admin()) with check (is_admin());
