# CLAUDE.md — The House Boss FL

> Read this file **completely** at the start of every session. It is the single
> source of truth for constraints. When this file and any other doc disagree,
> **this file wins** — then fix the other doc.

---

## 1. What this project is

A real-estate website plus a custom admin dashboard for **Krisi Kakarova**, a
licensed Realtor and Certified Residential Building Contractor in Central
Florida, operating as **"The House Boss — Powered by World Properties Group"**.

- **Domain:** `thehousebossfl.com` (registered at Porkbun)
- **Primary business goal:** be discoverable and citable by **AI search**
  (ChatGPT / OAI-SearchBot, Perplexity, Claude, Google AI Overviews), not just
  classic SEO.
- **Primary user action:** property search, including a dedicated
  **new-construction** search.
- **Positioning line — use verbatim in metadata and hero copy:**
  > Lake Mary Realtor specializing in VA buyers, assumable mortgages and
  > new-construction representation.

Full brief: `docs/00-project-brief.md`.
Original client message, unedited: `docs/client-brief-original.md`.

---

## 2. Stack (locked — do not substitute)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (16.3.3), App Router, TypeScript strict |
| Hosting | Vercel **Pro** (Hobby forbids commercial use) |
| Database + Auth | Supabase **free tier** (Postgres 500 MB) |
| File storage | Supabase Storage (1 GB) behind a storage adapter |
| Styling | Tailwind CSS v4 + shadcn/ui |
| Rich text | Tiptap, stored as JSON in Postgres |
| Transactional email | Resend (3,000/mo free) |
| Search | Postgres full-text search + a facets view. No Algolia, no Elastic. |
| Forms | react-hook-form + zod |
| Images | `sharp` server-side, `browser-image-compression` client-side |

Do not add a dependency that duplicates something in this table. Do not add a
client state-management library — server components plus URL state cover this
application.

---

## 3. HARD RULES

Each of these was decided deliberately. Breaking one costs real money, real
storage, or real search visibility. Never "improve" past them.

### Images

1. **Never store a full image URL in the database.** Store only the immutable
   `key`. Build the URL at runtime from `NEXT_PUBLIC_MEDIA_URL` + key + size.
2. **Never persist the original upload.** Only the three derivatives
   (1600 / 800 / 400 WebP) are written to storage.
3. **Maximum 15 photos per listing**, enforced in three places: the uploader UI,
   the upload API route, and a Postgres `CHECK` constraint.
4. Image keys come from `nanoid()`, never from the address or title — editing an
   address must never break an image URL.
5. `next.config.ts` sets `images.unoptimized: true`. We pre-generate sizes;
   Vercel's transformation quota must not be consumed.
6. Every image has an `onError` fallback to `/placeholder-property.webp`. A
   broken-image icon must never render.
7. Width and height are stored in the DB and always passed to the image
   component. Cumulative Layout Shift target is 0.

### Storage discipline (1 GB hard ceiling)

8. All storage access goes through `lib/storage/index.ts`. No component and no
   route handler talks to the Supabase Storage SDK directly.
9. Every stored object gets a row in the `media` table. Orphans are removed by
   the daily cron.
10. Sold listings: **7 days after `sold_at`**, delete the 1600w and 800w
    derivatives and **keep the 400w**. Never delete the listing row and never
    delete the page.

### SEO and AI visibility

11. A published listing URL is permanent. If a route must change, add a 301 to
    the `redirects` table. Never return 404 for a slug that was once published.
12. Every public page ships JSON-LD. Exact schema per page type is in
    `docs/08-seo-ai-visibility.md`.
13. `robots.txt` explicitly allows `OAI-SearchBot`, `ChatGPT-User`, `GPTBot`,
    `PerplexityBot`, `ClaudeBot` and `Google-Extended`. It disallows `/admin`.
14. `/llms.txt` exists at the root and is regenerated whenever site structure
    changes.

### Legal and compliance (Florida)

15. The compliance footer renders on **every** public page: Krisi Kakarova ·
    Licensed Real Estate Agent **SL3327932** · Certified Residential Contractor
    **CRC1335654** · **World Properties Group**.
16. Per FREC advertising rules the **brokerage name must render at a font size
    equal to or larger than the agent's name**. This is enforced by a single
    `<ComplianceFooter />` component — never re-implement it inline.
17. Fair Housing and Equal Housing Opportunity marks appear in the footer.
18. Target **WCAG 2.1 AA**. Accessibility litigation against real-estate sites
    is common. This is not optional polish.

### Data and query layer

19. Route handlers and server components never build Supabase queries inline.
    Everything goes through `lib/queries/*`, which returns **normalized domain
    types**, never raw table rows.
20. `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in a client
    component, in a `NEXT_PUBLIC_*` variable, or in a log line.
21. RLS is enabled on every table. The public role reads only `published = true`
    rows. Writes require `role = 'admin'`.
22. Search filter options are derived from the `listing_facets` view. Never
    hardcode a dropdown of cities, price bands or property types.

### Design

23. Design tokens live in exactly one place: the `@theme` block in
    `app/globals.css`. No hex literal, no arbitrary pixel value and no one-off
    font size inside a component. If a token is missing, add it to the theme
    first.
24. Mobile-first. Every screen is built and verified at
    **360 / 480 / 768 / 1024 / 1440** before it is considered done.
25. Minimum interactive target 44 x 44 px. Minimum body text 16 px on mobile,
    which also prevents iOS input zoom.

---

## 4. Repository layout

```
app/
  (marketing)/            public site, shared marketing layout
  (admin)/admin/          protected dashboard, force-dynamic
  api/
components/
  ui/                     shadcn primitives — do not hand-edit generated files
  site/                   header, footer, nav, compliance footer
  listing/                cards, gallery, filters, map
  admin/                  dashboard-only components
lib/
  supabase/               server / browser / service clients
  storage/                adapter plus providers (supabase | r2 | local)
  listings/               provider abstraction (manual today, MLS later)
  queries/                all data access, returns domain types
  seo/                    metadata and JSON-LD builders
  validation/             zod schemas shared by forms and API routes
  utils/
types/
  database.ts             generated by `supabase gen types`
  domain.ts               hand-written normalized types
supabase/
  migrations/
  seed.sql
docs/
```

---

## 5. Conventions

- Files and folders `kebab-case`; React components `PascalCase`; hooks
  `useThing`; types `PascalCase` with no `I` prefix.
- Server components by default. Add `'use client'` only for interactivity and
  push it as far down the tree as possible.
- Every data-fetching function lives in `lib/queries/` and is typed against
  `types/domain.ts`.
- One zod schema per form, shared by the client form and the API route. Never
  validate in only one place.
- Money is `numeric` in Postgres and is formatted through a single
  `formatPrice()` helper. Never inline `toLocaleString`.
- Dates are stored as `timestamptz` and formatted through `lib/utils/date.ts` in
  the `America/New_York` timezone.
- Commit style: `phase(scope): message`, e.g. `p2(admin): listing form media tab`.

---

## 6. Working method

- **One phase per session.** Phases are defined in `docs/10-roadmap.md`. Do not
  start phase N+1 in the session that finished phase N.
- Load the `design-system` skill before writing UI.
  Run the `responsive-audit` skill before closing a page.
  Run the `phase-review` skill before closing a phase.
- Update `PROGRESS.md` at the end of every session: what shipped, what is open,
  what the next session needs to know.
- If a decision is not covered by these docs, write the decision into the
  relevant doc **before** implementing it.

---

## 7. Deliberate deviations from the client's brief

The client wrote *"Stellarmls is for the search results."* We are **not**
integrating Stellar MLS at this stage. Rationale and migration path:
`docs/11-mls-future.md`. Summary:

- Stellar MLS IDX access is granted to the **brokerage**, not to an individual
  agent, and realistically takes 2–4 weeks of paperwork and compliance review.
- MLS display rules commonly restrict AI crawling of listing data, which works
  directly against the client's stated primary goal.
- Listings we own outright are fully AI-crawlable, which serves that goal better.

The schema already carries `source`, `source_id`, `mls_number`, `synced_at`,
`is_locked` and `raw`. Adding Stellar later is one provider file plus one cron
route. **Do not remove those columns.**

This deviation must be put to the client in writing before launch. Tracked in
`PROGRESS.md` under Open Client Decisions.
