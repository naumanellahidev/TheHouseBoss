-- 012_redirect_status.sql
-- Align `redirects.status_code` with what the application actually emits.
--
-- Next's `permanentRedirect()` answers 308, not 301. The column defaulted to
-- 301 and nothing read it, so the table asserted one thing while every response
-- said another — the kind of quiet mismatch that costs someone an hour when a
-- redirect eventually misbehaves.
--
-- 308 is treated identically to 301 by Google for canonicalisation and, unlike
-- 301, is defined to preserve the request method. The column is now read by
-- `resolveRedirect()`: 302 produces a temporary redirect, anything else a
-- permanent one.
--
-- Rollback: alter column set default 301; update existing rows back to 301.

alter table redirects alter column status_code set default 308;

alter table redirects drop constraint if exists redirects_status_code_check;
alter table redirects add constraint redirects_status_code_check
  check (status_code in (301, 302, 307, 308));

-- Existing rows were written by the slug trigger with the old default and have
-- always been served as 308 in practice.
update redirects set status_code = 308 where status_code = 301;

comment on column redirects.status_code is
  'What the app emits: 308 permanent (the default, via permanentRedirect), or '
  '302/307 temporary (via redirect). 301 is accepted for hand-written rows but '
  'is served as 308.';
