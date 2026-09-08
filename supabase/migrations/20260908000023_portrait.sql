-- 023_portrait.sql
--
-- The broker's own photograph, uploaded through Admin → Settings → Branding.
--
-- WHY A COLUMN AND NOT A COMMITTED FILE
--
-- `/about` carried `const hasPortrait = false` with a hardcoded
-- `site/krisi-portrait` key behind it, and the home page's "Meet The House
-- Boss" section passed `photo={null}`. Both were waiting on somebody to place a
-- file in the repository — which the client cannot do, and which is the exact
-- arrangement migration 015 removed for the logo. This finishes that job: the
-- portrait goes through `/api/admin/upload` like every other image, so it gets
-- the 1600/800/400 WebP derivatives, a `media` row against the storage budget
-- (HR9) and its real dimensions for free.
--
-- Only one column is added. The dimensions are read from `media` in the view,
-- for the same reason 016 gave: `storeImage()` already records them and there
-- must stay exactly one place a stored image's size lives.
--
-- ROLLBACK
--   create or replace view site_settings_public as select ... (017's list);
--   alter table site_settings drop column portrait_key;

alter table site_settings
  add column if not exists portrait_key text;

comment on column site_settings.portrait_key is
  'Storage key for the agent portrait shown on / and /about, and published as '
  '`image` on the Person graph. NULL hides the portrait rather than rendering '
  'a placeholder.';

-- ---------------------------------------------------------------------------
-- The public view must be recreated or the column is admin-only and the
-- portrait silently never appears. Same trap as 015, 016 and 017; new columns
-- are APPENDED because `create or replace view` cannot insert into the middle
-- of an existing column list.
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
  (select m.height from media m where m.key = s.portrait_key limit 1) as portrait_h
from site_settings s
where s.id = 1;

grant select on site_settings_public to anon, authenticated;
