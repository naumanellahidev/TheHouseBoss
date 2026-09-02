---
name: supabase-migration
description: Load before creating or changing anything in the House Boss database — a migration, a table, a column, an index, an RLS policy, a view, a function, or a storage policy. Covers the migration workflow, the RLS pattern this project uses, the 500MB free-tier budget, and the columns that must never be removed.
---

# Supabase Migration Workflow

Schema of record: `docs/02-database-schema.md`. Never diverge from it silently —
if the schema must change, update that document in the same commit.

## Golden rules

1. **Never edit an applied migration.** Add a new numbered file.
2. **Every new table gets RLS enabled in the same migration.** A table without
   RLS on a public Supabase project is world-writable.
3. **Every migration is reversible in principle.** Note the rollback in a
   comment even if you do not write a down migration.
4. **Regenerate types after every migration** and commit the result.
5. Test against a local or scratch database before touching production.

## Workflow

```bash
supabase migration new <descriptive_name>   # creates supabase/migrations/<ts>_<name>.sql
# write the SQL
supabase db reset                            # local: reapply everything + seed
npm run test:rls                             # policies still hold?
supabase gen types typescript --local > types/database.ts
git add supabase/migrations types/database.ts
```

Production:

```bash
supabase db push                             # review the diff it prints, then confirm
```

Never run ad-hoc DDL in the Supabase SQL editor against production. If it is not
in a migration file, it does not exist and the next `db reset` destroys it.

## RLS pattern

Every table, without exception:

```sql
alter table <t> enable row level security;

-- public reads only published content
create policy "public read <t>"
  on <t> for select to anon, authenticated
  using (published = true);          -- or status = 'published'

-- admin does everything
create policy "admin all <t>"
  on <t> for all to authenticated
  using (is_admin()) with check (is_admin());
```

`is_admin()` is defined once in `010_functions.sql`:

```sql
create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin')
$$;
```

Exceptions, and the only ones:

- `leads` and `saved_searches` — anon may `insert`, and must **not** be able to
  `select`. Verify both halves.
- `redirects` — anon may `select` all rows (middleware needs them). No sensitive
  data lives there.

After any policy change, run `npm run test:rls`. A policy that has not been
tested with the anon key is not a policy, it is a hope.

## Storage-bucket policies

Storage objects are rows in `storage.objects` and need policies too:

```sql
create policy "media public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');

create policy "media admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and is_admin());
```

## The 500 MB budget

The database is not the constraint — image storage is — but do not create the
problem:

- No PostGIS. A `geography` column plus its GIST index is not worth it for a
  site with no radius search. Plain `numeric` lat/lng is enough.
- `raw jsonb` on `listings` stays **null** until MLS. It is the single largest
  bloat risk in the schema.
- Partial indexes (`where published = true`) over full indexes wherever the
  query allows.
- No audit-log or history tables in v1.
- Text columns unbounded is fine; a `varchar(n)` gains nothing in Postgres.

## Index checklist for a new query pattern

Before adding an index, confirm it is needed:

```sql
explain analyze <the actual query>;
```

Add it only if a sequential scan appears on a table that will grow. Then confirm
the plan changed. An unused index costs storage and write throughput.

## Columns that must never be removed

These exist so that Stellar MLS can be added later without a migration against a
live database (`docs/11-mls-future.md`):

```
listings.source        listings.source_id     listings.mls_number
listings.synced_at     listings.is_locked     listings.raw
unique (source, source_id)
table sync_log
```

If a cleanup pass proposes removing them, refuse and point at the doc.

## Triggers already defined

Do not reimplement these in application code:

| Trigger | Does |
|---|---|
| `touch_updated_at` | `updated_at` on every mutable table |
| `set_purge_after` | `sold_at + 7 days` when a listing goes sold |
| `set_published_at` | Stamps `published_at` on first publish |
| `log_slug_redirect` | Writes a `redirects` row when a published slug changes |
| `flatten_body_text` | Maintains `articles.body_text` from `body_json` |

## Constraints already defined

| Constraint | Enforces |
|---|---|
| `listings_photo_limit` | `jsonb_array_length(photos) <= 15` |
| `listings_published_needs_photo` | A published listing has at least one photo |
| `listings_sold_fields` | Sold listings have `sold_at` and `sold_price` |
| `listings_source_unique` | `(source, source_id)` — the MLS upsert target |

These are the database half of the hard rules in `CLAUDE.md`. The UI and the API
enforce the same things; all three layers must agree.

## After every migration

- [ ] `supabase db reset` applies cleanly from empty
- [ ] `npm run test:rls` passes
- [ ] `types/database.ts` regenerated and committed
- [ ] `types/domain.ts` updated if the domain shape changed
- [ ] `lib/queries/*` updated to match
- [ ] `docs/02-database-schema.md` updated in the same commit
