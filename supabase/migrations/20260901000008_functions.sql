-- 008_functions.sql
-- Helper functions and every trigger binding.
--
-- These are the invariants the application must never re-implement in TypeScript.
-- If a rule can live here, it lives here.

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger cities_touch      before update on cities      for each row execute function public.touch_updated_at();
create trigger communities_touch before update on communities for each row execute function public.touch_updated_at();
create trigger listings_touch    before update on listings    for each row execute function public.touch_updated_at();
create trigger articles_touch    before update on articles    for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- purge_after is DERIVED, never hand-set. HR10: 7 days after a listing sells,
-- the 1600w and 800w derivatives go and the 400w stays.
-- ---------------------------------------------------------------------------
create or replace function public.set_purge_after()
returns trigger language plpgsql as $$
begin
  if new.status = 'sold' and new.sold_at is not null and new.keep_photos = false then
    new.purge_after := new.sold_at + interval '7 days';
  elsif new.status <> 'sold' or new.keep_photos = true then
    new.purge_after := null;
  end if;
  return new;
end;
$$;

create trigger listings_purge_after
  before insert or update of status, sold_at, keep_photos on listings
  for each row execute function public.set_purge_after();

-- ---------------------------------------------------------------------------
-- published_at is stamped once, on first publish, and never moves afterwards.
-- ---------------------------------------------------------------------------
create or replace function public.set_published_at()
returns trigger language plpgsql as $$
begin
  if new.published = true and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger listings_published_at
  before insert or update of published on listings
  for each row execute function public.set_published_at();

create or replace function public.set_article_published_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'published' and new.published_at is null then
    new.published_at := now();
  end if;
  return new;
end;
$$;

create trigger articles_published_at
  before insert or update of status on articles
  for each row execute function public.set_article_published_at();

-- ---------------------------------------------------------------------------
-- HR11: a published URL is permanent. Changing a live slug writes the redirect
-- automatically, so a 404 can never be introduced by an edit.
-- ---------------------------------------------------------------------------
create or replace function public.log_listing_slug_redirect()
returns trigger language plpgsql as $$
begin
  if old.slug is distinct from new.slug and old.published = true then
    insert into redirects (from_path, to_path)
    values ('/listing/' || old.slug, '/listing/' || new.slug)
    on conflict (from_path) do update set to_path = excluded.to_path;

    -- keep any older chain pointing at the newest location
    update redirects
       set to_path = '/listing/' || new.slug
     where to_path = '/listing/' || old.slug;
  end if;
  return new;
end;
$$;

create trigger listings_slug_redirect
  after update of slug on listings
  for each row execute function public.log_listing_slug_redirect();

-- ---------------------------------------------------------------------------
-- Flatten the Tiptap document into body_text for full-text search and reading
-- time. Walks the node tree and collects every `text` leaf.
-- ---------------------------------------------------------------------------
create or replace function public.tiptap_to_text(doc jsonb)
returns text language sql immutable as $$
  with recursive nodes(node) as (
    select doc
    union all
    select child
      from nodes, lateral jsonb_array_elements(
        case when jsonb_typeof(node -> 'content') = 'array'
             then node -> 'content'
             else '[]'::jsonb end
      ) as child
  )
  select coalesce(string_agg(node ->> 'text', ' '), '')
    from nodes
   where node ? 'text';
$$;

create or replace function public.flatten_article_body()
returns trigger language plpgsql as $$
declare
  words int;
begin
  new.body_text := public.tiptap_to_text(new.body_json);
  words := coalesce(array_length(regexp_split_to_array(trim(new.body_text), '\s+'), 1), 0);
  -- 225 wpm, rounded up, minimum 1
  new.reading_min := greatest(1, ceil(words / 225.0)::int);
  return new;
end;
$$;

create trigger articles_flatten_body
  before insert or update of body_json on articles
  for each row execute function public.flatten_article_body();

-- ---------------------------------------------------------------------------
-- Storage accounting, read by the admin dashboard widget. The 1 GB Supabase
-- Storage ceiling is the binding constraint of this project.
-- ---------------------------------------------------------------------------
create or replace function public.storage_usage()
returns table (
  total_bytes   bigint,
  listing_bytes bigint,
  article_bytes bigint,
  other_bytes   bigint,
  object_count  bigint
)
language sql stable as $$
  select
    coalesce(sum(bytes), 0)::bigint,
    coalesce(sum(bytes) filter (where entity_type = 'listing'), 0)::bigint,
    coalesce(sum(bytes) filter (where entity_type = 'article'), 0)::bigint,
    coalesce(sum(bytes) filter (where entity_type not in ('listing','article')), 0)::bigint,
    count(*)::bigint
  from media;
$$;

grant execute on function public.storage_usage() to authenticated;
