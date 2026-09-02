# 01 — Architecture

## Principles

1. **Server-first.** AI crawlers and search bots read HTML, not hydrated React.
   Every page that matters for visibility must be server-rendered with real
   content in the initial response.
2. **URL is state.** Every filter combination is a shareable, crawlable URL.
   No filter state lives only in React.
3. **One boundary per external system.** Storage, listing sources, email and
   Supabase each sit behind a single module. Swapping a provider is an env
   change, never a refactor.
4. **Normalized types at the edge of data.** No component ever sees a raw
   database row.

## Rendering strategy per route

| Route | Strategy | Reason |
|---|---|---|
| `/` | Static + ISR 3600 | Hero, featured listings, guide teasers |
| `/search` | Dynamic (`searchParams`) | Filter combinations are unbounded |
| `/[city]/homes-for-sale` | Static + ISR 3600 for the canonical view; dynamic once filters are applied | The bare URL is the SEO surface |
| `/listing/[slug]` | ISR + on-demand `revalidatePath` on publish/edit | Must be instant after admin saves |
| `/lake-mary` and city hubs | Static + ISR 3600 | Content pages |
| `/communities/[slug]` | Static + ISR 3600 | Content pages |
| `/guides/*` | Static + ISR 86400 | Rarely change |
| `/blog/[slug]`, `/market-updates/[slug]` | ISR + on-demand revalidate | Published from admin |
| `/about`, `/contact`, `/reviews`, `/sell-*` | Static + ISR 86400 | |
| `/admin/*` | `force-dynamic`, `noindex` | Auth required |
| `/api/*` | Route handlers, Node runtime where `sharp` is used | |

`generateStaticParams` is used for cities, communities, guides and published
listings so the first request is never a cold render.

## Route map

```
app/
├─ (marketing)/
│  ├─ layout.tsx                          header + footer + compliance footer
│  ├─ page.tsx                            Home
│  ├─ about/page.tsx                      About Krisi Kakarova
│  ├─ search/
│  │  ├─ page.tsx                         Central Florida Home Search
│  │  └─ new-construction/page.tsx        pre-filtered new-construction search
│  ├─ listing/[slug]/page.tsx             Listing detail
│  ├─ sold/page.tsx                       Recently sold archive
│  ├─ lake-mary/
│  │  ├─ page.tsx                         Flagship city hub
│  │  ├─ homes-for-sale/page.tsx          Lake Mary Homes for Sale
│  │  ├─ communities/page.tsx             Lake Mary Communities index
│  │  └─ blog/[slug]/page.tsx             Lake Mary articles
│  ├─ [city]/
│  │  ├─ page.tsx                         Longwood / Sanford / Casselberry / Orlando /
│  │  │                                   Altamonte Springs / Winter Springs / Oviedo
│  │  └─ homes-for-sale/page.tsx
│  ├─ communities/[slug]/page.tsx         Heathrow and other neighborhoods
│  ├─ guides/
│  │  ├─ va-home-buyer/page.tsx
│  │  └─ page.tsx                         guides index
│  ├─ assumable-mortgage-homes/page.tsx
│  ├─ new-construction-representation/page.tsx
│  ├─ sell-your-central-florida-home/page.tsx
│  ├─ market-updates/
│  │  ├─ page.tsx
│  │  └─ [slug]/page.tsx
│  ├─ reviews/page.tsx
│  ├─ contact/page.tsx
│  └─ legal/
│     ├─ privacy/page.tsx
│     ├─ terms/page.tsx
│     └─ accessibility/page.tsx
├─ (admin)/
│  ├─ layout.tsx                          sidebar shell, force-dynamic
│  ├─ login/page.tsx
│  └─ admin/
│     ├─ page.tsx                         Dashboard
│     ├─ listings/{page,new,[id]/edit}
│     ├─ articles/{page,new,[id]/edit}
│     ├─ cities/{page,[id]/edit}
│     ├─ communities/{page,[id]/edit}
│     ├─ leads/page.tsx
│     ├─ media/page.tsx
│     ├─ reviews/page.tsx
│     └─ settings/page.tsx
├─ api/
│  ├─ admin/upload/route.ts               Node runtime, sharp
│  ├─ admin/media/[key]/route.ts          DELETE
│  ├─ leads/route.ts                      public POST, rate-limited
│  ├─ saved-searches/route.ts
│  ├─ revalidate/route.ts                 on-demand ISR, secret-guarded
│  └─ cron/
│     ├─ purge-sold-photos/route.ts       daily
│     ├─ orphan-media/route.ts            daily
│     └─ keepalive/route.ts               daily, prevents Supabase pause
├─ robots.ts
├─ sitemap.ts
├─ llms.txt/route.ts
├─ opengraph-image.tsx
└─ globals.css                            @theme tokens live here
```

### Why `[city]` is a dynamic segment but `lake-mary` is not

Lake Mary is the flagship. It gets a hub with sub-routes (`/communities`,
`/blog`) that other cities do not have, so it earns a literal segment. Next.js
matches static segments before dynamic ones, so `/lake-mary` resolves to the
hub and `/longwood` resolves to `[city]`. `generateStaticParams` for `[city]`
must **exclude** `lake-mary` to avoid a duplicate route.

### Cities vs communities

Two distinct concepts, resolved from the client's overlapping lists:

- **City** — an incorporated municipality with a landing page and a
  homes-for-sale page. Seeded: Lake Mary, Longwood, Sanford, Casselberry,
  Orlando, Altamonte Springs, Winter Springs, Oviedo.
  Only the first five have `in_search = true`, matching the client's brief.
- **Community** — a neighborhood or CDP inside a city, e.g. Heathrow inside the
  Lake Mary area. Communities have a `city_id`. `/lake-mary/communities` lists
  the communities whose `city_id` is Lake Mary.

This covers all seven "community pages" the client listed: three are cities that
already have landing pages, three more are cities added to the city table, and
Heathrow is a community under Lake Mary.

## Module boundaries

### `lib/supabase/`

```
server.ts     createServerClient()   — cookie-based, respects RLS
browser.ts    createBrowserClient()  — anon key only
service.ts    createServiceClient()  — service role, server-only, throws if imported client-side
middleware.ts session refresh helper
```

`service.ts` starts with a runtime guard:

```ts
if (typeof window !== 'undefined') {
  throw new Error('service client imported in a browser bundle')
}
```

### `lib/storage/`

```
types.ts               StorageProvider, StoredFile
providers/supabase.ts  active
providers/r2.ts        stub, implemented only if the 1 GB ceiling is hit
providers/local.ts     stub, for a future VPS move
index.ts               selects by STORAGE_DRIVER
```

```ts
export interface StoredFile {
  key: string      // "listings/a7f3x/p01"  — no extension, no size suffix
  width: number
  height: number
  bytes: number
  blurhash: string
}

export interface StorageProvider {
  upload(buf: Buffer, key: string, mime: string): Promise<void>
  deleteMany(keys: string[]): Promise<void>
  publicUrl(key: string): string
  list(prefix: string): Promise<string[]>
}
```

The DB stores the bare `key`. The full object path is
`${key}-${size}.webp`. URL construction is one helper and lives in
`lib/storage/url.ts`:

```ts
export const photoUrl = (p: Photo, size: 1600 | 800 | 400 = 1600) =>
  p.kind === 'external'
    ? p.url
    : `${process.env.NEXT_PUBLIC_MEDIA_URL}/${p.key}-${size}.webp`
```

`kind: 'external'` exists today purely so that a future MLS feed, whose photos
are hotlinked from the MLS CDN, needs no schema change.

### `lib/listings/`

```
types.ts               NormalizedListing, ListingProvider, SyncParams
providers/manual.ts    reads from our own tables
index.ts               registry
```

Even though there is only one provider today, all listing reads go through this
layer. When Stellar is added it becomes `providers/stellar.ts` plus a cron
route, and nothing downstream changes. See `11-mls-future.md`.

### `lib/queries/`

One file per entity: `listings.ts`, `articles.ts`, `cities.ts`,
`communities.ts`, `leads.ts`, `reviews.ts`, `media.ts`.

Rules:
- Each exported function takes plain arguments, never a Supabase client.
- Each returns a type from `types/domain.ts`.
- Read functions used by public pages use the RLS-respecting server client.
- Only admin actions and cron routes may use the service client.

### `lib/seo/`

```
metadata.ts     buildMetadata({ title, description, path, image, noindex })
jsonld.ts       one builder per schema type
breadcrumbs.ts
```

Every page exports `generateMetadata` that calls `buildMetadata`. No page
hand-writes a `<title>` or an OG tag.

## Auth

Supabase Auth, magic link only. No passwords to leak or reset.

Three layers, all required:

1. `middleware.ts` — refreshes the session, redirects unauthenticated users
   away from `/admin`, and stamps `X-Robots-Tag: noindex` on every non-production
   deployment.
2. Admin layout — server-side check that `profiles.role = 'admin'`. A signed-in
   non-admin gets a 403 page, not a redirect loop.
3. RLS — every write policy checks the role. Even a leaked anon key cannot
   write.

The `profiles` row is created by a Postgres trigger on `auth.users` insert with
`role = 'viewer'`. The single admin is promoted manually via SQL once. There is
no self-serve signup and no public registration route.

## Data flow: publishing a listing

```
Admin fills the tabbed form
  → client-side zod validation
  → images already uploaded during editing, form holds { key, w, h, alt, blur }
  → server action: re-validate with the same zod schema
  → insert/update listings row (service client)
  → insert media rows
  → revalidatePath('/listing/[slug]'), '/search', '/[city]/homes-for-sale', '/'
  → toast, redirect to the listing list
```

Images upload immediately on selection, not on form submit, so a large upload
never blocks the save. Media rows created during an abandoned draft are cleaned
up by the orphan cron.

## Redirect resolution

`redirects` is **not** consulted in middleware. Doing so would add a database
round trip to every request on the site to serve the rare case of a changed
slug.

Instead, a route that cannot find its record checks the table before rendering
`not-found`:

```ts
const listing = await getListingBySlug(slug)
if (!listing) {
  const target = await resolveRedirect(`/listing/${slug}`)
  if (target) redirect(target)      // 301, from the table
  notFound()
}
```

Cost on a normal request: zero. Cost on a miss: one indexed lookup. Hard rule 11
is still satisfied — a published URL never returns a bare 404.

---

## Error handling

- `app/error.tsx` and `app/not-found.tsx` are branded, never default Next.js.
- Route handlers return a consistent shape:
  `{ ok: false, error: { code, message } }`. Never leak a Postgres error string
  to the client.
- Every `lib/queries` read has a defined empty result; a page must render
  something meaningful when the database returns nothing.
- Admin mutations surface failures as a toast with a retry action, never a
  silent no-op.

## Performance budget

| Metric | Budget |
|---|---|
| LCP (mobile, 4G) | < 2.5 s |
| CLS | < 0.05 |
| INP | < 200 ms |
| First-load JS, marketing routes | < 120 kB gzipped |
| Largest image byte weight, above the fold | < 160 kB |
| Fonts | 2 families, variable, `display: swap`, self-hosted via `next/font` |

Enforcement: a CI check on bundle size, plus the Lighthouse pass in
`13-qa-checklists.md`.
