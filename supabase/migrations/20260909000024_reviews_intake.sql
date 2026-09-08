-- 024_reviews_intake.sql
--
-- Two unrelated changes the client asked for in one breath, kept in one file
-- because they ship together.
--
-- ===========================================================================
-- 1. The same image may be uploaded more than once
-- ===========================================================================
--
-- `media_entity_hash_idx` was unique on (entity_type, entity_id, content_hash),
-- so the same bytes could not be stored twice against one entity. That is a
-- reasonable default and it was wrong here in a way that was not obvious when
-- it was written: every site-wide image — the logo, the dark-background logo,
-- the portrait, the OG card, the home hero — shares one entity, because
-- `entity_type = 'site'` and `entity_id` is a single fixed uuid. Uploading one
-- file as BOTH the logo and the dark-background logo was refused with "This
-- photo is already on this listing", which is neither true nor actionable.
--
-- The client's decision is to drop the restriction outright rather than narrow
-- it, so the same photograph can also appear twice on one listing.
--
-- The cost is real and accepted: identical bytes are now stored twice and
-- counted twice against the 1 GB budget. `canAcceptUpload()` still refuses an
-- upload that would exceed it, so the ceiling holds — it is simply reached
-- sooner. The hash is kept and still indexed, non-uniquely, because "which
-- objects are copies of each other" is worth being able to ask.
--
-- ROLLBACK
--   drop index media_hash_idx;
--   create unique index media_entity_hash_idx on media
--     (entity_type, entity_id, content_hash) where content_hash is not null;
--   -- and deduplicate the table first, or the index will not build.

drop index if exists media_entity_hash_idx;

create index if not exists media_hash_idx
  on media (content_hash)
  where content_hash is not null;

comment on column media.content_hash is
  'sha256 of the source bytes. Recorded so copies can be identified; NOT a '
  'uniqueness constraint — see migration 024.';

-- ===========================================================================
-- 2. A visitor can submit a review, and it waits for approval
-- ===========================================================================
--
-- The table already had `published`, defaulting to false, which is exactly the
-- moderation gate this needs. What it did not have was any way to tell a review
-- the admin typed in from one a stranger submitted, or any way to contact the
-- person who wrote it.
--
-- `submitted_at` is NULL for everything entered in the dashboard and set for
-- everything that arrived through the public form. That is what lets the admin
-- screen separate "waiting for you" from "on file".

alter table reviews add column if not exists author_email text;
alter table reviews add column if not exists submitted_at timestamptz;

comment on column reviews.author_email is
  'Supplied by the person who wrote the review, so it can be verified before '
  'publication (docs/09 § 7). NEVER public — anon has no SELECT privilege on '
  'this column; see the grant below.';

comment on column reviews.submitted_at is
  'Set only by the public form. NULL means an admin entered the review.';

create index if not exists reviews_pending_idx
  on reviews (submitted_at desc)
  where published = false;

-- ---------------------------------------------------------------------------
-- The email is not public.
--
-- A column-level REVOKE cannot take a privilege away that was granted at table
-- level — PostgreSQL leaves the table grant in place and the column stays
-- readable. So the table grant is revoked and an explicit column list is
-- granted back.
--
-- TRAP, and it is the same one `site_settings_public` carries: a column added
-- to this table in a later migration is NOT readable by anon until it is added
-- to this list. That fails silently — the row comes back without the field.
--
-- `authenticated` keeps its table-level grant. Everyone in that role is signed
-- in to the dashboard, and `getAdminReviews` needs the email.
-- ---------------------------------------------------------------------------
revoke select on reviews from anon;

grant select (
  id,
  author_name,
  author_role,
  rating,
  body,
  source,
  source_url,
  reviewed_at,
  published,
  sort_order,
  created_at,
  submitted_at
) on reviews to anon;

-- ---------------------------------------------------------------------------
-- Write-only intake, the same shape as `leads`.
--
-- `with check (published = false)` is the whole security of this: a visitor may
-- create a review and cannot create a PUBLISHED one, so nothing reaches the
-- site without an admin turning it on. The existing "admin all reviews" policy
-- is permissive and ORs with this one, so an admin can still insert a published
-- row directly.
--
-- Anon still cannot SELECT an unpublished row, so a submitter cannot read back
-- what they sent, and cannot read anyone else's pending review either.
-- ---------------------------------------------------------------------------
create policy "public insert reviews" on reviews
  for insert to anon, authenticated
  with check (published = false);
