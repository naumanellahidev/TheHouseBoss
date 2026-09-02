-- 010_rls.sql
-- Row Level Security. Every policy in one place.
--
-- HR21: RLS is enabled on EVERY table. A table without RLS on a public Supabase
-- project is world-writable through the anon key, which ships in the browser
-- bundle.
--
-- The shape is always the same:
--   public  → SELECT only, and only published rows
--   admin   → everything, gated on is_admin()
--
-- Two deliberate exceptions:
--   leads, saved_searches — anon may INSERT and must NOT be able to SELECT
--   redirects             — anon may SELECT every row (middleware needs them)
--
-- None of this is trusted until scripts/test-rls.ts passes with the anon key.

alter table profiles       enable row level security;
alter table cities         enable row level security;
alter table communities    enable row level security;
alter table listings       enable row level security;
alter table articles       enable row level security;
alter table reviews        enable row level security;
alter table leads          enable row level security;
alter table saved_searches enable row level security;
alter table media          enable row level security;
alter table redirects      enable row level security;
alter table sync_log       enable row level security;

-- ── profiles ───────────────────────────────────────────────────────────────
create policy "read own profile or any as admin" on profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "admin writes profiles" on profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ── published content: public read ─────────────────────────────────────────
create policy "public read cities" on cities
  for select to anon, authenticated using (published = true);

create policy "public read communities" on communities
  for select to anon, authenticated using (published = true);

create policy "public read listings" on listings
  for select to anon, authenticated using (published = true);

create policy "public read articles" on articles
  for select to anon, authenticated using (status = 'published');

create policy "public read reviews" on reviews
  for select to anon, authenticated using (published = true);

-- Middleware resolves 301s for anonymous visitors; nothing sensitive lives here.
create policy "public read redirects" on redirects
  for select to anon, authenticated using (true);

-- ── admin: full control ────────────────────────────────────────────────────
create policy "admin all cities" on cities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all communities" on communities
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all listings" on listings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all articles" on articles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all reviews" on reviews
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all leads" on leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all saved searches" on saved_searches
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all media" on media
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all redirects" on redirects
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin all sync log" on sync_log
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ── write-only intake ──────────────────────────────────────────────────────
-- A visitor may create a lead. A visitor may never read one — not their own,
-- not anyone's. The SELECT half of this is the important half.
create policy "public insert leads" on leads
  for insert to anon, authenticated with check (true);

create policy "public insert saved searches" on saved_searches
  for insert to anon, authenticated with check (true);

-- ---------------------------------------------------------------------------
-- Storage: the `media` bucket.
--
-- The bucket itself is created once from the dashboard or the CLI:
--   insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
--   values ('media', 'media', true, 10485760, array['image/webp'])
--   on conflict (id) do nothing;
--
-- Public read, admin write. Objects are immutable (keys never change), so they
-- are served with a one-year immutable cache — that is what protects the 5 GB
-- monthly egress allowance.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/webp'])
on conflict (id) do nothing;

create policy "media public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'media');

create policy "media admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());

create policy "media admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and public.is_admin())
  with check (bucket_id = 'media' and public.is_admin());

create policy "media admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
