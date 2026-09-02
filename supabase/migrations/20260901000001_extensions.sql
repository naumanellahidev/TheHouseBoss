-- 001_extensions.sql
-- The House Boss — extensions
--
-- Deliberately NOT installed: PostGIS. A geography column plus its GIST index
-- costs storage we cannot spare on a 500 MB budget, and the site has no radius
-- search. Plain numeric lat/lng is enough for map pins. See
-- docs/02-database-schema.md.

create extension if not exists pgcrypto with schema extensions;   -- gen_random_uuid()
create extension if not exists unaccent with schema extensions;   -- accent-insensitive search
-- NOT installed: citext. It resolves to the `extensions` schema, which is not
-- on the migration role's search_path, so `email citext` fails at push time.
-- Emails are lowercased by lib/validation/lead.ts before they ever reach the
-- database, and a CHECK constraint enforces the shape.
