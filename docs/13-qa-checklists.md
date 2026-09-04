# 13 — QA Checklists

Run the relevant checklist before closing any phase. Nothing here is optional.

---

## 1. Per-page checklist

Every public page, before it is marked done.

### Content
- [ ] Exactly one `h1`; heading levels do not skip
- [ ] Unique title under 60 characters including the template suffix
- [ ] Meta description 140–158 characters, written for a human
- [ ] Canonical URL set
- [ ] JSON-LD present, correct type, validates
- [ ] Breadcrumb present (except home) and matching the `BreadcrumbList` markup
- [ ] Every image has meaningful alt text; decorative images have `alt=""`
- [ ] Internal links use descriptive anchors
- [ ] No lorem ipsum, no TODO, no placeholder copy

### Responsive
- [ ] No horizontal scroll at 360, 390, 414, 480, 768, 834, 1024, 1280, 1440
- [ ] Layout matches `04-responsive-spec.md` for this page
- [ ] Touch targets ≥ 44 x 44 px
- [ ] Text ≥ 16px in every input
- [ ] 200% zoom at 1280px reflows without clipping or overlap
- [ ] Landscape phone (844 x 390) usable
- [ ] Long content does not break layout: 90-char address, $12,500,000 price
- [ ] `sizes` attribute correct for every responsive image

### Accessibility
- [ ] axe-core: zero critical, zero serious
- [ ] Full keyboard pass; focus always visible and in logical order
- [ ] Focus trapped in every modal, sheet and lightbox; Escape closes; focus
      returns to the trigger
- [ ] Body scroll locked while a modal or sheet is open
- [ ] Landmarks present and labelled
- [ ] Forms labelled, errors linked via `aria-describedby`, `aria-invalid` set
- [ ] Live regions announce result counts and form status
- [ ] Contrast passes for every text/background pair
- [ ] Color is never the only carrier of meaning
- [ ] `prefers-reduced-motion` respected

### States
- [ ] Loading skeleton matches final dimensions
- [ ] Empty state designed, with a next action
- [ ] Error state designed, with a retry
- [ ] Every interactive element has hover, active, focus-visible, disabled

### Performance
- [ ] LCP element identified and marked `priority`
- [ ] CLS < 0.05 — every image and async block has reserved dimensions
- [ ] No render-blocking third-party script
- [ ] Fonts do not cause a visible reflow

---

## 2. RLS test script

Run at the end of Phase 1 and again before launch.
`npm run test:rls`, using the **anon key only**.

```ts
// scripts/test-rls.ts
import { createClient } from '@supabase/supabase-js'

const anon = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const TABLES = ['listings','cities','communities','articles','reviews',
                'leads','saved_searches','media','redirects','profiles','sync_log']

// 1. No writes anywhere
for (const t of TABLES) {
  const { error } = await anon.from(t).insert({} as never)
  assert(error, `FAIL: anon inserted into ${t}`)
}

// 2. No updates or deletes anywhere
for (const t of TABLES) {
  const { error: u } = await anon.from(t).update({} as never).neq('id', '')
  const { error: d } = await anon.from(t).delete().neq('id', '')
  assert(u && d, `FAIL: anon mutated ${t}`)
}
// (leads and saved_searches are the two exceptions for INSERT — assert those
//  succeed, and assert that SELECT on them returns zero rows)

// 3. No unpublished reads
const { data: drafts } = await anon.from('listings').select('id').eq('published', false)
assert(drafts?.length === 0, 'FAIL: anon read unpublished listings')

const { data: leads } = await anon.from('leads').select('id')
assert(leads?.length === 0, 'FAIL: anon read leads')

// 4. Published content IS readable
const { data: pub } = await anon.from('listings').select('id').eq('published', true)
assert((pub?.length ?? 0) > 0, 'FAIL: anon cannot read published listings')
```

Any failure is a launch blocker.

---

## 3. Responsive audit script

`npm run test:responsive` — Playwright, screenshots every page at every width
and asserts no horizontal overflow.

```ts
const WIDTHS = [360, 390, 414, 480, 768, 834, 1024, 1280, 1440]
const PAGES = ['/', '/search', '/search/new-construction', '/listing/<seed>',
               '/lake-mary', '/lake-mary/homes-for-sale', '/lake-mary/communities',
               '/communities/heathrow', '/longwood', '/guides/va-home-buyer',
               '/assumable-mortgage-homes', '/new-construction-representation',
               '/sell-your-central-florida-home', '/market-updates',
               '/about', '/reviews', '/contact', '/sold']

for (const path of PAGES) {
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto(BASE + path, { waitUntil: 'networkidle' })

    const overflow = await page.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth
    )
    expect(overflow, `${path} overflows at ${width}px`).toBe(false)

    await page.screenshot({ path: `shots/${slug(path)}-${width}.png`, fullPage: true })
  }
}
```

Review the screenshots by eye. The assertion catches overflow; only a human
catches "this is ugly at 768px".

---

## 4. Accessibility audit

`npm run test:a11y` — axe-core against every page type.

```ts
import AxeBuilder from '@axe-core/playwright'

const results = await new AxeBuilder({ page })
  .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
  .analyze()

const blocking = results.violations.filter(v =>
  v.impact === 'critical' || v.impact === 'serious')
expect(blocking).toEqual([])
```

Automated tooling catches roughly 30–40% of real issues. The manual pass is not
optional:

- [ ] Tab through every page with the mouse untouched
- [ ] Operate the filter sheet, the gallery lightbox and the mobile nav by
      keyboard alone
- [ ] Submit every form by keyboard, including error recovery
- [ ] VoiceOver on the home page, a listing page and the contact form
- [ ] Verify the search result count is announced when filters change
- [ ] Verify focus returns correctly after every modal closes
- [ ] Verify the skip link works and is the first focusable element

---

## 5. Performance audit

Lighthouse mobile, throttled, on: home, search, listing detail, city hub,
guide, article.

| Metric | Target |
|---|---|
| Performance | ≥ 90 |
| Accessibility | ≥ 95 |
| Best Practices | ≥ 95 |
| SEO | 100 |
| LCP | < 2.5 s |
| CLS | < 0.05 |
| TBT | < 200 ms |

If Performance is short, check in this order:

1. Is the LCP image `priority` with a correct `sizes`?
2. Are three variants actually being generated, and is the card loading the
   800w rather than the 1600w?
3. Is `images.loader: "custom"` set, and are there zero `/_next/image` requests
   in the network panel? (If not, Vercel is transforming and may be
   failing.)
4. Is any client component doing work that belongs on the server?
5. Bundle size — run `@next/bundle-analyzer`
6. Is a font blocking render?

---

## 6. SEO audit

- [ ] `curl -s <url> | grep "<h1"` returns real content on every page type
- [ ] `robots.txt` lists every AI bot with `Allow: /`
- [ ] `/llms.txt` accurate and current
- [ ] `sitemap.xml` contains every published URL and no drafts
- [ ] Every page validates in Google's Rich Results Test
- [ ] Every page validates in the schema.org validator
- [ ] No duplicate titles or descriptions across the site
- [ ] Canonicals correct, especially on filtered search URLs
- [ ] OG images render for listing, article, city and home
- [ ] No `noindex` on any page that must be indexed
- [ ] Every changed slug 301s from the old URL
- [ ] 404 page returns a real 404 status, not 200
- [ ] Internal linking: no orphan page; every page reachable within 3 clicks

---

## 7. Functional test matrix

| Flow | Steps | Expected |
|---|---|---|
| Search by city | Select Lake Mary, apply | URL updates, results filtered, count correct |
| Price range | Set 400k–700k | Only listings in range; chip shows the range |
| New construction toggle | Enable | Only `new_construction`; canonical points to `/search/new-construction` |
| Combine filters | City + beds + type | All applied; each removable individually |
| Zero results | Impossible combination | Empty state with three recovery actions |
| Back button | Apply 3 filters, press back 3 times | Each step restores correctly |
| Share URL | Copy a filtered URL into a new tab | Same results |
| Listing detail | Open from a card | Correct listing, gallery works |
| Lightbox | Open, arrow through, Escape | Focus trapped, returns to trigger |
| Showing request | Submit from a listing | Lead row created with `listing_id`; both emails sent |
| Contact form | Submit | Lead row, both emails, inline success |
| Listing alerts | Submit email | `saved_searches` row, confirmation email, double opt-in works |
| Admin: add listing | Full flow with 15 photos | Published, visible on the site within seconds |
| Admin: 16th photo | Attempt | Rejected in UI, API and DB |
| Admin: publish without alt text | Attempt | Blocked with the specific photos named |
| Admin: mark sold | Set sold + date | `purge_after` set to +7 days; note shown |
| Purge cron | Run against a past-due sold listing | 1600 and 800 deleted, 400 kept, page still live |
| Admin: change slug | Edit a published slug | Redirect row created; old URL 301s |
| Admin: delete listing | Confirm by typing the address | Row and all storage objects deleted |
| Orphan cron | Upload then abandon a draft, wait, run | Object deleted, bytes reclaimed |
| Auth | Magic link | Login works; expired link fails gracefully |
| Auth | Direct `/admin` while logged out | Redirect to login, then back to the intended page |
| Auth | Non-admin signed in | 403 page, not a redirect loop |

---

## 8. Cross-browser and device

| Target | Priority |
|---|---|
| Chrome desktop, latest | Must |
| Safari macOS, latest | Must |
| Safari iOS, latest 2 versions | **Must — most likely to break** |
| Chrome Android | Must |
| Firefox desktop | Should |
| Edge desktop | Should |
| Samsung Internet | Nice |

iOS Safari specifically:

- [ ] `100vh` not used; hero heights correct with the address bar visible and
      hidden
- [ ] Sticky elements behave (header, filter bar, contact card)
- [ ] No input zoom on focus
- [ ] `env(safe-area-inset-bottom)` respected on sticky bottom bars
- [ ] Momentum scrolling works in horizontal scroll containers
- [ ] `backdrop-filter` on the header does not cause a flicker
- [ ] Date inputs render acceptably in the admin

Real device testing is required for at least one iPhone and one Android. A
simulator does not reproduce iOS Safari's viewport behavior.

---

## 9. Pre-launch master checklist

### Technical
- [ ] All phase DoDs passed
- [ ] Responsive script clean across every page and width
- [ ] Accessibility script clean; manual pass done
- [ ] Lighthouse targets met on every page type
- [ ] RLS test passes
- [ ] No secrets in the client bundle (`grep -r "SERVICE_ROLE" .next/static`)
- [ ] All crons verified running in production
- [ ] Error monitoring live
- [ ] Uptime monitoring live
- [ ] Backups running; **a restore has actually been tested**

### Content
- [ ] Real listings loaded with real photos and alt text
- [ ] Real headshot and brand photography
- [ ] Bio published in full
- [ ] Every city page has genuine content, not a template
- [ ] All four guides complete
- [ ] Reviews loaded with permission
- [ ] Contact details correct everywhere and byte-identical
- [ ] No placeholder text anywhere (grep for `lorem`, `TODO`, `xxx`,
      `example.com`)

### Compliance
- [ ] Every box in `09-compliance-legal.md` § 9
- [ ] Broker at World Properties Group has reviewed and approved
- [ ] Client has acknowledged the Stellar MLS deferral in writing

### SEO
- [ ] Search Console verified, sitemap submitted
- [ ] Bing Webmaster Tools verified, sitemap submitted
- [ ] `robots.txt` and `/llms.txt` live and correct
- [ ] Structured data validated on every page type
- [ ] Off-site profile checklist handed to the client

### Handover
- [ ] Admin guide written
- [ ] Client trained; she has added a listing herself, unaided
- [ ] Credentials transferred to accounts in her name
- [ ] Monthly maintenance list delivered
- [ ] Costs and exclusions stated in writing

---

## 10. Post-launch week one

- [ ] Day 1: GSC shows crawling started
- [ ] Day 1: submit the home page and key pages for indexing
- [ ] Day 2: check server logs for AI bot hits
- [ ] Day 3: verify Core Web Vitals field data is collecting
- [ ] Day 5: confirm every cron ran successfully
- [ ] Day 7: check storage growth against the projection
- [ ] Day 7: run the eight target queries against ChatGPT, Perplexity and
      Claude; record the baseline in a sheet
- [ ] Day 7: review any leads received and confirm delivery worked end to end
