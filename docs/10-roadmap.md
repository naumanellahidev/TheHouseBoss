# 10 — Roadmap

Eight phases. **One phase per Claude Code session.** Each phase has entry
conditions, a task list, and a Definition of Done that must fully pass before
the next phase begins.

Update `PROGRESS.md` at the end of every session.

---

## Dependency graph

```
P0 Foundation ──┬─→ P1 Data layer ──→ P2 Admin + images ──→ P3 Public listings ─┐
                │                                                               │
                └─→ (design system unblocks all UI work)                        │
                                                                                ▼
                    P4 Content system ──→ P5 Guides & pages ──→ P6 SEO/AI ──→ P7 QA & launch
```

P4 depends on P1 only, not on P3 — content work can run in parallel with
listings if a second session is available. Everything else is strictly serial.

---

## Phase 0 — Foundation and design system

**Goal:** a running app whose visual language is finished, so that no page has
to be redesigned later.

**Entry:** repository created, docs reviewed.

### Tasks

1. `create-next-app` — Next.js 16, TypeScript strict, App Router, ESLint
2. Tailwind v4; port the entire `@theme` block from `03-design-system.md` §10
3. `next/font` — Fraunces and Inter, variable, `display: swap`
4. shadcn/ui init; generate Button, Input, Select, Dialog, Sheet, Tabs,
   Accordion, Toast, Badge, Skeleton, Table, DropdownMenu
5. Rewrite generated shadcn color classes to semantic tokens, once
6. Build `components/site/`: Header, MobileNav, Footer, **ComplianceFooter**,
   Logo, Breadcrumbs, Container, Section
7. Build primitives: EmptyState, StatTiles, FaqAccordion, LeadForm shell,
   ResponsiveTable, PropertyImage
8. Marketing layout, admin layout shell
9. `app/error.tsx`, `app/not-found.tsx`, `app/loading.tsx` — all branded
10. Placeholder assets: `placeholder-property.webp`, `og-default.png`,
    Equal Housing Opportunity SVG, favicon set
11. **Style guide route** `/dev/styleguide` (dev-only, `noindex`) rendering
    every token, every component, every state
12. Prettier, ESLint, `tsconfig` paths, `.env.example`
13. Playwright installed with the responsive screenshot script from
    `13-qa-checklists.md`

### Definition of Done

- [ ] `/dev/styleguide` renders every token and every component state
- [ ] Header and footer correct at 360 / 480 / 768 / 1024 / 1440
- [ ] Mobile nav sheet: focus trapped, Escape closes, body scroll locked
- [ ] `<ComplianceFooter />` present with brokerage name sized ≥ agent name
- [ ] No hex literal anywhere outside `globals.css` (grep clean)
- [ ] Lighthouse on the styleguide: Accessibility 100
- [ ] `prefers-reduced-motion` verified
- [ ] Fonts self-hosted, no layout shift on load

**Do not start P1 until the client has approved the visual direction.** Send
screenshots of the styleguide and the header/footer at three widths.

---

## Phase 1 — Data layer

**Goal:** the database exists, is secure, and is typed.

**Entry:** P0 done.

### Tasks

1. Create the Supabase project; record the region (choose `us-east-1`)
2. Write migrations 001–010 exactly as specified in `02-database-schema.md`
3. Create the `media` storage bucket with its policies
4. Seed: 8 cities, Heathrow community, one admin profile
5. Seed 6 realistic sample listings across 4 cities, with real photos, so every
   downstream phase has something to render
6. `supabase gen types` → `types/database.ts`; hand-write `types/domain.ts`
7. `lib/supabase/{server,browser,service,middleware}.ts` with the
   browser-import guard on `service.ts`
8. `lib/queries/*` for cities, communities, listings, articles
9. `lib/storage/` adapter with the Supabase provider, R2 and local stubs
10. `lib/validation/` zod schemas for listing, article, lead, search params
11. Write and run the **RLS test script** from `13-qa-checklists.md`

### Definition of Done

Split into what can be checked without a database and what cannot. Everything
in the second group needs either Docker (for `supabase start`) or a cloud
project — see `supabase/README.md`.

**Checkable without a database**

- [ ] Every query function returns a domain type, not a raw row
- [ ] `npm run typecheck` and `npm run lint` clean
- [ ] `grep -r "SERVICE_ROLE" app/ components/` returns nothing
- [ ] `lib/storage/` is the only module importing the Storage SDK
- [ ] `lib/listings/` exists with the provider interface intact
- [ ] Migration order is valid by inspection: functions before RLS, no forward
      references, `is_admin()` defined before any policy calls it

**Needs a live database — blocking**

- [ ] `supabase db push` (or `db reset`) applies all ten migrations to an empty
      database with no errors
- [ ] Seed applies; 8 cities, Heathrow and 6 listings present
- [ ] `listing_facets` returns sensible rows for the seed data
- [ ] `npm run test:rls` passes: anon cannot write anywhere, cannot read a draft
      or a lead, and *can* read published content
- [ ] `npm run db:types` regenerates `types/database.ts` (it is a placeholder
      until then) and it is committed
- [ ] The purge-due seed listing shows a past `purge_after`, ready for Phase 2

---

## Phase 2 — Admin dashboard and image pipeline

**Goal:** the client can add a listing with photos, end to end. This is the
single highest-risk phase; it is also the one that makes every later phase
possible.

**Entry:** P1 done.

### Tasks

1. Supabase Auth magic link; `/admin/login`
2. `middleware.ts` guard on `/admin/:path*`
3. Admin layout: sidebar, icon rail, mobile drawer, storage meter
4. Dashboard with stat tiles and the **Needs attention** panel
5. **Image pipeline** — `/api/admin/upload`: auth, rate limit, mime allowlist,
   size cap, `sharp` 1600/800/400 WebP, blurhash, EXIF strip, `media` row
6. Uploader component: drag-drop, 15-photo counter, reorder, cover select,
   per-photo alt text, per-file progress and retry
7. Listings list: table, filters, search, sort, bulk actions, duplicate,
   card list below 768px
8. Listing editor: six tabs, autosave, unsaved-changes guard, pre-publish
   checklist, sticky action bar
9. Sold flow: sold date and price fields, `keep_photos`, the plain-language note
10. Leads inbox: list/detail, status, notes, CSV export
11. Media library: grid, orphans tab, storage summary, blocked-delete guard
12. Settings: contact, profiles, site, compliance, notifications
13. Cron routes: `purge-sold-photos`, `orphan-media`, `keepalive`
14. Resend: lead notification and autoresponder templates
15. `revalidatePath` on every mutation

### Definition of Done

- [ ] A listing can be created with 15 photos and published, start to finish
- [ ] The 16th photo is rejected in the UI, in the API, and by the DB constraint
- [ ] Every uploaded photo produces exactly three objects plus one `media` row
- [ ] No original is stored anywhere — verified in the bucket
- [ ] Publish is blocked until the pre-publish checklist passes
- [ ] Autosave recovers a draft after a hard reload
- [ ] The sold purge cron runs against a seeded past-due listing and frees the
      expected bytes while keeping the 400w
- [ ] The orphan cron finds and deletes a deliberately orphaned object
- [ ] Storage meter matches `storage_usage()`
- [ ] Leads inbox and listings list usable at 360px
- [ ] A lead submission sends both emails
- [ ] Every destructive action requires confirmation

---

## Phase 3 — Public listings and search

**Goal:** visitors can find and view properties.

**Entry:** P2 done, seed listings published.

### Tasks

1. `PropertyCard` with every status variant and a matching skeleton
2. `/search` — searchParams parsing, query builder, sort, pagination
3. Filter bar: desktop inline, mobile sheet, chips, live count, facet-driven
   options with disabled zero-count entries
4. `/search/new-construction` with its content block
5. `/listing/[slug]` — all 11 sections from `05-page-specs.md`
6. Gallery: carousel, thumbnail grid, lightbox with focus trap and keyboard
7. Sticky contact card (desktop) and sticky action bar (mobile)
8. "The Contractor's Take" callout
9. Sold listing rendering, including the `photos_purged` state
10. `/sold` archive with city filter
11. `/[city]/homes-for-sale` and `/lake-mary/homes-for-sale`
12. Similar listings
13. Every empty state: zero results, no photos, no description, city with no
    listings
14. `redirects` table consulted in middleware
15. On-demand revalidation wired to admin publish

### Definition of Done

- [ ] Every filter combination produces a shareable, working URL
- [ ] Browser back and forward restore filter state correctly
- [ ] Zero-result state offers the three recovery actions
- [ ] Filter options come from `listing_facets`; nothing is hardcoded
- [ ] A sold listing's URL still resolves after purge
- [ ] Gallery is fully keyboard-operable; focus returns on lightbox close
- [ ] Result count announced via `aria-live`
- [ ] 3-column desktop, 1-column mobile, no overflow at 360px
- [ ] Lighthouse on a listing page: Performance ≥ 90 mobile, CLS < 0.05
- [ ] Editing a slug creates a redirect and the old URL 301s

---

## Phase 4 — Content system, city hubs and communities

**Goal:** the client can publish articles; every city and community page exists.

**Entry:** P1 done (P3 not required).

### Tasks

1. Tiptap editor with the specified toolbar, image upload, and the
   `body_text` flattening trigger
2. Article list and editor in admin, with preview by draft token
3. `/lake-mary` hub — all nine sections
4. `/lake-mary/blog` and `/lake-mary/blog/[slug]`
5. `/lake-mary/communities` and `/communities/[slug]`
6. `/[city]` for the remaining seven cities, excluding `lake-mary` from
   `generateStaticParams`
7. City stats form in admin (a real form, never a JSON textarea)
8. FAQ repeater in admin, feeding both the accordion and `FAQPage`
9. `/market-updates` and `/market-updates/[slug]`
10. Rich-text renderer with responsive table wrapping and image handling
11. Reading time, table of contents, share buttons

### Definition of Done

- [ ] An article can be written, previewed, published and revalidated
- [ ] Tiptap images route through the same upload pipeline
- [ ] Every one of the 8 cities has a live page with content
- [ ] Heathrow community page live
- [ ] FAQ accordion text and `FAQPage` markup are identical
- [ ] City stats display an "as of" date
- [ ] Article body respects the 68ch measure and reads well at 360px
- [ ] Long tables inside articles scroll rather than overflow

---

## Phase 5 — Guides and remaining pages

**Goal:** the authority content that actually drives AI visibility exists.

**Entry:** P4 done.

### Tasks

1. `/guides/va-home-buyer` — full spec from `05-page-specs.md`
2. `/assumable-mortgage-homes`, including the live assumable-listings block
3. `/new-construction-representation`, with the "register before your first
   visit" callout
4. `/sell-your-central-florida-home` with the valuation form
5. `/about` — the full bio, structured, plus the credentials card
6. `/reviews`
7. `/contact`
8. `/legal/privacy`, `/legal/terms`, `/legal/accessibility`
9. Guide layout: sticky TOC desktop, progress bar and collapsible TOC mobile
10. Inline lead-capture blocks with the correct `lead_type` per page
11. Disclaimer components placed per the table in `09-compliance-legal.md`
12. `/guides` index

### Definition of Done

- [ ] Each guide is at least 1,500 words of genuine, specific content
- [ ] Every section opens with a direct answer sentence
- [ ] Headings are question-shaped where natural
- [ ] TOC works on both mobile and desktop, with correct scroll offsets
- [ ] Lead forms submit with the correct `lead_type`
- [ ] Every required disclaimer is present
- [ ] The About page uses the client's bio in full, subheaded
- [ ] Accessibility statement is genuine, dated, with a working contact route

---

## Phase 6 — SEO and AI visibility layer

**Goal:** everything from `08-seo-ai-visibility.md` is live and validated.

**Entry:** P5 done.

### Tasks

1. `lib/seo/metadata.ts`; wire `generateMetadata` on every route
2. `lib/seo/jsonld.ts`; every schema type
3. `app/robots.ts` with the full AI-bot allowlist
4. `app/sitemap.ts`, database-driven
5. `app/llms.txt/route.ts`, database-driven
6. Dynamic OG images for listings and articles via `next/og`
7. `BreadcrumbList` on every page, from the same source as the visible component
8. Canonicals, including the `noindex, follow` rule for filtered search
9. Internal-linking pass: every guide links to relevant cities and listings;
   every city links to its guides and communities
10. 404 page with search and popular links
11. `sameAs` wired from Settings
12. Google Search Console and Bing Webmaster Tools verification
13. Submit both sitemaps
14. Give the client the off-site corroboration checklist

### Definition of Done

- [ ] Every page validates in Google's Rich Results Test with no errors
- [ ] `curl` on five representative pages shows full content in the HTML source
- [ ] `robots.txt` lists every AI bot with `Allow: /`
- [ ] `/llms.txt` is accurate and regenerates from the database
- [ ] Sitemap contains every published URL and no draft
- [ ] Every page has a unique title under 60 chars and a description of 140–158
- [ ] OG images render for a listing, an article, a city and the home page
- [ ] Sitemap accepted by Google Search Console and Bing
- [ ] No `noindex` on any page that should be indexed — asserted in a build check

---

## Phase 7 — QA, compliance and launch

**Goal:** ship it.

**Entry:** P6 done.

### Tasks

1. Full responsive audit of every page at all nine widths
2. Full keyboard pass
3. axe-core on every page type
4. Screen-reader spot check: home, search, listing, contact form
5. Lighthouse on all page types, mobile and desktop
6. Cross-browser: Chrome, Safari (macOS and iOS), Firefox, Edge
7. Real-device check on at least one iPhone and one Android
8. The compliance checklist from `09-compliance-legal.md`, every box
9. **Broker review** of the site
10. Load the client's real content: listings, photos, bio, headshot, reviews
11. Domain: point Porkbun DNS at Vercel, verify SSL
12. Resend domain verification: SPF, DKIM, DMARC
13. Cron jobs verified running in production
14. Error monitoring and uptime check
15. Backup procedure documented and tested (`12-env-deployment.md`)
16. Analytics installed
17. Client training session plus a written admin guide
18. Post-launch monitoring plan

### Definition of Done

- [ ] Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices
      ≥ 95, SEO 100 on home, search, listing, city and guide pages
- [ ] Zero axe-core critical or serious violations on any page
- [ ] No horizontal scroll at 360px on any page
- [ ] Every form works and sends both emails
- [ ] Every cron ran successfully at least once in production
- [ ] Broker sign-off received
- [ ] Client trained and comfortable adding a listing unaided
- [ ] Backups running and a restore has been tested
- [ ] DNS, SSL and email authentication all green

---

## Post-launch (first 90 days)

| When | Action |
|---|---|
| Day 1 | Verify indexation has begun in GSC and Bing |
| Week 1 | Watch server logs for AI bot hits; fix anything they cannot reach |
| Week 2 | Run the eight target queries against ChatGPT, Perplexity and Claude; record the baseline |
| Month 1 | First market update published; review Core Web Vitals in the field |
| Month 1 | Confirm the off-site profile checklist is complete |
| Month 2 | Two more guides or comparison articles |
| Month 3 | Re-run the assistant queries; compare against the baseline |
| Month 3 | Storage review and growth projection |
| Ongoing | Monthly content, quarterly accessibility re-check |

---

## Time estimates

Working sessions, not calendar days. Assumes one focused Claude Code session per
phase, with review between.

| Phase | Sessions |
|---|---|
| P0 Foundation | 2–3 |
| P1 Data layer | 1–2 |
| P2 Admin and images | 4–5 |
| P3 Public listings | 3–4 |
| P4 Content system | 3–4 |
| P5 Guides and pages | 3–4 (content writing dominates) |
| P6 SEO and AI | 2 |
| P7 QA and launch | 2–3 |
| **Total** | **20–27 sessions** |

The two biggest risks to this estimate are (a) the client's content and photos
arriving late, and (b) scope creep on the admin dashboard. Collect content
during P0 and P1, in parallel with the build.
