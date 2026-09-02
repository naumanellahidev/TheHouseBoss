-- 005_content.sql
-- Articles (Tiptap) and reviews.

create table articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  body_json     jsonb not null default '{}'::jsonb,   -- Tiptap document
  body_text     text,                                 -- flattened by trigger, for FTS
  cover_key     text,
  cover_alt     text,

  kind          text not null default 'blog'
                check (kind in ('blog','market_update','guide')),
  city_id       uuid references cities(id) on delete set null,
  community_id  uuid references communities(id) on delete set null,
  tags          text[] not null default '{}',

  status        text not null default 'draft'
                check (status in ('draft','published','archived')),
  published_at  timestamptz,
  author_id     uuid references profiles(id) on delete set null,

  meta_title    text,
  meta_desc     text,
  og_key        text,

  reading_min   int,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint articles_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  constraint articles_published_needs_body check (
    status <> 'published' or (body_text is not null and length(body_text) > 100)
  )
);

create index articles_public_idx
  on articles (status, kind, published_at desc)
  where status = 'published';

create index articles_city_idx on articles (city_id, published_at desc);
create index articles_tags_idx on articles using gin (tags);

create index articles_fts_idx on articles using gin (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body_text, ''))
);

comment on column articles.body_text is
  'Flattened from body_json by the flatten_article_body trigger. Storing both '
  'costs a little space and is what makes article search and reading time '
  'possible at all.';

-- ---------------------------------------------------------------------------

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text,                    -- e.g. "Buyer, Lake Mary"
  rating      int check (rating between 1 and 5),
  body        text not null,
  source      text check (source in ('Google','Zillow','Realtor.com','Direct')),
  source_url  text,
  reviewed_at date,
  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create index reviews_public_idx on reviews (published, sort_order);

comment on table reviews is
  'Only genuinely received reviews. Do NOT emit AggregateRating JSON-LD from '
  'this table unless every row is first-party, verifiable and displayed — see '
  'docs/09-compliance-legal.md § 7.';
