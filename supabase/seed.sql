-- seed.sql
-- Development seed data. Applied by `supabase db reset`.
--
-- TWO RULES FOR THIS FILE:
--
-- 1. No invented market statistics. Median price, days on market, price/sqft
--    and population are left EMPTY for the client to supply. A fabricated
--    figure that reaches production is worse than a missing one, and
--    docs/14-content-plan.md requires every statistic to carry its source date.
--    <StatTiles /> renders nothing when stats_json is empty.
--
-- 2. Seed photos use `kind: "external"` pointing at the local placeholder.
--    Real photos arrive in Phase 2 through the upload pipeline, which writes
--    `kind: "stored"` entries with immutable keys. Using the placeholder here
--    lets `listings_published_needs_photo` pass so Phase 3 has data to render
--    without inventing storage objects that do not exist.
--
-- The admin user CANNOT be seeded: profiles.id references auth.users, and that
-- row only exists after a real magic-link sign-in. After signing in once, run:
--
--   update profiles set role = 'admin' where id = '<your-uuid>';

-- ═══════════════════════════════════════════════════════════════════════════
-- Cities — the client's five search targets plus three content-only cities
-- ═══════════════════════════════════════════════════════════════════════════

insert into cities (slug, name, county, in_search, is_flagship, sort_order, published, intro_md, meta_title, meta_desc)
values
  ('lake-mary', 'Lake Mary', 'Seminole', true, true, 0, true,
   'Lake Mary is a city in Seminole County, Florida, roughly 20 miles north of downtown Orlando. It is the market Krisi lives in and works in.',
   'Lake Mary, FL Real Estate | Homes, Communities & Neighborhood Guide',
   'Lake Mary homes for sale, community guides and local market insight from a Realtor who lives here. VA buyers, assumable mortgages and new construction.'),

  ('longwood', 'Longwood', 'Seminole', true, false, 1, true,
   'Longwood sits in Seminole County between Lake Mary and Altamonte Springs, known for its historic district and mature tree canopy.',
   'Longwood, FL Homes for Sale | The House Boss',
   'Search Longwood homes for sale with a Central Florida Realtor and licensed residential contractor. Local guidance on condition, value and process.'),

  ('sanford', 'Sanford', 'Seminole', true, false, 2, true,
   'Sanford is the Seminole County seat, on the south shore of Lake Monroe, with a historic downtown, the Riverwalk and a SunRail station.',
   'Sanford, FL Homes for Sale | The House Boss',
   'Search Sanford homes for sale. Historic downtown, Riverwalk and SunRail access, with local guidance from a Realtor and licensed contractor.'),

  ('casselberry', 'Casselberry', 'Seminole', true, false, 3, true,
   'Casselberry is a centrally located Seminole County city built around a chain of lakes, with quick access to both Orlando and the 417.',
   'Casselberry, FL Homes for Sale | The House Boss',
   'Search Casselberry homes for sale in Seminole County, Florida. Local market guidance from a Realtor and Certified Residential Building Contractor.'),

  ('orlando', 'Orlando', 'Orange', true, false, 4, true,
   'Orlando is the largest city in Central Florida. Its market is best understood by area rather than as a single whole.',
   'Orlando, FL Homes for Sale | The House Boss',
   'Search Orlando homes for sale with a Central Florida Realtor and licensed residential contractor. Area-by-area guidance, not a one-size answer.'),

  ('altamonte-springs', 'Altamonte Springs', 'Seminole', false, false, 5, true,
   'Altamonte Springs is a Seminole County city built around Cranes Roost Park, with strong I-4 access and a large condominium and townhome supply.',
   'Altamonte Springs, FL Real Estate Guide | The House Boss',
   'Altamonte Springs real estate guide: neighborhoods, housing types and what to know before you buy in Seminole County, Florida.'),

  ('winter-springs', 'Winter Springs', 'Seminole', false, false, 6, true,
   'Winter Springs is a Seminole County city best known for the Tuscawilla area and its access to the Cross Seminole Trail.',
   'Winter Springs, FL Real Estate Guide | The House Boss',
   'Winter Springs real estate guide: Tuscawilla, trail access and what to know before buying in Seminole County, Florida.'),

  ('oviedo', 'Oviedo', 'Seminole', false, false, 7, true,
   'Oviedo is a Seminole County city east of Winter Springs, close to UCF and the Research Park, with a large share of newer construction.',
   'Oviedo, FL Real Estate Guide | The House Boss',
   'Oviedo real estate guide: schools, UCF proximity and newer construction in Seminole County, Florida.')
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Communities — Heathrow is the one the client named explicitly
-- ═══════════════════════════════════════════════════════════════════════════

insert into communities (city_id, slug, name, sort_order, published, intro_md, meta_title, meta_desc)
select id, 'heathrow', 'Heathrow', 0, true,
  'Heathrow is a master-planned community in the Lake Mary area of Seminole County, Florida.',
  'Heathrow, FL Homes for Sale | Lake Mary Community Guide',
  'Heathrow community guide: homes for sale, HOA information and what living here is actually like, from a Lake Mary Realtor.'
from cities where slug = 'lake-mary'
on conflict (slug) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Sample listings — development data only.
--
-- Addresses are deliberately fictional. Do not let these reach production:
-- every one has `source = 'seed'`, so they are trivial to find and remove:
--   delete from listings where source = 'seed';
-- ═══════════════════════════════════════════════════════════════════════════

with seed_photo as (
  select '[{"kind":"external","url":"/placeholder-property.svg","w":400,"h":300,"alt":"Placeholder image — development seed data","order":0}]'::jsonb as p
)
insert into listings (
  slug, source, status, listing_type, property_type, price,
  beds, baths, half_baths, sqft, lot_size, year_built, garage_spaces, pool,
  features, address, city_id, zip, lat, lng,
  headline, description, contractors_take, photos, published, is_featured,
  meta_title, meta_desc
)
select v.slug, 'seed', v.status, v.listing_type, v.property_type, v.price,
       v.beds, v.baths, v.half_baths, v.sqft, v.lot_size, v.year_built, v.garage, v.pool,
       v.features, v.address, c.id, v.zip, v.lat, v.lng,
       v.headline, v.description, v.take, sp.p, true, v.featured,
       v.meta_title, v.meta_desc
from (values
  ('123-lakeview-dr-lake-mary', 'active', 'resale', 'single_family', 525000::numeric,
   4, 3.0::numeric, 0, 2410, 0.28::numeric, 2004, 2, true,
   array['Granite Counters','Fenced Yard','Screened Lanai','Irrigation System'],
   '123 Lakeview Dr', 'lake-mary', '32746', 28.759::numeric, -81.318::numeric,
   'Renovated four-bedroom with a screened pool in central Lake Mary',
   'Development seed record. Replace with a real listing before launch.',
   'Roof was replaced in 2019 and the AC in 2021 — both well inside the window a VA appraiser looks at. Original 2004 polybutylene supply lines were already swapped for PEX, which is the single biggest hidden-cost item on homes of this vintage.',
   true,
   '123 Lakeview Dr, Lake Mary, FL 32746 | $525,000',
   'Four-bedroom, three-bath pool home in Lake Mary. 2,410 sq ft, built 2004, renovated. Development seed data.'),

  ('88-heathrow-ridge-ct-lake-mary', 'active', 'new_construction', 'single_family', 1245000::numeric,
   5, 4.5::numeric, 1, 4180, 0.41::numeric, 2026, 3, true,
   array['Summer Kitchen','Smart Home Wiring','Impact Windows','Three-Car Garage'],
   '88 Heathrow Ridge Ct', 'lake-mary', '32746', 28.772::numeric, -81.371::numeric,
   'New construction in Heathrow with a summer kitchen and impact glass',
   'Development seed record. Replace with a real listing before launch.',
   'Pre-drywall walkthrough is where a new build is won or lost. On this floor plan the second-floor laundry stack and the lanai gas stub are the two rough-ins worth confirming before insulation goes in.',
   false,
   '88 Heathrow Ridge Ct, Lake Mary, FL 32746 | $1,245,000',
   'New-construction five-bedroom in Heathrow, Lake Mary. 4,180 sq ft, impact windows, three-car garage. Development seed data.'),

  ('41-longwood-oaks-ave-longwood', 'active', 'resale', 'single_family', 389900::numeric,
   3, 2.0::numeric, 0, 1685, 0.22::numeric, 1988, 2, false,
   array['Updated Kitchen','New Roof 2023','Mature Oaks'],
   '41 Longwood Oaks Ave', 'longwood', '32750', 28.703::numeric, -81.338::numeric,
   'Updated three-bedroom under mature oaks in Longwood',
   'Development seed record. Replace with a real listing before launch.',
   null,
   false,
   '41 Longwood Oaks Ave, Longwood, FL 32750 | Sold',
   'Three-bedroom Longwood home, 1,685 sq ft, sold. Development seed data.'),

  ('2200-riverwalk-way-sanford', 'active', 'va_eligible', 'townhouse', 312000::numeric,
   3, 2.5::numeric, 1, 1620, 0.05::numeric, 2019, 1, false,
   array['End Unit','Community Pool','Walk to Riverwalk'],
   '2200 Riverwalk Way', 'sanford', '32771', 28.812::numeric, -81.269::numeric,
   'VA-friendly end-unit townhome minutes from the Sanford Riverwalk',
   'Development seed record. Replace with a real listing before launch.',
   'Built 2019, so it clears the VA Minimum Property Requirements that catch older Sanford inventory — no wood-destroying-organism history, no aged roof, no pre-1978 paint question.',
   true,
   '2200 Riverwalk Way, Sanford, FL 32771 | $312,000',
   'VA-eligible three-bedroom townhome in Sanford, 1,620 sq ft, built 2019. Development seed data.'),

  ('705-lake-triplet-dr-casselberry', 'coming_soon', 'assumable', 'single_family', 429000::numeric,
   4, 2.0::numeric, 0, 1940, 0.24::numeric, 1996, 2, false,
   array['Assumable VA Loan','Fenced Yard','No HOA'],
   '705 Lake Triplet Dr', 'casselberry', '32707', 28.673::numeric, -81.327::numeric,
   'Assumable VA loan on a no-HOA four-bedroom in Casselberry',
   'Development seed record. Replace with a real listing before launch.',
   null,
   false,
   '705 Lake Triplet Dr, Casselberry, FL 32707 | $429,000',
   'Four-bedroom Casselberry home with an assumable VA loan and no HOA. Development seed data.'),

  ('1490-baldwin-park-row-orlando', 'pending', 'resale', 'condo', 268500::numeric,
   2, 2.0::numeric, 0, 1180, null::numeric, 2007, 1, false,
   array['Gated','Community Gym','Balcony'],
   '1490 Baldwin Park Row', 'orlando', '32814', 28.556::numeric, -81.335::numeric,
   'Two-bedroom condo in a gated Orlando community',
   'Development seed record. Replace with a real listing before launch.',
   null,
   false,
   '1490 Baldwin Park Row, Orlando, FL 32814 | $268,500',
   'Two-bedroom Orlando condo, 1,180 sq ft, gated community. Development seed data.')
) as v(slug, status, listing_type, property_type, price, beds, baths, half_baths, sqft,
       lot_size, year_built, garage, pool, features, address, city_slug, zip, lat, lng,
       headline, description, take, featured, meta_title, meta_desc)
join cities c on c.slug = v.city_slug
cross join seed_photo sp
on conflict (slug) do nothing;

-- Transition one seed listing to sold in a single statement: status, sold_at
-- and sold_price all have to land together or listings_sold_fields rejects it.
--
-- sold_at is 10 days ago, so set_purge_after() puts purge_after 3 days in the
-- past. That is deliberate — Phase 2 needs a past-due row to prove the
-- purge-sold-photos cron actually works (docs/10 § P2 Definition of Done).
update listings
   set status     = 'sold',
       sold_at    = now() - interval '10 days',
       sold_price = 385000
 where slug = '41-longwood-oaks-ave-longwood';
