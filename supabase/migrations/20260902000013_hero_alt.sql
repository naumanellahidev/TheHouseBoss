-- 013_hero_alt.sql
-- Alt text for the city and community hero images.
--
-- `articles.cover_alt` already established the pattern: a single image gets its
-- description in a sibling column on the same row. Cities and communities had
-- `hero_key` with nowhere to put the description, so a hero could be published
-- with no alt text at all — which fails the accessibility requirement in
-- docs/09 § 3 the same way a listing photo without alt text does.
--
-- The alternative was a general `media.alt` column, which would have meant two
-- mechanisms for the same thing depending on which table you started from.
--
-- Rollback: alter table cities drop column hero_alt; same for communities.

alter table cities add column if not exists hero_alt text;
alter table communities add column if not exists hero_alt text;

comment on column cities.hero_alt is
  'Description of hero_key, required before publishing a hero image. Mirrors '
  'articles.cover_alt.';

comment on column communities.hero_alt is
  'Description of hero_key, required before publishing a hero image.';
