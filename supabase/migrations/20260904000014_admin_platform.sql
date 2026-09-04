-- 014_admin_platform.sql
--
-- The administration platform: granular roles and permissions, audit logging,
-- notifications, per-page SEO, structured MLS sync history, lead notes and
-- media folders.
--
-- WHAT THIS DOES NOT DO, DELIBERATELY
--
-- It does not replace `profiles`, `listings.photos`, `redirects` or `sync_log`.
-- Those are in production, carry data, and are covered by working code and a
-- 357-test suite. This migration EXTENDS the model rather than re-laying it:
--   * profiles gains the columns the admin platform needs; the table stays.
--   * `redirects` remains the runtime redirect table. `seo_pages` is per-page
--     metadata, which is a different concern.
--   * `sync_log` remains the generic cron ledger the nightly jobs already
--     write to. `mls_sync_runs` is MLS-specific and structured, per docs/11.
--
-- ROLLBACK
--   drop table notifications, audit_logs, mls_sync_errors, mls_sync_runs,
--     mls_sources, seo_pages, lead_notes, media_folders,
--     role_permissions cascade;
--   drop function has_permission, current_role_name, log_audit;
--   alter table profiles drop column username, drop column display_name,
--     drop column status, drop column last_login_at, drop column updated_at;
--   alter table profiles drop constraint profiles_role_check,
--     add constraint profiles_role_check check (role in ('admin','editor','viewer'));

-- ===========================================================================
-- 1. ROLES AND PERMISSIONS
-- ===========================================================================

-- The role set widens. 'viewer' is kept so existing rows stay valid — dropping
-- it would fail the check against any row that currently holds it.
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check
  check (role in ('super_admin', 'admin', 'editor', 'content_manager', 'viewer'));

alter table profiles
  add column if not exists username      text unique,
  add column if not exists display_name  text,
  add column if not exists status        text not null default 'active'
                                         check (status in ('active', 'suspended')),
  add column if not exists last_login_at timestamptz,
  add column if not exists updated_at    timestamptz not null default now();

comment on column profiles.username is
  'Login handle. The admin signs in with this; the server resolves it to the '
  'auth email and hands off to Supabase Auth. Passwords are never stored here.';

-- Case-insensitive uniqueness. Without this, "Krisi" and "krisi" are two
-- different accounts and the login lookup becomes ambiguous.
create unique index if not exists profiles_username_lower_idx
  on profiles (lower(username)) where username is not null;

/*
  Permissions are a static grant table keyed by role, not a per-user list.

  A per-user permission table is the flexible answer and the wrong one here:
  this is a site with one administrator and, at most, an assistant. A grant
  matrix keyed by role is auditable at a glance, cannot drift per user, and
  makes `has_permission()` a single index lookup inside every RLS policy.
*/
create table role_permissions (
  role       text not null
             check (role in ('super_admin', 'admin', 'editor', 'content_manager', 'viewer')),
  permission text not null,
  primary key (role, permission)
);

comment on table role_permissions is
  'Which permission each role holds. Read by has_permission() from inside RLS '
  'policies, so it must stay small and indexed on its primary key.';

insert into role_permissions (role, permission) values
  -- super_admin: everything, including the things that manage other people.
  ('super_admin', 'manage_properties'),
  ('super_admin', 'manage_articles'),
  ('super_admin', 'manage_communities'),
  ('super_admin', 'manage_reviews'),
  ('super_admin', 'manage_media'),
  ('super_admin', 'manage_leads'),
  ('super_admin', 'manage_users'),
  ('super_admin', 'manage_seo'),
  ('super_admin', 'manage_settings'),
  ('super_admin', 'manage_integrations'),
  ('super_admin', 'view_analytics'),
  ('super_admin', 'view_audit_logs'),

  -- admin: the whole product, but not user management or integration secrets.
  ('admin', 'manage_properties'),
  ('admin', 'manage_articles'),
  ('admin', 'manage_communities'),
  ('admin', 'manage_reviews'),
  ('admin', 'manage_media'),
  ('admin', 'manage_leads'),
  ('admin', 'manage_seo'),
  ('admin', 'manage_settings'),
  ('admin', 'view_analytics'),
  ('admin', 'view_audit_logs'),

  -- editor: content and the media it needs. No leads (personal data), no
  -- settings, no SEO redirects.
  ('editor', 'manage_articles'),
  ('editor', 'manage_communities'),
  ('editor', 'manage_reviews'),
  ('editor', 'manage_media'),

  -- content_manager: editor plus properties and SEO, minus leads.
  ('content_manager', 'manage_properties'),
  ('content_manager', 'manage_articles'),
  ('content_manager', 'manage_communities'),
  ('content_manager', 'manage_reviews'),
  ('content_manager', 'manage_media'),
  ('content_manager', 'manage_seo'),
  ('content_manager', 'view_analytics')
on conflict do nothing;

/*
  The permission predicate.

  SECURITY DEFINER for the same reason is_admin() is: an RLS policy on
  `profiles` cannot read `profiles` without recursing. search_path is pinned,
  which is mandatory for any SECURITY DEFINER function — without it a caller
  can shadow `public` and have this resolve against their own tables.

  A suspended account holds no permissions, whatever its role. That check lives
  here rather than in application code so it cannot be forgotten at a call site.
*/
create or replace function public.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role = p.role
    where p.id = auth.uid()
      and p.status = 'active'
      and rp.permission = perm
  )
$$;

revoke execute on function public.has_permission(text) from public;
grant execute on function public.has_permission(text) to authenticated;

-- is_admin() widens to the roles that actually administer the site, and now
-- also refuses a suspended account. Redefined rather than replaced so every
-- existing policy in 010 picks the new behaviour up untouched.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and status = 'active'
      and role in ('super_admin', 'admin')
  )
$$;

-- ===========================================================================
-- 2. AUDIT LOGS
-- ===========================================================================

create table audit_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete set null,
  action      text not null,
  entity_type text,
  entity_id   text,
  metadata    jsonb not null default '{}'::jsonb,
  ip_address  inet,
  user_agent  text,
  created_at  timestamptz not null default now()
);

comment on table audit_logs is
  'Append-only record of administrative actions. There is deliberately no '
  'update or delete policy: an audit trail an administrator can edit is not '
  'an audit trail. user_id is ON DELETE SET NULL so removing an account does '
  'not erase what that account did.';

create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_user_idx    on audit_logs (user_id, created_at desc);
create index audit_logs_entity_idx  on audit_logs (entity_type, entity_id);
create index audit_logs_action_idx  on audit_logs (action);

/*
  Writing an audit row must never be able to fail the operation it describes.
  A failed log is a monitoring problem; a failed publish because logging broke
  is a product problem. This swallows its own errors on purpose.
*/
create or replace function public.log_audit(
  p_action      text,
  p_entity_type text default null,
  p_entity_id   text default null,
  p_metadata    jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (user_id, action, entity_type, entity_id, metadata)
  values (auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
exception when others then
  raise warning 'log_audit failed for %: %', p_action, sqlerrm;
end;
$$;

revoke execute on function public.log_audit(text, text, text, jsonb) from public;
grant execute on function public.log_audit(text, text, text, jsonb) to authenticated;

-- ===========================================================================
-- 3. NOTIFICATIONS
-- ===========================================================================

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  kind       text not null
             check (kind in ('lead', 'mls_sync', 'content', 'system', 'warning')),
  title      text not null,
  body       text,
  href       text,
  severity   text not null default 'info'
             check (severity in ('info', 'success', 'warning', 'error')),
  read_at    timestamptz,
  created_at timestamptz not null default now()
);

comment on table notifications is
  'Admin notification feed. Site-wide rather than per-user: there is one '
  'administrator, and a per-user fan-out would be machinery with no readers.';

create index notifications_unread_idx on notifications (created_at desc)
  where read_at is null;

-- ===========================================================================
-- 4. PER-PAGE SEO
-- ===========================================================================

create table seo_pages (
  id               uuid primary key default gen_random_uuid(),
  path             text not null unique,
  title            text,
  description      text,
  canonical_url    text,
  og_title         text,
  og_description   text,
  og_key           text,
  noindex          boolean not null default false,
  nofollow         boolean not null default false,
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now(),

  -- The same limits scripts/check-seo.mjs asserts against the rendered pages.
  -- Enforcing them here means the guard cannot be failed by a value the admin
  -- typed; it is caught at the point of entry instead.
  constraint seo_pages_title_len check (title is null or char_length(title) <= 60),
  constraint seo_pages_desc_len  check (
    description is null or char_length(description) between 140 and 158
  ),
  constraint seo_pages_path_shape check (path ~ '^/')
);

comment on table seo_pages is
  'Per-route metadata overrides. A row is an override, not a requirement: a '
  'path with no row falls back to the builders in lib/seo/metadata.ts.';

-- ===========================================================================
-- 5. MLS SOURCES AND SYNC HISTORY
-- ===========================================================================

create table mls_sources (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique
                check (slug in ('manual', 'stellar_mls', 'other_mls', 'builder')),
  label         text not null,
  is_connected  boolean not null default false,
  last_tested_at timestamptz,
  config        jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table mls_sources is
  'One row per listing source. `config` NEVER holds a credential — secrets '
  'live in environment variables. It holds non-secret settings such as an '
  'agent MLS id or a sync cadence. is_connected is set only by a successful '
  'connection test, never by hand, so the dashboard cannot claim a live '
  'integration that does not exist.';

insert into mls_sources (slug, label, is_connected) values
  ('manual',      'Manual listings', true),
  ('stellar_mls', 'Stellar MLS',     false)
on conflict (slug) do nothing;

create table mls_sync_runs (
  id                uuid primary key default gen_random_uuid(),
  source_slug       text not null references mls_sources(slug) on delete cascade,
  trigger           text not null default 'manual'
                    check (trigger in ('manual', 'scheduled')),
  status            text not null default 'running'
                    check (status in ('running', 'succeeded', 'failed', 'cancelled')),
  started_at        timestamptz not null default now(),
  completed_at      timestamptz,
  records_processed int not null default 0,
  records_created   int not null default 0,
  records_updated   int not null default 0,
  records_removed   int not null default 0,
  records_failed    int not null default 0,
  duration_ms       int,
  message           text
);

create index mls_sync_runs_source_idx on mls_sync_runs (source_slug, started_at desc);
create index mls_sync_runs_status_idx on mls_sync_runs (status, started_at desc);

create table mls_sync_errors (
  id         uuid primary key default gen_random_uuid(),
  run_id     uuid not null references mls_sync_runs(id) on delete cascade,
  listing_ref text,
  message    text not null,
  detail     jsonb,
  created_at timestamptz not null default now()
);

create index mls_sync_errors_run_idx on mls_sync_errors (run_id, created_at);

-- ===========================================================================
-- 6. LEAD NOTES
-- ===========================================================================

create table lead_notes (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  author_id  uuid references auth.users(id) on delete set null,
  body       text not null check (char_length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index lead_notes_lead_idx on lead_notes (lead_id, created_at desc);

comment on table lead_notes is
  'Threaded notes on a lead. Separate from leads.notes, which is the single '
  'free-text field the existing inbox writes to; this is the audit-friendly '
  'append-only history.';

-- ===========================================================================
-- 7. MEDIA FOLDERS
-- ===========================================================================

create table media_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique check (slug ~ '^[a-z0-9-]+$'),
  created_at timestamptz not null default now()
);

alter table media add column if not exists folder_id uuid
  references media_folders(id) on delete set null;

create index if not exists media_folder_idx on media (folder_id);

insert into media_folders (name, slug) values
  ('Properties',  'properties'),
  ('Articles',    'articles'),
  ('Communities', 'communities'),
  ('General',     'general')
on conflict (slug) do nothing;

-- ===========================================================================
-- 8. ROW LEVEL SECURITY
--
-- Every table above, without exception. A table without RLS on a public
-- Supabase project is world-readable and world-writable.
-- ===========================================================================

alter table role_permissions enable row level security;
alter table audit_logs       enable row level security;
alter table notifications    enable row level security;
alter table seo_pages        enable row level security;
alter table mls_sources      enable row level security;
alter table mls_sync_runs    enable row level security;
alter table mls_sync_errors  enable row level security;
alter table lead_notes       enable row level security;
alter table media_folders    enable row level security;

-- role_permissions: readable by any signed-in admin so the UI can show what a
-- role grants. Never writable from the client — the matrix changes by migration.
create policy "admin read role_permissions" on role_permissions
  for select to authenticated using (is_admin());

-- audit_logs: INSERT and SELECT only. No update policy and no delete policy,
-- which is what makes the table append-only for every client.
create policy "admin read audit_logs" on audit_logs
  for select to authenticated using (has_permission('view_audit_logs'));
create policy "admin insert audit_logs" on audit_logs
  for insert to authenticated with check (auth.uid() is not null);

create policy "admin all notifications" on notifications
  for all to authenticated using (is_admin()) with check (is_admin());

-- seo_pages: the public site reads overrides for pages it renders; only a
-- permission holder writes them.
create policy "public read seo_pages" on seo_pages
  for select to anon, authenticated using (true);
create policy "seo manage seo_pages" on seo_pages
  for all to authenticated
  using (has_permission('manage_seo')) with check (has_permission('manage_seo'));

create policy "admin read mls_sources" on mls_sources
  for select to authenticated using (is_admin());
create policy "integrations manage mls_sources" on mls_sources
  for all to authenticated
  using (has_permission('manage_integrations'))
  with check (has_permission('manage_integrations'));

create policy "admin read mls_sync_runs" on mls_sync_runs
  for select to authenticated using (is_admin());
create policy "admin write mls_sync_runs" on mls_sync_runs
  for all to authenticated using (is_admin()) with check (is_admin());

create policy "admin read mls_sync_errors" on mls_sync_errors
  for select to authenticated using (is_admin());
create policy "admin write mls_sync_errors" on mls_sync_errors
  for all to authenticated using (is_admin()) with check (is_admin());

-- lead_notes carry personal data. Gated on manage_leads specifically, so an
-- editor who can publish an article still cannot read a lead's history.
create policy "leads manage lead_notes" on lead_notes
  for all to authenticated
  using (has_permission('manage_leads')) with check (has_permission('manage_leads'));

create policy "admin read media_folders" on media_folders
  for select to authenticated using (is_admin());
create policy "media manage media_folders" on media_folders
  for all to authenticated
  using (has_permission('manage_media')) with check (has_permission('manage_media'));

-- ===========================================================================
-- 9. TOUCH TRIGGERS
-- ===========================================================================

create trigger touch_profiles_updated_at
  before update on profiles
  for each row execute function public.touch_updated_at();

create trigger touch_seo_pages_updated_at
  before update on seo_pages
  for each row execute function public.touch_updated_at();

create trigger touch_mls_sources_updated_at
  before update on mls_sources
  for each row execute function public.touch_updated_at();
