-- 017_whatsapp.sql
--
-- The WhatsApp number for the floating contact button.
--
-- WHY A SEPARATE COLUMN AND NOT `phone`
--
-- They are frequently different numbers. An agent's published office line is
-- often a landline or a tracking number that WhatsApp cannot reach, and a
-- wa.me link built from one produces a dead end that looks like a working
-- button. The component falls back to `phone` when this is NULL, because for
-- many agents they ARE the same number and asking twice for one fact is worse
-- than a fallback — but the fallback is a guess and this column is the answer.
--
-- Stored as typed, not normalised. `wa.me` needs bare E.164 digits and the
-- component strips everything else at render, so the admin can paste
-- "+1 (407) 555-0142" and it works. Normalising on write would mean the value
-- shown back in the form is not the value that was typed.
--
-- ROLLBACK
--   create or replace view site_settings_public as select ... (016's list);
--   alter table site_settings drop column whatsapp;

alter table site_settings
  add column if not exists whatsapp text;

comment on column site_settings.whatsapp is
  'WhatsApp number in any readable format. NULL falls back to `phone`. The '
  'floating button is not rendered at all when neither is set.';

-- ---------------------------------------------------------------------------
-- The public view must be recreated, or the column is admin-only and the
-- button silently never appears. Same trap as 015 and 016; new columns are
-- APPENDED because `create or replace view` cannot insert into the middle of an
-- existing column list.
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
  -- Added in 017.
  whatsapp
from site_settings s
where s.id = 1;

grant select on site_settings_public to anon, authenticated;
