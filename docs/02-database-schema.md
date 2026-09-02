# 02 — Database Schema

Postgres on Supabase free tier. **500 MB hard ceiling.** Every design choice
below is made with that ceiling in mind.

Migrations live in `supabase/migrations/` and are applied in filename order.
Never edit an applied migration — add a new one.

---

## Migration order

| # | File | Contents |
|---|---|---|
| 001 | `001_extensions.sql` | `pgcrypto`, `unaccent`, `citext` |
| 002 | `002_profiles.sql` | profiles table, `is_admin()`, auth trigger |
| 003 | `003_places.sql` | cities, communities |
| 004 | `004_listings.sql` | listings, constraints, indexes |
| 005 | `005_content.sql` | articles, reviews |
| 006 | `006_leads.sql` | leads, saved_searches |
| 007 | `007_media.sql` | media, redirects, sync_log |
| 008 | `008_functions.sql` | helpers and every trigger binding |
| 009 | `009_views.sql` | listing_facets, listing_card |
| 010 | `010_rls.sql` | every policy, in one place |
| 011 | `011_settings.sql` | site_settings (single row) + site_settings_public |
| 012 | `012_redirect_status.sql` | redirects.status_code default 308, honoured by the app |

**011 was added in Phase 2.** `docs/06-admin-dashboard-spec.md` § 10 required a
single-row `site_settings` table that this document had never defined. It is
numbered after `010_rls.sql` rather than folded into it because 001–010 were
already applied to the live project, and an applied migration is never edited.

**Ordering note.** Functions come *before* RLS, and `is_admin()` is defined with
`profiles` in 002 — every policy in 010 calls it, so it has to exist first. An
earlier draft of this table had views at 008 and functions last; that order does
not apply cleanly to an empty database.

PostGIS is **not** used. A `geography` column plus its GIST index costs storage
we cannot spare, and the site has no radius search. Plain `numeric` lat/lng is
enough for map pins. If radius search is ever required, add PostGIS then.

---

## Tables

### profiles

```sql
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        text not null default 'viewer'
              check (role in ('admin', 'editor', 'viewer')),
  full_name   text,
  avatar_key  text,
  created_at  timestamptz not null default now()
);
```

Trigger on `auth.users` insert creates the profile. The single admin is promoted
once by hand:

```sql
update profiles set role = 'admin' where id = '<uuid>';
```

### cities

```sql
create table cities (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  county       text not null,
  state        text not null default 'FL',

  in_search    boolean not null default false,  -- appears in the search city filter
  is_flagship  boolean not null default false,  -- Lake Mary only
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
  updated_at   timestamptz not null default now()
);

create index cities_published_idx on cities (published, sort_order);
```

`stats_json` shape — rendered by a single `<CityStats />` component, so keys are
fixed:

```json
{
  "medianPrice": 525000,
  "medianPricePerSqft": 248,
  "avgDaysOnMarket": 34,
  "population": 18000,
  "schoolDistrict": "Seminole County Public Schools",
  "commuteToOrlando": "25 min",
  "asOf": "2026-08-01"
}
```

`faq_json` shape — feeds both the accordion UI and `FAQPage` JSON-LD:

```json
[{ "q": "Is Lake Mary a good place to live?", "a": "..." }]
```

Seed rows:

| slug | name | county | in_search | is_flagship |
|---|---|---|---|---|
| lake-mary | Lake Mary | Seminole | true | true |
| longwood | Longwood | Seminole | true | false |
| sanford | Sanford | Seminole | true | false |
| casselberry | Casselberry | Seminole | true | false |
| orlando | Orlando | Orange | true | false |
| altamonte-springs | Altamonte Springs | Seminole | false | false |
| winter-springs | Winter Springs | Seminole | false | false |
| oviedo | Oviedo | Seminole | false | false |

### communities

```sql
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
  price_range jsonb,          -- { "min": 400000, "max": 1200000 }
  faq_json    jsonb not null default '[]'::jsonb,

  meta_title  text,
  meta_desc   text,

  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index communities_city_idx on communities (city_id, published, sort_order);
```

Seed: `heathrow` under Lake Mary. Additional Lake Mary neighborhoods
(Magnolia Plantation, Timacuan, Alaqua Lakes, Greenwood Lakes) are added by the
client through the admin dashboard.

### listings

```sql
create table listings (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,

  -- state
  status         text not null default 'active'
                 check (status in ('active','pending','sold','coming_soon','off_market')),
  listing_type   text not null default 'resale'
                 check (listing_type in ('resale','new_construction','assumable','va_eligible','land')),
  property_type  text not null default 'single_family'
                 check (property_type in
                   ('single_family','townhouse','condo','villa','multi_family','land','manufactured')),

  -- money
  price          numeric(12,2) not null check (price >= 0),
  hoa_fee        numeric(10,2),
  taxes_annual   numeric(10,2),

  -- physical
  beds           int check (beds between 0 and 20),
  baths          numeric(3,1) check (baths between 0 and 20),
  half_baths     int default 0,
  sqft           int check (sqft between 0 and 100000),
  lot_size       numeric(10,2),           -- acres
  year_built     int check (year_built between 1800 and 2100),
  garage_spaces  int default 0,
  stories        int,
  pool           boolean not null default false,
  waterfront     boolean not null default false,
  features       text[] not null default '{}',

  -- location
  address        text not null,
  unit           text,
  city_id        uuid not null references cities(id) on delete restrict,
  community_id   uuid references communities(id) on delete set null,
  zip            text,
  lat            numeric(9,6),
  lng            numeric(9,6),

  -- content
  headline           text,
  description        text,
  contractors_take   text,   -- her construction read on the property
  photos             jsonb not null default '[]'::jsonb,
  virtual_tour       text,
  floorplan_key      text,

  -- seo
  meta_title     text,
  meta_desc      text,

  -- lifecycle
  is_featured    boolean not null default false,
  published      boolean not null default false,
  published_at   timestamptz,
  sold_at        timestamptz,
  sold_price     numeric(12,2),
  purge_after    timestamptz,
  photos_purged  boolean not null default false,
  keep_photos    boolean not null default false,

  -- MLS-ready, unused today. DO NOT REMOVE.
  source         text not null default 'manual',
  source_id      text,
  mls_number     text,
  synced_at      timestamptz,
  is_locked      boolean not null default false,
  raw            jsonb,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint listings_source_unique unique (source, source_id),
  constraint listings_photo_limit check (jsonb_array_length(photos) <= 15),
  constraint listings_sold_fields check (
    status <> 'sold' or (sold_at is not null and sold_price is not null)
  ),
  constraint listings_published_needs_photo check (
    published = false or jsonb_array_length(photos) >= 1
  )
);
```

`contractors_take` is a first-class column, not a tag or a description
convention. It is section 7 of the listing page (`docs/05-page-specs.md`) and it
is the one thing no other agent's listing in this market can carry — the field
that turns her contractor licence into something a buyer can read.

`listings_published_needs_photo` is the database half of hard rule 6 — a
published listing can never render an empty gallery.

`photos` element shapes — the discriminated union that keeps a future MLS feed
schema-free:

```jsonc
// stored (ours)
{ "kind": "stored", "key": "listings/a7f3x/p01",
  "w": 1600, "h": 1067,
  "alt": "Front exterior, 123 Lakeview Dr",
  "blur": "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
  "order": 0 }

// external (future MLS hotlink)
{ "kind": "external", "url": "https://cdn.example/photo.jpg",
  "w": 1024, "h": 768, "alt": "...", "order": 0 }
```

#### Indexes

```sql
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

create index listings_sold_idx
  on listings (sold_at desc)
  where status = 'sold';

create index listings_purge_idx
  on listings (purge_after)
  where status = 'sold' and photos_purged = false and keep_photos = false;

create index listings_features_idx on listings using gin (features);

create index listings_fts_idx on listings using gin (
  to_tsvector('english',
    coalesce(address,'') || ' ' ||
    coalesce(headline,'') || ' ' ||
    coalesce(description,'') || ' ' ||
    coalesce(zip,''))
);
```

Partial indexes with `where published = true` are deliberate: they stay small,
which matters on a 500 MB budget.

#### `raw` column discipline

`raw jsonb` is for future MLS payloads only. It is the single biggest bloat
risk in this schema. When Stellar is connected, store only the fields not
already normalized, and add a monthly prune job. Today it stays `null`.

### articles

```sql
create table articles (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  title         text not null,
  excerpt       text,
  body_json     jsonb not null,        -- Tiptap document
  body_text     text,                  -- flattened, for FTS and reading time
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
  updated_at    timestamptz not null default now()
);

create index articles_public_idx
  on articles (status, kind, published_at desc)
  where status = 'published';
create index articles_city_idx on articles (city_id, published_at desc);
create index articles_fts_idx on articles using gin (
  to_tsvector('english', coalesce(title,'') || ' ' || coalesce(body_text,''))
);
```

`body_text` is maintained by a trigger that flattens `body_json`. Storing both
costs a little space and saves the entire search feature.

### reviews

```sql
create table reviews (
  id          uuid primary key default gen_random_uuid(),
  author_name text not null,
  author_role text,                    -- "Buyer, Lake Mary"
  rating      int check (rating between 1 and 5),
  body        text not null,
  source      text,                    -- "Google" | "Zillow" | "Direct"
  source_url  text,
  reviewed_at date,
  published   boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);
```

**Do not** emit `AggregateRating` JSON-LD from this table unless every review is
genuinely first-party and verifiable. See `09-compliance-legal.md`.

### leads

```sql
create table leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text,
  message      text,
  lead_type    text not null default 'general'
               check (lead_type in
                 ('general','listing_inquiry','showing_request','seller','va','assumable','new_construction')),
  source_page  text,
  listing_id   uuid references listings(id) on delete set null,
  utm          jsonb,
  status       text not null default 'new'
               check (status in ('new','contacted','qualified','closed','spam')),
  notes        text,
  created_at   timestamptz not null default now()
);

create index leads_inbox_idx on leads (status, created_at desc);
```

### saved_searches

```sql
create table saved_searches (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  label        text,
  query_json   jsonb not null,
  frequency    text not null default 'weekly'
               check (frequency in ('instant','daily','weekly')),
  confirmed    boolean not null default false,
  confirm_token text,
  unsubscribed boolean not null default false,
  last_sent_at timestamptz,
  created_at   timestamptz not null default now(),
  unique (email, query_json)
);
```

Double opt-in via `confirm_token` is required — CAN-SPAM plus deliverability.

### media

```sql
create table media (
  id           uuid primary key default gen_random_uuid(),
  key          text not null,               -- base key, no size suffix
  variants     int[] not null default '{1600,800,400}',
  bytes        int not null,                -- total across variants
  width        int,
  height       int,
  mime         text not null default 'image/webp',
  entity_type  text not null
               check (entity_type in ('listing','article','city','community','profile','site')),
  entity_id    uuid,
  created_at   timestamptz not null default now(),
  unique (key)
);

create index media_entity_idx on media (entity_type, entity_id);
```

This table is how the dashboard reports storage usage and how the orphan cron
finds unreferenced objects. Every upload writes a row in the same transaction.

### redirects

```sql
create table redirects (
  id          uuid primary key default gen_random_uuid(),
  from_path   text unique not null,
  to_path     text not null,
  status_code int not null default 301,
  created_at  timestamptz not null default now()
);
```

A slug change writes a row here automatically. Middleware consults it. This is
what makes hard rule 11 enforceable.

### sync_log (reserved)

```sql
create table sync_log (
  id          uuid primary key default gen_random_uuid(),
  source      text not null,
  started_at  timestamptz not null default now(),
  finished_at timestamptz,
  created     int default 0,
  updated     int default 0,
  removed     int default 0,
  error       text
);
```

Empty today. Created now so the MLS phase adds no migration to a live database.

---

### site_settings

Added in Phase 2. Exactly one row, pinned by `id = 1`.

```sql
create table site_settings (
  id                 int primary key default 1,
  phone              text,
  email              text,
  address_street     text,
  address_locality   text,
  address_region     text,
  address_postal     text,
  office_hours       text,
  profiles_json      jsonb not null default '{}'::jsonb,
  positioning        text,
  announcement       text,
  announcement_href  text,
  og_key             text,
  hero_key           text,
  brokerage_name     text,
  license_re         text,
  license_contractor text,
  disclosure_text    text,
  lead_notify_email  text,
  autoresponder_subject text,
  autoresponder_body text,
  last_orphan_sweep  timestamptz,
  last_purge_run     timestamptz,
  last_sitemap_ping  timestamptz,
  updated_at         timestamptz not null default now(),
  constraint site_settings_singleton check (id = 1)
);
```

Decisions recorded here so they are not relitigated:

- **Typed columns, not a jsonb blob.** The admin spec forbids JSON textareas
  (`06` § 11 rule 5) and typed columns are what let `lib/queries/settings.ts`
  return a domain type instead of an `any`.
- **`profiles_json` is the one exception**, because the set of profile links
  genuinely varies (YouTube today, TikTok tomorrow) and every value has the
  same shape: a URL.
- **NULL means "the client has not supplied this yet."** The UI falls back to
  the `PENDING` sentinel in `lib/site-config.ts` and hides the block rather
  than rendering a placeholder phone number.
- **A CHECK pins the singleton.** A settings table that can grow a second row
  is a settings table that will eventually serve the wrong one.

RLS: the table is **admin-only**. Public pages read `site_settings_public`
instead — see below.

---

## Views

### listing_facets

Powers every filter dropdown. Hard rule 22 depends on it.

```sql
create view listing_facets as
select
  l.city_id,
  c.slug   as city_slug,
  c.name   as city_name,
  l.property_type,
  l.listing_type,
  count(*)              as total,
  min(l.price)          as min_price,
  max(l.price)          as max_price,
  min(l.beds)           as min_beds,
  max(l.beds)           as max_beds,
  min(l.sqft)           as min_sqft,
  max(l.sqft)           as max_sqft,
  min(l.year_built)     as min_year,
  max(l.year_built)     as max_year
from listings l
join cities c on c.id = l.city_id
where l.published = true and l.status in ('active','coming_soon','pending')
group by l.city_id, c.slug, c.name, l.property_type, l.listing_type;
```

### listing_card

The exact column set the card component needs — nothing more. Prevents
`select *` creeping into list pages.

```sql
create view listing_card as
select id, slug, status, listing_type, property_type, price,
       beds, baths, sqft, address, city_id, community_id,
       photos -> 0 as cover, is_featured, published_at, sold_at
from listings
where published = true;
```

### site_settings_public

The publishable subset of `site_settings`. **Not** `security_invoker` — that is
the point: it exposes a narrow, reviewed column list past the admin-only policy
on the table.

Excluded on purpose: `lead_notify_email`, `autoresponder_subject`,
`autoresponder_body`, and the three `last_*` maintenance timestamps. None is
secret, but none belongs in a payload anyone can fetch with the anon key.
**Adding a column to this view publishes it — review before doing so.**

---

## Functions and triggers

```sql
-- updated_at on every table that has it
create or replace function touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- purge_after is derived, never hand-set
create or replace function set_purge_after() returns trigger
language plpgsql as $$
begin
  if new.status = 'sold' and new.sold_at is not null and new.keep_photos = false then
    new.purge_after := new.sold_at + interval '7 days';
  elsif new.status <> 'sold' then
    new.purge_after := null;
  end if;
  return new;
end $$;

-- published_at is set once, on first publish
create or replace function set_published_at() returns trigger
language plpgsql as $$
begin
  if new.published = true and old.published = false and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end $$;

-- slug change writes a redirect
create or replace function log_slug_redirect() returns trigger
language plpgsql as $$
begin
  if old.slug is distinct from new.slug and old.published = true then
    insert into redirects (from_path, to_path)
    values ('/listing/' || old.slug, '/listing/' || new.slug)
    on conflict (from_path) do update set to_path = excluded.to_path;
  end if;
  return new;
end $$;
```

Storage usage, read by the dashboard widget:

```sql
create or replace function storage_usage()
returns table (total_bytes bigint, listing_bytes bigint, article_bytes bigint, other_bytes bigint)
language sql stable as $$
  select
    coalesce(sum(bytes),0),
    coalesce(sum(bytes) filter (where entity_type = 'listing'),0),
    coalesce(sum(bytes) filter (where entity_type = 'article'),0),
    coalesce(sum(bytes) filter (where entity_type not in ('listing','article')),0)
  from media
$$;
```

---

## Row Level Security

RLS is enabled on **every** table. No exceptions.

```sql
alter table cities        enable row level security;
alter table communities   enable row level security;
alter table listings      enable row level security;
alter table articles      enable row level security;
alter table reviews       enable row level security;
alter table leads         enable row level security;
alter table saved_searches enable row level security;
alter table media         enable row level security;
alter table redirects     enable row level security;
alter table profiles      enable row level security;
alter table sync_log      enable row level security;
```

Admin predicate, defined once:

```sql
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  )
$$;
```

Policies:

```sql
-- public read of published content
create policy "public read listings"
  on listings for select to anon, authenticated
  using (published = true);

create policy "public read cities"
  on cities for select to anon, authenticated
  using (published = true);

create policy "public read communities"
  on communities for select to anon, authenticated
  using (published = true);

create policy "public read articles"
  on articles for select to anon, authenticated
  using (status = 'published');

create policy "public read reviews"
  on reviews for select to anon, authenticated
  using (published = true);

create policy "public read redirects"
  on redirects for select to anon, authenticated
  using (true);

-- public may create a lead, never read one
create policy "public insert leads"
  on leads for insert to anon, authenticated
  with check (true);

create policy "public insert saved searches"
  on saved_searches for insert to anon, authenticated
  with check (true);

-- admin full control, applied to each table
create policy "admin all listings" on listings
  for all to authenticated using (is_admin()) with check (is_admin());
-- ... repeated for cities, communities, articles, reviews, leads,
--     saved_searches, media, redirects, sync_log

-- profiles: read own, admin reads all
create policy "read own profile" on profiles
  for select to authenticated using (id = auth.uid() or is_admin());
```

Storage bucket `media`:

```sql
-- public read
create policy "media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

-- admin write
create policy "media admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and is_admin());
create policy "media admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media' and is_admin());
create policy "media admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and is_admin());
```

### RLS verification

Do not trust that policies work. `13-qa-checklists.md` includes an anon-key
test script that must fail to write to every table and must fail to read every
unpublished row. Run it at the end of Phase 1 and again before launch.

---

## Storage budget

| Item | Size |
|---|---|
| Listing row incl. `photos` jsonb | ~6 kB |
| Article row with Tiptap JSON | ~25 kB |
| City row | ~8 kB |
| 300 listings | ~1.8 MB |
| 200 articles | ~5 MB |
| Indexes | ~2x table size |
| **Realistic total at 300 listings + 200 articles** | **< 25 MB** |

Postgres is not the constraint; **image storage is** — see
`07-image-pipeline.md`. The one thing that could break this is the `raw` column,
which is why it stays null until MLS.

---

## Type generation

```bash
supabase gen types typescript --project-id <id> > types/database.ts
```

Run after every migration and commit the result. `types/domain.ts` is
hand-written and is what the app actually uses:

```ts
export type Listing = {
  id: string
  slug: string
  status: ListingStatus
  listingType: ListingType
  propertyType: PropertyType
  price: number
  beds: number | null
  baths: number | null
  sqft: number | null
  address: string
  city: { slug: string; name: string }
  community: { slug: string; name: string } | null
  photos: Photo[]
  // ...
}
```

The mapping between `database.ts` rows and `domain.ts` types lives in
`lib/queries/*` and nowhere else.
