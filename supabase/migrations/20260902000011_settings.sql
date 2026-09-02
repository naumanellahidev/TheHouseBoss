-- 011_settings.sql
-- Editable site settings — a single row, edited from Admin → Settings.
--
-- Added in Phase 2. docs/06-admin-dashboard-spec.md § 10 required this table;
-- docs/02-database-schema.md did not define it, so it is defined here and the
-- schema doc was updated in the same change.
--
-- Design decisions:
--   * ONE row, pinned by `id = 1` with a CHECK. A settings table that can grow
--     a second row is a settings table that will silently serve the wrong one.
--   * Columns, not a free jsonb blob, for everything a component reads. The
--     admin spec forbids JSON textareas (§ 11 rule 5) and typed columns are
--     what let `lib/queries/settings.ts` return a domain type.
--   * `profiles` is the only other place a jsonb map is used for links; here
--     `profiles_json` holds the sameAs URLs because the set genuinely varies
--     (YouTube today, TikTok tomorrow) and every value has the same shape.
--   * NULL means "not supplied yet" and the UI falls back to lib/site-config.ts
--     (the PENDING sentinel). It never renders a placeholder phone number.
--
-- Rollback: drop table site_settings;

create table site_settings (
  id                 int primary key default 1,

  -- ── contact ─────────────────────────────────────────────────────────────
  phone              text,
  email              text,
  address_street     text,
  address_locality   text,
  address_region     text,
  address_postal     text,
  office_hours       text,

  -- ── profiles → the sameAs array in JSON-LD (docs/08 § 6) ────────────────
  profiles_json      jsonb not null default '{}'::jsonb,

  -- ── site ────────────────────────────────────────────────────────────────
  positioning        text,
  announcement       text,
  announcement_href  text,
  og_key             text,
  hero_key           text,

  -- ── compliance (legally required; editable, with a warning in the UI) ───
  brokerage_name     text,
  license_re         text,
  license_contractor text,
  disclosure_text    text,

  -- ── notifications ───────────────────────────────────────────────────────
  lead_notify_email  text,
  autoresponder_subject text,
  autoresponder_body text,

  -- ── maintenance: when each manual/cron job last ran (docs/06 § 10) ──────
  last_orphan_sweep  timestamptz,
  last_purge_run     timestamptz,
  last_sitemap_ping  timestamptz,

  updated_at         timestamptz not null default now(),

  constraint site_settings_singleton check (id = 1),
  constraint site_settings_profiles_is_object
    check (jsonb_typeof(profiles_json) = 'object'),
  constraint site_settings_email_shape
    check (email is null or email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  constraint site_settings_notify_shape
    check (lead_notify_email is null or
           lead_notify_email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$')
);

comment on table site_settings is
  'Exactly one row, id = 1. NULL means the client has not supplied the value '
  'yet and lib/site-config.ts PENDING fallback applies.';

create trigger site_settings_touch
  before update on site_settings
  for each row execute function public.touch_updated_at();

-- The row must exist before the admin form can update it.
insert into site_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- RLS. The table itself is admin-only. Public pages do not read it directly —
-- they read `site_settings_public`, a definer view exposing only the columns
-- that already appear on the page anyway (contact block, footer, JSON-LD).
--
-- Why a view rather than a public-read policy on the table: the row also holds
-- the lead-notification address and the autoresponder copy. Neither is secret,
-- but neither belongs in a payload anyone can fetch with the anon key, and a
-- column added later would otherwise become public by default. The view makes
-- publication an explicit, reviewable act.
-- ---------------------------------------------------------------------------
alter table site_settings enable row level security;

create policy "admin all site settings" on site_settings
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Deliberately NOT security_invoker: the point of this view is to expose a
-- narrow column list past the admin-only policy above.
create view site_settings_public as
select
  id,
  phone,
  email,
  address_street,
  address_locality,
  address_region,
  address_postal,
  office_hours,
  profiles_json,
  positioning,
  announcement,
  announcement_href,
  og_key,
  hero_key,
  brokerage_name,
  license_re,
  license_contractor,
  disclosure_text,
  updated_at
from site_settings
where id = 1;

grant select on site_settings_public to anon, authenticated;

comment on view site_settings_public is
  'The publishable subset of site_settings. Adding a column here publishes it '
  'to the anon key — review before doing so.';
