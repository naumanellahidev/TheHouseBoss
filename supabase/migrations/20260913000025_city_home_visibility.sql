-- 025_city_home_visibility.sql
-- Which cities appear on the home page, decided in the admin.
--
-- The home page's city tiles were rendered from `in_search`, which is a
-- different question: `in_search` decides what appears in the search filter
-- (the five the client named in the brief). Reusing it meant she could not
-- feature Oviedo on the home page without also adding it to the search
-- dropdown, and could not take a city off the home page without removing it
-- from search.
--
-- Backfilled to `in_search` so the home page renders exactly what it renders
-- today; from now on the two move independently. The column default is TRUE
-- because a city added later should be visible unless someone says otherwise.

alter table cities
  add column if not exists show_on_home boolean not null default true;

update cities set show_on_home = in_search;

comment on column cities.show_on_home is
  'Appears in the home page city tiles. Independent of in_search, which drives '
  'the search filter. Toggled from Admin -> Cities.';

-- The home page reads this on every render of a static page rebuild; it is a
-- tiny table, but the index keeps the ordering read from touching every row.
create index if not exists cities_home_idx
  on cities (show_on_home, sort_order)
  where published = true;
