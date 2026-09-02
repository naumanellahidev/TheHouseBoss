# 12 — Environment, Deployment and Operations

---

## 1. Environment variables

`.env.example` is committed. `.env.local` never is.

```bash
# ── Site ────────────────────────────────────────────────
NEXT_PUBLIC_SITE_URL=https://thehousebossfl.com

# ── Supabase ────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # SERVER ONLY. Never NEXT_PUBLIC_.

# ── Media ───────────────────────────────────────────────
STORAGE_DRIVER=supabase                 # supabase | r2 | local
NEXT_PUBLIC_MEDIA_URL=https://xxxx.supabase.co/storage/v1/object/public/media

# ── Email ───────────────────────────────────────────────
RESEND_API_KEY=re_...
LEAD_NOTIFY_EMAIL=krisi@thehousebossfl.com
EMAIL_FROM="The House Boss <hello@thehousebossfl.com>"

# ── Security ────────────────────────────────────────────
CRON_SECRET=<openssl rand -hex 32>
REVALIDATE_SECRET=<openssl rand -hex 32>
DRAFT_PREVIEW_SECRET=<openssl rand -hex 32>

# ── Future: Cloudflare R2 (unset today) ─────────────────
# R2_ACCOUNT_ID=
# R2_ACCESS_KEY_ID=
# R2_SECRET_ACCESS_KEY=
# R2_BUCKET=
# R2_PUBLIC_URL=https://media.thehousebossfl.com

# ── Future: Stellar MLS (unset today) ───────────────────
# LISTING_SOURCE=manual
# STELLAR_API_URL=
# STELLAR_ACCESS_TOKEN=
# STELLAR_AGENT_MLS_ID=
```

### Rules

1. Anything prefixed `NEXT_PUBLIC_` is in the browser bundle. Assume it is
   public. Nothing secret ever gets that prefix.
2. `SUPABASE_SERVICE_ROLE_KEY` is imported only by `lib/supabase/service.ts`,
   which throws if it is loaded in a browser context.
3. Every variable is validated at startup by a zod schema in `lib/env.ts`. A
   missing variable fails the build, not the first request.
4. Rotate `CRON_SECRET` and `REVALIDATE_SECRET` if a repository ever becomes
   public.

```ts
// lib/env.ts — fail fast, fail loud
import { z } from 'zod'

const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_MEDIA_URL: z.string().url(),
  STORAGE_DRIVER: z.enum(['supabase', 'r2', 'local']).default('supabase'),
  RESEND_API_KEY: z.string().startsWith('re_'),
  CRON_SECRET: z.string().min(32),
})

export const env = schema.parse(process.env)
```

---

## 2. Vercel

### Plan

**Pro, $20/month.** Not negotiable: Vercel's Hobby tier prohibits commercial
use, and this is a commercial site for a paying client. Deploying it on Hobby
risks the project being taken down without warning.

### Project settings

| Setting | Value |
|---|---|
| Framework | Next.js |
| Node version | 22.x |
| Build command | `next build` |
| Install command | `npm ci` |
| Region | `iad1` (US East — same region as Supabase) |
| Environment variables | Set separately for Production, Preview and Development |

Put Supabase and Vercel in the **same region**. A cross-region round trip on
every query is the easiest self-inflicted latency in this stack.

### Deployment protection

Preview deployments get Vercel Authentication enabled so a half-finished site
never gets indexed. Preview also gets `X-Robots-Tag: noindex` via middleware:

```ts
if (process.env.VERCEL_ENV !== 'production') {
  res.headers.set('X-Robots-Tag', 'noindex, nofollow')
}
```

### Cron jobs

`vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/purge-sold-photos", "schedule": "0 4 * * *" },
    { "path": "/api/cron/orphan-media",      "schedule": "30 4 * * *" },
    { "path": "/api/cron/keepalive",         "schedule": "0 12 * * *" }
  ]
}
```

Every cron route verifies the secret before doing anything:

```ts
const auth = req.headers.get('authorization')
if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
  return new Response('Unauthorized', { status: 401 })
}
```

`keepalive` runs a single trivial query. Supabase free-tier projects pause after
seven days of inactivity; a paused database is a down website. This cron is the
cheapest insurance in the project — do not remove it.

### Headers

`next.config.ts`:

```ts
headers: async () => [
  {
    source: '/:path*',
    headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
      { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
    ],
  },
]
```

A Content-Security-Policy is desirable but must be introduced carefully with
Next.js inline scripts. Add it in Phase 7 with a nonce, and test thoroughly —
a broken CSP silently breaks hydration.

---

## 3. Supabase

### Project

| Setting | Value |
|---|---|
| Region | US East (North Virginia) |
| Plan | Free |
| Postgres | 15+ |

### Free-tier limits and what happens at each

| Limit | Value | Consequence | Mitigation |
|---|---|---|---|
| Database | 500 MB | Writes fail | Schema is tiny; keep `raw` null |
| Storage | 1 GB | Uploads fail | The entire `07-image-pipeline.md` |
| Egress | 5 GB/mo | Throttling | One-year immutable cache on media |
| Monthly active users | 50,000 | N/A | One admin user |
| Pause | 7 days idle | **Site down** | Daily keepalive cron |
| Backups | None on free tier | **Data loss** | See § 5 |

**Two of these are genuinely dangerous:** the 7-day pause and the absence of
backups. Both are handled below. Do not launch without both in place.

### Upgrade trigger

Move to Supabase Pro ($25/mo) when any of these is true:

- Storage passes 800 MB and R2 migration has not been done
- Database passes 350 MB
- Point-in-time recovery becomes a requirement
- Egress regularly exceeds 4 GB/month

### Auth configuration

- Email provider on, magic link only, confirmations required
- Site URL: `https://thehousebossfl.com`
- Redirect allowlist: production and preview URLs
- JWT expiry 3600s, refresh rotation on
- **Signup disabled** in the dashboard after the admin account is created

---

## 4. Domain and DNS (Porkbun)

The domain is already registered at Porkbun. Two options:

**Option A — Vercel nameservers (simplest)**
Point Porkbun at `ns1.vercel-dns.com` / `ns2.vercel-dns.com`. Vercel manages all
records. Email DNS is then managed in Vercel too.

**Option B — keep Porkbun DNS (recommended if she uses Porkbun email)**

| Type | Name | Value |
|---|---|---|
| A | `@` | `76.76.21.21` |
| CNAME | `www` | `cname.vercel-dns.com` |
| TXT | `@` | Vercel verification |
| MX | `@` | existing mail provider |
| TXT | `@` | `v=spf1 include:_spf.resend.com ~all` |
| CNAME | `resend._domainkey` | provided by Resend |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:...` |

Recommend Option B — she may already have email on the domain, and moving
nameservers can break it.

SSL is automatic. Redirect `www` → apex (or the reverse; pick one and set the
canonical to match). Verify HSTS after the certificate is stable, not before.

---

## 5. Backups

Supabase free tier has **no automatic backups**. This is the single largest
operational risk in the project.

### Database

GitHub Actions, nightly:

```yaml
name: db-backup
on:
  schedule: [{ cron: '0 5 * * *' }]
  workflow_dispatch:
jobs:
  dump:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          pg_dump "${{ secrets.SUPABASE_DB_URL }}" \
            --no-owner --no-privileges --clean --if-exists \
            -f backup-$(date +%F).sql
          gzip backup-$(date +%F).sql
      - uses: actions/upload-artifact@v4
        with:
          name: db-backup-${{ github.run_id }}
          path: backup-*.sql.gz
          retention-days: 90
```

### Storage

Weekly `rclone` sync of the media bucket to a second location (Backblaze B2 or
Google Drive). The client's listing photos may be the only copy that exists —
she photographs a house once.

### Restore drill

**Perform a real restore before launch.** A backup that has never been restored
is not a backup. Restore the nightly dump into a scratch Supabase project,
confirm row counts, then delete the scratch project. Document the elapsed time
in `PROGRESS.md`.

---

## 6. Local development

```bash
git clone <repo> && cd the-house-boss
cp .env.example .env.local        # fill in values
npm ci
npm run dev
```

Optional local Supabase:

```bash
supabase start
supabase db reset                 # applies migrations + seed
supabase gen types typescript --local > types/database.ts
```

Scripts:

| Script | Purpose |
|---|---|
| `dev` | Next dev server |
| `build` | Production build |
| `lint` | ESLint |
| `typecheck` | `tsc --noEmit` |
| `test:rls` | RLS policy test script |
| `test:responsive` | Playwright screenshots at nine widths |
| `test:a11y` | axe-core across page types |
| `db:types` | Regenerate `types/database.ts` |
| `db:reset` | Reset local database |

---

## 7. CI

GitHub Actions on every pull request:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run build`
5. Bundle-size check against the budget in `01-architecture.md`
6. `npm run test:a11y` against the Vercel preview URL
7. Grep guards:
   - no `SERVICE_ROLE` in `app/` or `components/`
   - no hex color literal outside `app/globals.css`
   - `supabase.storage` referenced only inside `lib/storage/`

Those three greps catch the most damaging classes of regression in this
codebase, and they cost nothing.

---

## 8. Monitoring

| Concern | Tool |
|---|---|
| Uptime | UptimeRobot or Better Stack, 5-minute check on `/` |
| Errors | Sentry free tier, or Vercel's built-in log drain |
| Core Web Vitals | Vercel Analytics (included with Pro) |
| Traffic | Vercel Analytics, or Plausible if the client wants a dashboard |
| Cron health | Vercel cron logs; alert on two consecutive failures |
| Storage | Dashboard widget, plus a monthly manual check |
| Search | Google Search Console and Bing Webmaster Tools |
| AI bot activity | Monthly grep of logs for `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot` |

---

## 9. Runbook

### Site is down

1. Vercel status page
2. Vercel deployment logs — did a deploy fail?
3. Supabase dashboard — **is the project paused?** (most likely cause on free
   tier). Resume it, then check why keepalive stopped.
4. Roll back to the last good deployment in Vercel — one click

### Images are broken

1. Is `NEXT_PUBLIC_MEDIA_URL` correct in the current environment?
2. Is the `media` bucket still public?
3. Do the objects exist in the bucket for that key?
4. Did a purge or orphan cron run against something it should not have? Check
   the cron logs and the `media` table.
5. The `onError` fallback should be showing placeholders, not broken icons — if
   broken icons appear, `PropertyImage` has been bypassed somewhere.

### Uploads are failing

1. Storage usage — near 1 GB?
2. Supabase storage policies unchanged?
3. Function timeout — is the source image very large?
4. Check the upload route logs for a `sharp` error

### Leads are not arriving

1. Resend dashboard — delivery and bounce logs
2. Domain authentication (SPF, DKIM, DMARC) still passing?
3. `LEAD_NOTIFY_EMAIL` correct?
4. Are rows landing in the `leads` table? If yes it is an email problem, not a
   form problem — check the table first, always.

### A cron is not running

1. Vercel → Settings → Crons: last run and status
2. `CRON_SECRET` matches between the environment and the route
3. Function duration — did it time out? Batch the work.

---

## 10. Handover to the client

Deliver at launch:

1. A written admin guide with screenshots: add a listing, publish an article,
   handle a lead, mark a property sold
2. A one-page "what not to do" sheet: do not delete a sold listing, do not
   upload photos over 10 MB, do not skip alt text, do not edit the compliance
   footer
3. Credentials handover: Supabase, Vercel, Resend, Search Console, Bing — with
   accounts in **her** name, not the developer's
4. The off-site profile checklist from `08-seo-ai-visibility.md` § 8
5. A monthly maintenance list: publish a market update, check leads, review
   storage, run the assistant queries
6. Clear statements of the recurring costs and of what is not included
