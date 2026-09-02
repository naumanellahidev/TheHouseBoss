-- 009_views.sql
-- listing_facets and listing_card.
--
-- Both are security_invoker so the caller's RLS applies — a view is otherwise
-- owned by the definer and would leak unpublished rows straight past every
-- policy in 010.

-- ---------------------------------------------------------------------------
-- HR22: every filter dropdown is derived from this view. Nothing about cities,
-- price bands or property types is ever hardcoded in the UI. Options with
-- total = 0 render disabled with their count rather than being hidden — a
-- disabled option teaches the visitor what exists.
-- ---------------------------------------------------------------------------
create view listing_facets
with (security_invoker = true)
as
select
  l.city_id,
  c.slug            as city_slug,
  c.name            as city_name,
  l.property_type,
  l.listing_type,
  count(*)          as total,
  min(l.price)      as min_price,
  max(l.price)      as max_price,
  min(l.beds)       as min_beds,
  max(l.beds)       as max_beds,
  min(l.baths)      as min_baths,
  max(l.baths)      as max_baths,
  min(l.sqft)       as min_sqft,
  max(l.sqft)       as max_sqft,
  min(l.year_built) as min_year,
  max(l.year_built) as max_year,
  bool_or(l.pool)   as has_pool
from listings l
join cities c on c.id = l.city_id
where l.published = true
  and l.status in ('active', 'coming_soon', 'pending')
group by l.city_id, c.slug, c.name, l.property_type, l.listing_type;

-- ---------------------------------------------------------------------------
-- Exactly the columns <PropertyCard /> needs, and nothing more. Exists so
-- `select *` never creeps into a list page and drags `description` and the full
-- `photos` array across the wire for 24 cards.
-- ---------------------------------------------------------------------------
create view listing_card
with (security_invoker = true)
as
select
  l.id,
  l.slug,
  l.status,
  l.listing_type,
  l.property_type,
  l.price,
  l.sold_price,
  l.beds,
  l.baths,
  l.sqft,
  l.address,
  l.unit,
  l.zip,
  l.city_id,
  c.slug  as city_slug,
  c.name  as city_name,
  l.community_id,
  l.photos -> 0 as cover,
  l.photos_purged,
  l.is_featured,
  l.published_at,
  l.sold_at
from listings l
join cities c on c.id = l.city_id
where l.published = true;

grant select on listing_facets to anon, authenticated;
grant select on listing_card   to anon, authenticated;
