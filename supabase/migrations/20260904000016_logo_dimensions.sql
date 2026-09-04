-- 016_logo_dimensions.sql
--
-- Expose the logo's real pixel dimensions to the public site.
--
-- WHY
--
-- `Logo` rendered the uploaded artwork inside a hardcoded 3:2 box, because the
-- component had a key and no dimensions. Every logo that is not 3:2 was
-- therefore letterboxed inside a frame of the wrong shape — and because the
-- frame came from `PropertyImage`, which paints `bg-surface-sunken` behind
-- photography, a transparent logo on the dark footer showed that pale plate as
-- a rectangle around the mark.
--
-- The dimensions already exist: `storeImage()` writes `width` and `height` to
-- `media` for every object it stores (HR9). They were simply not reachable from
-- the public read. This adds them to the view rather than duplicating them into
-- `site_settings`, so there is still exactly one place a stored image's size is
-- recorded and no upload path has to remember to copy it.
--
-- The subselects are `limit 1` against a unique key and run once per settings
-- read, which is once per render of a cached layout.
--
-- ROLLBACK
--   create or replace view site_settings_public as select ... (015's column list);

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
  /*
    Added in 016, APPENDED — `create or replace view` cannot insert a column in
    the middle of an existing list. See the note in 015.
  */
  (select m.width  from media m where m.key = s.logo_key        limit 1) as logo_w,
  (select m.height from media m where m.key = s.logo_key        limit 1) as logo_h,
  (select m.width  from media m where m.key = s.logo_invert_key limit 1) as logo_invert_w,
  (select m.height from media m where m.key = s.logo_invert_key limit 1) as logo_invert_h
from site_settings s
where s.id = 1;

grant select on site_settings_public to anon, authenticated;

comment on view site_settings_public is
  'The columns the public site may read. Deliberately NOT security_invoker: the '
  'point of this view is to expose a narrow column list past the admin-only '
  'policy on site_settings. Adding a column to the table does NOT add it here. '
  'The logo_* dimensions are read from `media`, which is where storeImage() '
  'already records them.';
