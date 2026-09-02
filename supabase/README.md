# Supabase — setup runbook

Everything in this folder is written and reviewed but **has not been applied to
a real database yet**. This machine has the Supabase CLI (2.105.0) but no
Docker, so `supabase start` cannot run a local stack, and no cloud project
exists. Applying these is the one Phase 1 step that needs the client's Supabase
account.

Full schema rationale: [`../docs/02-database-schema.md`](../docs/02-database-schema.md).

---

## What is here

| File | Contents |
|---|---|
| `migrations/001_extensions.sql` | `pgcrypto`, `unaccent`. Deliberately **no** PostGIS, **no** citext |
| `migrations/002_profiles.sql` | `profiles`, `is_admin()`, the `auth.users` trigger |
| `migrations/003_places.sql` | `cities`, `communities` |
| `migrations/004_listings.sql` | `listings` + every constraint and index |
| `migrations/005_content.sql` | `articles`, `reviews` |
| `migrations/006_leads.sql` | `leads`, `saved_searches` |
| `migrations/007_media.sql` | `media`, `redirects`, `sync_log` |
| `migrations/008_functions.sql` | helpers and every trigger binding |
| `migrations/009_views.sql` | `listing_facets`, `listing_card` |
| `migrations/010_rls.sql` | every RLS policy, plus the `media` storage bucket |
| `seed.sql` | 8 cities, Heathrow, 6 sample listings |
| `config.toml` | CLI configuration |

Order matters: functions come before RLS, and `is_admin()` is defined in 002
because every policy in 010 calls it.

---

## Applying to a cloud project

```bash
# 1. create the project at supabase.com
#    region: US East (North Virginia) — must match Vercel's iad1

supabase login
supabase link --project-ref <ref>

# 2. review what will run, then apply
supabase db push --dry-run
supabase db push

# 3. seed (development / staging only — never a live production database)
psql "$SUPABASE_DB_URL" -f supabase/seed.sql

# 4. regenerate the TypeScript types and commit them
npm run db:types
```

`types/database.ts` is currently a **placeholder** with every table typed as a
loose record. Step 4 replaces it. Until then it compiles but describes nothing.

## Applying locally (needs Docker)

```bash
supabase start          # requires Docker Desktop
supabase db reset       # applies migrations + seed from scratch
npm run db:types:local
```

`supabase db reset` is the real test of the migration set: it runs every file in
order against an empty database. That is the Phase 1 Definition-of-Done item
that cannot be checked without Docker or a scratch cloud project.

---

## After the first sign-in

There is no public signup. The single admin is promoted by hand, once:

```sql
-- find the id after signing in with a magic link at /admin/login
select id, email from auth.users;

update profiles set role = 'admin' where id = '<uuid>';
```

## Verifying RLS

Not optional, and not something to take on trust:

```bash
NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... npm run test:rls
```

The script uses **only the anon key** — the one that ships in the browser
bundle and that anyone can extract. It asserts that anon cannot write anywhere,
cannot read a draft or a lead, and *can* read published content. A failure is a
launch blocker.

---

## Things that will bite

- **The project pauses after 7 days idle** on the free tier, and a paused
  database is a down website. The daily keepalive cron (Phase 2) is what
  prevents it. Do not remove it.
- **There are no automatic backups** on the free tier. The nightly `pg_dump`
  GitHub Action in `docs/12-env-deployment.md` § 5 is the only copy. Do a real
  restore drill before launch — a backup that has never been restored is not a
  backup.
- **Seed rows are marked `source = 'seed'`.** Remove them before the client's
  real listings go in: `delete from listings where source = 'seed';`
- **Never run ad-hoc DDL in the SQL editor** against production. If it is not in
  a migration file it does not exist, and the next `db reset` destroys it.
