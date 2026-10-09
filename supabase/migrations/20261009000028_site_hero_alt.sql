-- ─────────────────────────────────────────────────────────────────────────────
-- A description for the home page hero photograph (client audit, 2026-10-09)
--
-- ── What changed, and why ───────────────────────────────────────────────────
--
-- The hero photo was rendered as decorative: empty alt, aria-hidden, and no
-- field in Admin → Settings to describe it. The reasoning was sound for a pure
-- backdrop — the headline over it is the content, and a description read before
-- the headline is noise to a screen-reader user.
--
-- Two things outweigh that here. The photo is not texture, it is a specific
-- house, the largest image on the site, and the first thing image search would
-- index from the home page. And an SEO audit the client ran reports the empty
-- alt as a missing one. Cities and communities already store a hero alt; the
-- site hero was the one image with no way to describe it.
--
-- So it gets the same treatment: a column, a field in Settings, and a real
-- description. One short sentence before the headline is a fair price for a
-- photograph that carries meaning.
--
-- ── The view ────────────────────────────────────────────────────────────────
--
-- `site_settings_public` is what the public pages read. A column added to the
-- table is NOT visible through the view until the view lists it — that fails
-- silently, the field just comes back missing (the trap 023 and 024 both
-- describe). `create or replace view` may only add columns at the END, so
-- `hero_alt` is appended after `portrait_h` rather than placed beside
-- `hero_key`.
--
-- ── Rollback ────────────────────────────────────────────────────────────────
--
--   Re-run the view from 023 (without hero_alt), then:
--   alter table site_settings drop column if exists hero_alt;
-- ─────────────────────────────────────────────────────────────────────────────

alter table site_settings add column if not exists hero_alt text;

-- The photograph currently set, described from the image itself. Only written
-- when empty, so re-running this never overwrites an admin's own wording.
update site_settings
set hero_alt = 'A single-storey Florida home at sunset, with palm trees, a lit glass entry and a paver driveway'
where id = 1 and (hero_alt is null or hero_alt = '');

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
  brand_name,
  legal_name,
  logo_key,
  logo_invert_key,
  license_re_label,
  license_re_authority,
  license_contractor_label,
  license_contractor_authority,
  years_experience,
  (select m.width  from media m where m.key = s.logo_key        limit 1) as logo_w,
  (select m.height from media m where m.key = s.logo_key        limit 1) as logo_h,
  (select m.width  from media m where m.key = s.logo_invert_key limit 1) as logo_invert_w,
  (select m.height from media m where m.key = s.logo_invert_key limit 1) as logo_invert_h,
  whatsapp,
  -- Added in 023.
  portrait_key,
  (select m.width  from media m where m.key = s.portrait_key limit 1) as portrait_w,
  (select m.height from media m where m.key = s.portrait_key limit 1) as portrait_h,
  -- Added in 028. Last, because `create or replace view` cannot reorder.
  hero_alt
from site_settings s
where s.id = 1;

grant select on site_settings_public to anon, authenticated;
