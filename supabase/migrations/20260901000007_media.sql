-- 007_media.sql
-- Media accounting, redirects, and the reserved MLS sync log.

-- ---------------------------------------------------------------------------
-- Every stored object gets a row here (HR9). This table is how the dashboard
-- reports storage usage against the 1 GB ceiling and how the orphan cron finds
-- objects nothing references.
-- ---------------------------------------------------------------------------
create table media (
  id           uuid primary key default gen_random_uuid(),
  key          text not null unique,          -- base key: no size suffix, no extension
  variants     int[] not null default '{1600,800,400}',
  bytes        bigint not null check (bytes >= 0),   -- total across all variants
  width        int,
  height       int,
  mime         text not null default 'image/webp',
  content_hash text,                          -- rejects a duplicate upload on the same entity
  entity_type  text not null
               check (entity_type in ('listing','article','city','community','profile','site')),
  entity_id    uuid,
  created_at   timestamptz not null default now()
);

create index media_entity_idx on media (entity_type, entity_id);
create index media_bytes_idx on media (bytes desc);
create index media_created_idx on media (created_at);
create unique index media_entity_hash_idx
  on media (entity_type, entity_id, content_hash)
  where content_hash is not null;

comment on column media.key is
  'Immutable base key from nanoid(), never derived from an address or title '
  '(HR4). Objects are {key}-1600.webp / -800 / -400.';

-- ---------------------------------------------------------------------------
-- A published URL is permanent (HR11). A slug change writes a row here rather
-- than leaving a 404 behind; middleware consults this table.
-- ---------------------------------------------------------------------------
create table redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text not null unique,
  to_path     text not null,
  status_code int not null default 301 check (status_code in (301, 302, 308)),
  created_at  timestamptz not null default now(),

  constraint redirects_no_self check (from_path <> to_path),
  constraint redirects_paths_absolute check (from_path like '/%' and to_path like '/%')
);

-- ---------------------------------------------------------------------------
-- Reserved for Stellar MLS. Empty today, created now so the MLS phase adds no
-- migration against a live database. DO NOT REMOVE — see docs/11-mls-future.md.
-- ---------------------------------------------------------------------------
create table sync_log (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  created     int not null default 0,
  updated     int not null default 0,
  removed     int not null default 0,
  error       text
);

create index sync_log_recent_idx on sync_log (source, started_at desc);
