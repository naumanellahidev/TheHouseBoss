-- 022_page_sections.sql
--
-- Structured content for service landing pages (brief §33, §34, §36).
--
-- WHY NOT ONE `content` FIELD
--
-- §36 forbids it, and the reason is worth stating: a landing page stored as one
-- rich-text blob can only be edited as prose. Reordering a section, disabling
-- one, changing a heading without touching the copy under it, or letting the
-- SEO engine read "what services does this page list" all become impossible —
-- the structure exists only in the markup, where nothing can address it.
--
-- So each section is a row, addressed by `(page_slug, section_key)`, with its
-- own ordering and enabled flag. `content` is jsonb because the shape genuinely
-- differs per section: a hero has an eyebrow and two CTAs, a services block has
-- a list, an FAQ has question/answer pairs. Constraining that to one table
-- shape would mean fifteen nullable columns, most of them null on most rows.
--
-- WHY THE PAGE IS NOT A ROW
--
-- There is no `pages` table. This site has a fixed set of routes defined in
-- code; a page that can be created in a CMS is a page with no route, no
-- metadata builder and no test. `page_slug` is a text key that a route opts
-- into, which is the smallest thing that supports §35's editor without
-- inventing a page builder nobody asked for.
--
-- ROLLBACK
--   drop table page_sections;

create table page_sections (
  id           uuid primary key default gen_random_uuid(),

  -- The route this belongs to, without the leading slash: 'hire-contractor'.
  page_slug    text not null,
  -- 'hero', 'services', 'process'... The route decides which keys it renders.
  section_key  text not null,

  -- Shape varies by key; the rendering component owns the contract.
  content      jsonb not null default '{}'::jsonb,

  position     smallint not null default 0,

  /*
    A disabled section is hidden, not deleted.

    §35 asks for an enabled flag on FAQs and the same reasoning applies to every
    section: turning one off for a season and back on later must not mean
    retyping it. It also means "why has the services block vanished" has an
    answer an operator can see rather than a row that no longer exists.
  */
  enabled      boolean not null default true,

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  unique (page_slug, section_key),
  constraint page_sections_content_is_object
    check (jsonb_typeof(content) = 'object')
);

create index page_sections_page_idx on page_sections (page_slug, position)
  where enabled;

create trigger touch_page_sections
  before update on page_sections
  for each row execute function touch_updated_at();

comment on table page_sections is
  'Brief §34. Structured sections for service landing pages. One row per '
  'section, never one blob per page — see the note at the top of the migration.';

-- ---------------------------------------------------------------------------
-- RLS. Public reads enabled sections, because they are the page. Writes are
-- admin-only, like every other content table.
-- ---------------------------------------------------------------------------

alter table page_sections enable row level security;

create policy "public read page_sections" on page_sections
  for select to anon, authenticated using (enabled);

create policy "admin all page_sections" on page_sections
  for all to authenticated using (is_admin()) with check (is_admin());
