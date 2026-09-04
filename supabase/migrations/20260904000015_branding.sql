-- 015_branding.sql
--
-- Runtime-editable branding: brand name, legal name, logo artwork, licence
-- labels and authorities, years of experience.
--
-- WHY THESE AND NOT EVERYTHING
--
-- `lib/site-config.ts` stays. It is the build-time source for the contexts that
-- cannot read a database per request — `generateMetadata`, `opengraph-image`,
-- `robots.ts`, `sitemap.ts` and `llms.txt` all run at build or on a cached
-- revalidate. Every column here is a runtime OVERRIDE with the config value as
-- the fallback, which is why they are all nullable with no defaults: NULL means
-- "use the code", not "empty".
--
-- ROLLBACK
--   create or replace view site_settings_public as select ... (previous list);
--   alter table site_settings
--     drop column brand_name, drop column legal_name,
--     drop column logo_key, drop column logo_invert_key,
--     drop column license_re_label, drop column license_re_authority,
--     drop column license_contractor_label, drop column license_contractor_authority,
--     drop column years_experience;

alter table site_settings
  add column if not exists brand_name                   text,
  add column if not exists legal_name                   text,
  add column if not exists logo_key                     text,
  add column if not exists logo_invert_key              text,
  add column if not exists license_re_label             text,
  add column if not exists license_re_authority         text,
  add column if not exists license_contractor_label     text,
  add column if not exists license_contractor_authority text,
  add column if not exists years_experience             int
    check (years_experience is null or years_experience between 0 and 100);

comment on column site_settings.brand_name is
  'Trading name shown in chrome. NULL falls back to siteConfig.name.';
comment on column site_settings.legal_name is
  'The licensee''s legal name as it must appear in advertising. NULL falls back '
  'to siteConfig.legalName. FREC 61J2-10.026 governs how it renders relative to '
  'the brokerage name; that relationship is fixed in ComplianceFooter and is '
  'not editable.';
comment on column site_settings.logo_key is
  'Storage key for the brand artwork, uploaded through Admin -> Settings -> '
  'Branding. A key, never a URL (HR1). NULL renders the type-set lockup.';

-- ---------------------------------------------------------------------------
-- The public view MUST be recreated.
--
-- `site_settings_public` is a definer view with an explicit column list, which
-- is the whole reason it exists: it exposes a narrow set past the admin-only
-- RLS policy on the table. A column added above is therefore admin-only until
-- it is named here — it would save correctly, and silently never reach the
-- public site. That failure mode is invisible in the admin, so this half of the
-- migration matters more than the ALTER above.
--
-- Still excluded, deliberately: lead_notify_email, autoresponder_subject,
-- autoresponder_body and the three last_* maintenance stamps. None is secret,
-- but none belongs in a payload anyone can fetch with the anon key.
-- ---------------------------------------------------------------------------
create or replace view site_settings_public as
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
  updated_at,
  /*
    Added in 015, and APPENDED rather than inserted in a logical place.

    `create or replace view` cannot reorder or insert columns — Postgres refuses
    with "cannot change name of view column". New columns must go at the end,
    after every column the previous definition had, in the same order. Grouping
    them tidily beside their relatives is exactly what fails.
  */
  brand_name,
  legal_name,
  logo_key,
  logo_invert_key,
  license_re_label,
  license_re_authority,
  license_contractor_label,
  license_contractor_authority,
  years_experience
from site_settings
where id = 1;

grant select on site_settings_public to anon, authenticated;

comment on view site_settings_public is
  'The columns the public site may read. Deliberately NOT security_invoker: the '
  'point of this view is to expose a narrow column list past the admin-only '
  'policy on site_settings. Adding a column to the table does NOT add it here.';
