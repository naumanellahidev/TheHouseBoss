# 06 — Admin Dashboard Specification

The admin dashboard is the **only** source of listing data. If it is awkward,
the site stays empty. Treat it as a product, not as an afterthought.

Route group `(admin)`, all routes `force-dynamic` and `noindex`.

---

## 1. Access

- Supabase Auth, **magic link only**. No passwords.
- Three enforcement layers (middleware → server layout role check → RLS). See
  `01-architecture.md` § Auth.
- No public signup route. The single admin is promoted once by SQL.
- Session lifetime 7 days, refreshed on activity.
- A signed-in non-admin sees a plain 403 page, not a redirect loop.

**Login screen:** brand lockup, one email field, "Send magic link". After
submit, the form is replaced by "Check your email" — do not clear the form and
leave the user guessing. Rate limit 3 requests per email per 15 minutes.

---

## 2. Shell

```
┌────────────┬──────────────────────────────────────────┐
│  THB       │  Page title            [View site] [👤]  │
│            ├──────────────────────────────────────────┤
│ Dashboard  │                                          │
│ Listings   │   content                                │
│ Articles   │                                          │
│ Cities     │                                          │
│ Communities│                                          │
│ Reviews    │                                          │
│ Leads  (3) │                                          │
│ Media      │                                          │
│ Settings   │                                          │
│            │                                          │
│ ─────────  │                                          │
│ Storage    │                                          │
│ ▓▓▓▓░░ 62% │                                          │
└────────────┴──────────────────────────────────────────┘
```

- Sidebar 240px at ≥1024px, 64px icon rail at 768–1023px, drawer below 768px.
- Leads badge shows the count of `status = 'new'`.
- Storage meter is always visible in the sidebar — it is the constraint that
  will actually bite, so it stays in her line of sight.
- "View site" opens the public site in a new tab.

---

## 3. Dashboard (`/admin`)

Stat tiles: New leads (7d) · Published listings · Active listings · Draft
listings · Published articles · Storage used.

Then:

- **Recent leads** — five newest, name, type, city, time, one-click "Mark
  contacted".
- **Storage detail** — used of 1 GB, broken down by listings / articles / other,
  plus "Next purge: 3 listings on Sep 12, frees 8.5 MB".
- **Needs attention** — a computed list:
  - listings sold more than 7 days ago that have not purged
  - published listings with fewer than 5 photos
  - listings missing `meta_desc`
  - articles in draft for more than 30 days
  - cities with no published content
  - photos missing alt text
- **Quick actions** — Add Listing · Write Article · View Site.

The "Needs attention" panel is what keeps the site healthy without the client
needing to understand SEO. Invest in it.

---

## 4. Listings

### List view (`/admin/listings`)

Table columns: thumbnail · address · city · price · beds/baths · status ·
type · published · photos count · updated.

- Filters: status, city, type, published/draft, has-photos.
- Search: address and MLS number.
- Sort: updated, price, created.
- Bulk: publish, unpublish, feature, delete (with a typed confirmation).
- Row actions: Edit · View on site · Duplicate · Delete.
- Below 768px this becomes the card list from `04-responsive-spec.md` § 6.
- Pagination 25 per page.

**Duplicate** is high-value: most of her listings share a city, features and
description structure. Duplicating clears address, slug, price and photos and
keeps everything else.

### Editor (`/admin/listings/new`, `/admin/listings/[id]/edit`)

Six tabs. Tabs become an accordion below 768px.

**Tab 1 — Basics**

| Field | Control | Validation |
|---|---|---|
| Street address | Text | Required |
| Unit | Text | Optional |
| City | Select from `cities` | Required |
| Community | Select, filtered by city | Optional |
| ZIP | Text | 5 digits |
| Latitude / Longitude | Number pair, with a "Find on map" helper | Optional; warn if empty (map section will not render) |
| Price | Currency | Required, > 0 |
| Status | Select | Required |
| Listing type | Select | Required |
| Property type | Select | Required |

Selecting `status = sold` reveals **Sold date** (default today), **Sold price**
(default list price), and **Keep photos permanently** (default off). When sold
is selected, an inline note states plainly: "Large photos will be deleted 7 days
after the sold date. The page stays live and keeps its search ranking."

**Tab 2 — Details**

Beds, baths (0.5 steps), half baths, sqft, lot size (acres), year built, garage
spaces, stories, pool, waterfront, HOA fee, annual taxes, features (tag input
with an autocomplete of previously used features).

The features autocomplete is important — without it she will type "Granite
Counters", "granite countertops" and "Granite counter tops" and the GIN index
becomes useless.

**Tab 3 — Media**

- Drag-and-drop zone plus a file picker.
- Counter "8 / 15". At 15 the zone disables with an explanation, not silence.
- Each thumbnail: drag handle for order, "Cover" radio, alt-text input, delete.
- **Alt text is required before publish.** Show a warning count: "3 photos are
  missing alt text".
- Upload progress per file; a failure shows a retry on that file only.
- Virtual tour URL, floorplan upload.
- Estimated storage for this listing shown live.

**Tab 4 — Content**

- Headline (max 90 chars, with a counter)
- Description (rich text, limited toolbar: bold, italic, lists, links)
- **The Contractor's Take** — a separate rich-text field, optional, rendered as
  a distinct callout on the public page. Helper text: "Your construction read on
  this property. This is what no other agent's listing has."

**Tab 5 — SEO**

- Slug (auto-generated from address + city, editable, uniqueness checked live).
  Changing a published slug shows: "A redirect from the old URL will be created
  automatically."
- Meta title (with a 60-char guide and a live Google-result preview)
- Meta description (155-char guide)
- OG image (defaults to the cover photo)

**Tab 6 — Publish**

- Featured toggle
- Published toggle
- Published date (read-only after first publish)
- A pre-publish checklist that must pass:
  - at least one photo ✓
  - every photo has alt text ✓
  - description at least 100 characters ✓
  - meta description present ✓
  - price, city and status set ✓

The Publish button is disabled until the checklist passes, and each unmet item
links to the tab that fixes it.

### Editor behavior

- Autosave draft every 30 seconds and on tab change. A "Saved 2 min ago"
  indicator, never a silent save.
- Unsaved-changes guard on navigation.
- Sticky footer bar: Cancel · Save Draft · Publish, plus validation summary.
- Images upload immediately on drop, not on submit — a slow upload must never
  block a save.
- The same zod schema validates on the client and in the server action.

---

## 5. Articles

List: title, kind (blog / market update / guide), city, status, published date,
author, reading time.

Editor:

- **Tiptap**, stored as JSON in `body_json`, flattened to `body_text` by a
  trigger for search and reading time.
- Toolbar: H2, H3, bold, italic, bullet list, numbered list, quote, link,
  image, table, horizontal rule, code. **No H1** — the page title is the H1.
- Image insert goes through the same upload pipeline; images land under
  `articles/{id}/`.
- Sidebar: kind, city, community, tags, cover image + alt, excerpt (auto-drafted
  from the first paragraph, editable), slug, SEO fields, publish controls.
- Live word count and reading time.
- Preview opens the real public template in a new tab with a draft token.

---

## 6. Cities and Communities

Both are content editors, not full CRUD — cities are seeded and rarely added.

**City editor:** name, slug, county, `in_search` toggle, `is_flagship`
(read-only, Lake Mary only), hero image, intro (markdown), body (markdown),
stats (a structured form for the fixed `stats_json` keys, each with an "as of"
date), FAQ repeater (question / answer), SEO fields, publish toggle.

The stats form must be a **form**, not a JSON textarea. She will not hand-edit
JSON, and a malformed object breaks the city page.

**Community editor:** parent city, name, slug, hero, intro, body, HOA info,
amenities (tag input), price range min/max, FAQ repeater, SEO, publish.

---

## 7. Reviews

Simple CRUD: author name, role ("Buyer, Lake Mary"), rating, body, source
(Google / Zillow / Direct), source URL, date, publish toggle, drag-to-reorder.

An inline warning on the page: "Only publish reviews you actually received.
Review markup is checked by Google and by consumers."

---

## 8. Leads

Inbox layout: list on the left, detail on the right (stacked below 1024px).

- Filter by status and type, search by name/email/phone.
- Detail shows: all fields, source page (linked), the listing they enquired
  about (linked), UTM parameters, timestamp.
- Actions: change status, add a note, tap-to-call, mailto with a prefilled
  subject, mark spam.
- CSV export of the current filtered set.
- New leads highlighted until opened.

Notification: Resend email to Krisi on every new lead, containing name, phone,
email, type, the message, and a direct link into the admin lead detail.

---

## 9. Media

Grid of everything in the `media` table with entity, size, dimensions, created
date, and where it is used.

- Filter by entity type; sort by size descending (to find what to delete).
- **Orphans tab** — objects in storage with no `media` row, or `media` rows whose
  entity no longer exists. Bulk delete with a count of bytes reclaimed.
- Storage summary with a progress bar and a projection: "At the current rate you
  reach 1 GB in about 14 months."
- Deleting media that is still referenced is blocked, with a link to the
  referencing entity.

---

## 10. Settings

- **Contact** — phone, email, brokerage address, office hours
- **Profiles** — Google Business Profile, Realtor.com, Zillow, Facebook,
  Instagram, LinkedIn, YouTube. These feed the `sameAs` array in JSON-LD, so
  every field explains what it affects.
- **Site** — default OG image, hero image, positioning line, announcement bar
- **Compliance** — licence numbers, brokerage name, disclosure text (editable
  but with a warning that these are legally required)
- **Notifications** — where lead emails go, autoresponder copy
- **Maintenance** — manual triggers for orphan cleanup, sitemap regeneration,
  and cache revalidation, each showing when it last ran

Settings live in a single-row `site_settings` table, cached and revalidated on
save.

---

## 11. Admin UX rules

1. **Never lose work.** Autosave, unsaved-changes guard, restore-draft on
   reload.
2. **Never a silent failure.** Every mutation produces a toast; failures include
   a retry.
3. **Destructive actions need friction.** Delete requires typing the address or
   title. Bulk delete shows the exact count.
4. **Explain constraints in context.** "15 photo limit" appears at the uploader,
   not in a help page. Storage warnings appear where storage is consumed.
5. **No JSON textareas.** Every structured field gets a real form.
6. **Optimistic UI with rollback** for toggles (publish, feature) — instant
   feedback, reverted with a toast if the server rejects.
7. **Keyboard shortcuts** in the editor: Cmd/Ctrl+S save, Cmd/Ctrl+Enter
   publish, Esc close dialog.
8. **Mobile leads must work.** The leads inbox and the listing list are fully
   usable at 360px. The editor may degrade gracefully but must not break.
9. Empty states teach: an empty listings table shows "Add your first listing"
   with a link, not a blank grid.
10. Every table has a loading skeleton matching its final row height.

---

## 12. Definition of done

- Every screen works at 360 / 768 / 1024 / 1440.
- Every form validates identically on client and server via one zod schema.
- Every destructive action is confirmed.
- Every list has empty, loading and error states.
- Every mutation revalidates the affected public paths.
- RLS blocks the same actions the UI blocks — verified with the anon-key test
  script from `13-qa-checklists.md`.
- No `SUPABASE_SERVICE_ROLE_KEY` reachable from any client bundle
  (`grep -r "SERVICE_ROLE" .next/static` returns nothing).
