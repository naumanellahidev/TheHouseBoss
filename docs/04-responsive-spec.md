# 04 — Responsive Specification

Responsiveness is a stated top priority for this project. This document is the
contract: a page is not done until it matches this spec at every breakpoint.

---

## 1. Breakpoints

| Name | Min width | Represents | Must be tested |
|---|---|---|---|
| `xs` | 360px | iPhone SE, small Android | **Yes — the floor** |
| `sm` | 480px | Large phones | Yes |
| `md` | 768px | Tablet portrait | Yes |
| `lg` | 1024px | Tablet landscape, small laptop | Yes |
| `xl` | 1280px | Desktop | **Yes — the reference design** |
| `2xl` | 1536px | Large desktop | Spot check |

**360px is the hard floor.** Nothing may overflow horizontally at 360px. Not a
table, not a price, not a filter chip, not an admin form.

Mobile-first: base styles are the 360px layout; every media query adds. No
`max-width` queries except where a desktop-only behavior must be removed.

---

## 2. Global rules

### Container

```css
.container {
  width: 100%;
  margin-inline: auto;
  padding-inline: 20px;          /* xs  */
  max-width: 1280px;
}
@media (min-width: 768px)  { .container { padding-inline: 24px; } }
@media (min-width: 1280px) { .container { padding-inline: 32px; } }
```

### No horizontal overflow, enforced

```css
html, body { overflow-x: clip; }
```

`overflow-x: clip` rather than `hidden` — `hidden` on `html` silently breaks
`position: sticky` descendants, which this site uses for the filter bar.

Any element that can exceed the viewport gets its own scroll container:

- Admin tables → `overflow-x: auto` on a wrapper, with `-webkit-overflow-scrolling: touch`
- Code blocks and long URLs in articles → `overflow-wrap: anywhere`
- Filter chip rows → horizontal scroll with a fade mask on mobile
- Wide tables in article content → wrapped by the rich-text renderer automatically

### Fluid everything

- Type: `clamp()` (see `03-design-system.md` § 2). No breakpoint-specific font
  sizes except where the design genuinely changes.
- Spacing: the section rhythm table, applied with breakpoint utilities.
- Images: `width: 100%; height: auto;` with an explicit aspect ratio box.

### Touch

- Minimum target 44 x 44 CSS px. If the visual element is smaller, expand the
  hit area with padding or a pseudo-element.
- Minimum 8px between adjacent targets.
- No hover-only affordance. Anything revealed on hover must also be reachable by
  tap and by keyboard.
- `touch-action: manipulation` on buttons to remove the 300ms tap delay.

### Safe areas

Sticky bottom bars and full-screen sheets respect the notch:

```css
padding-bottom: max(16px, env(safe-area-inset-bottom));
```

---

## 3. Navigation

| Breakpoint | Pattern |
|---|---|
| < 1024px | Logo left, hamburger right. Tap opens a full-screen sheet sliding from the right. |
| ≥ 1024px | Horizontal nav bar with dropdowns for Cities and Guides. |

Header height: 64px mobile, 80px desktop. Sticky, with a `backdrop-blur` and a
1px bottom border that appears only after 8px of scroll.

Mobile sheet requirements:

- Covers the viewport, background `--color-ink-900`
- Focus trapped; Escape closes; body scroll locked while open
- Close button at least 44x44, top-right, `aria-label="Close menu"`
- Nav items stack, 56px row height, 1px `--color-ink-700` dividers
- Primary CTA ("Contact Krisi") pinned at the bottom of the sheet
- Phone and email links in the sheet footer

Below 1024px a **sticky bottom action bar** appears on listing detail pages
only: "Call" · "Email" · "Schedule Showing". It hides on scroll-down and
reappears on scroll-up.

---

## 4. Grid behavior by component

| Component | 360 | 480 | 768 | 1024 | 1280+ |
|---|---|---|---|---|---|
| Property card grid | 1 col | 1 col | 2 col | 3 col | 3 col |
| Featured listings (home) | 1 col | 1 col | 2 col | 3 col | 3 col |
| City tiles | 1 col | 2 col | 2 col | 3 col | 4 col |
| Community tiles | 1 col | 2 col | 3 col | 3 col | 4 col |
| Article cards | 1 col | 1 col | 2 col | 3 col | 3 col |
| Guide teasers | 1 col | 1 col | 3 col | 3 col | 3 col |
| Stat tiles | 2 col | 2 col | 4 col | 4 col | 4 col |
| Review cards | 1 col | 1 col | 2 col | 3 col | 3 col |
| Footer columns | 1 col stacked | 2 col | 2 col | 4 col | 4 col |
| Admin table | card list | card list | table | table | table |
| Admin form | 1 col | 1 col | 1 col | 2 col | 2 col |

Property search results at ≥1280px keep 3 columns rather than 4 — a 4-column
grid makes photos too small to sell a house.

---

## 5. Page-by-page

### Home

| Section | Mobile | Desktop |
|---|---|---|
| Hero | 16:9 image, headline over scrim, search opens a sheet on tap | Full-bleed 21:9, headline left-aligned in a 640px column, inline search card overlapping the image bottom edge by 40px |
| Search card | Collapsed: one "Search homes" button. Tap → full-screen sheet with all filters | Expanded row: City · Price · Beds · Type · Search |
| Specialty strip (VA / Assumable / New Construction) | 1 col, 3 stacked cards | 3 col |
| Featured listings | 1 col, or horizontal snap carousel if > 3 | 3 col grid |
| Meet Krisi | Portrait 4:5 above text | Two-column, portrait left 5/12, text right 7/12 |
| City tiles | 2 col | 4 col |
| Guides teaser | 1 col | 3 col |
| Reviews | Carousel, 1 visible | 3 col grid |
| Lead CTA band | Stacked, full-width button | Text left, button right |

Hero height: `min(78vh, 640px)` on mobile, `min(84vh, 760px)` on desktop.
Never `100vh` — mobile browser chrome makes it wrong.

### Search

| Element | Mobile | Desktop |
|---|---|---|
| Filter bar | Sticky row: "Filters (3)" · "Sort" · view toggle. Filters open a bottom sheet at 92vh with an Apply button showing the live count | Sticky horizontal bar, all controls inline, applies on change |
| Active chips | Horizontal scroll row below the bar | Wraps to a second line |
| Results | 1 col | 3 col |
| Map | Hidden by default; a "Map" toggle swaps list for a full-screen map | Optional split view: list 60% left, sticky map 40% right (≥1280px only) |
| Pagination | "Load more" button | Numbered pagination |
| Result count | Above the grid, `aria-live` | Right side of the filter bar |

The mobile filter sheet must never trap the user: the header shows a close
button and the footer has both "Clear all" and "Show N homes".

### Listing detail

| Section | Mobile | Desktop |
|---|---|---|
| Gallery | Swipe carousel, 4:3, dots + counter "3 / 12", tap opens lightbox | Hero image 8/12 left, 2x2 thumbnail grid 4/12 right, "View all 12 photos" button |
| Price and address | Below gallery, full width | Right column, sticky |
| Key facts | 2x2 grid of stat tiles | 4 across |
| Description | Full width, `max-width: 68ch` | Left column 8/12 |
| Contact card | Inline after description, plus the sticky bottom bar | Sticky right column 4/12, offset below the header |
| Features list | 2 col, collapsible after 8 items | 3 col, all visible |
| Map | Full width, 16:9, static image until tapped | Full width, 21:9 |
| Similar listings | Horizontal snap carousel | 3 col grid |

The desktop sticky contact card must have `top: calc(header + 24px)` and must
never be taller than the viewport — if content grows, it scrolls internally.

### City hub and community pages

| Section | Mobile | Desktop |
|---|---|---|
| Hero | 16:9 with scrim, title, breadcrumb | 21:9 |
| Intro | Full width prose | 8/12, with a sticky in-page TOC in 4/12 (≥1024px) |
| Stats | 2 col | 4 col |
| Homes-for-sale strip | Carousel | 3 col grid + "View all" |
| Communities | 2 col tiles | 4 col |
| FAQ accordion | Full width, all collapsed | Full width, first item open |
| Articles | 1 col | 3 col |

### Guide pages (VA, Assumable, New Construction)

Long-form. Mobile gets a sticky progress bar at the top of the viewport and a
collapsible TOC pinned under the header. Desktop gets a sticky sidebar TOC in a
3/12 column with the content in 9/12 constrained to 68ch.

A lead-capture block appears after the first section and again at the end. On
mobile it is full-width; on desktop it is a bordered card at 68ch.

### About

Portrait 4:5. Mobile: image, then bio, then credentials, then CTA. Desktop:
sticky portrait plus credential card in a 5/12 left column, bio scrolling in
7/12.

The full client bio is long. Break it into subheadings — do not render nine
paragraphs as an undifferentiated wall.

### Contact

Mobile: contact methods first (tap-to-call, tap-to-email), then the form, then
the map. Desktop: form 7/12 left, contact details and map 5/12 right.

### Admin

| Breakpoint | Behavior |
|---|---|
| < 768px | Sidebar becomes a drawer. Tables become card lists. Form tabs become an accordion. Bulk actions hidden. |
| 768–1023px | Sidebar collapses to a 64px icon rail. Tables scroll horizontally with the first column sticky. |
| ≥ 1024px | Full 240px sidebar, full tables, 2-column forms. |

The admin dashboard is expected to be used on a laptop, but the client will
check leads on her phone. Leads and the listing list **must** be fully usable at
360px. The listing editor may be marked "best on desktop" but must not be
broken.

---

## 6. Tables to cards

Below 768px every data table becomes a card list. The transformation is
mechanical:

- Row → card with `--shadow-sm`
- Primary column (title/address) → card heading
- Remaining columns → label/value rows inside the card
- Row actions → a footer row of buttons, or an overflow menu
- Sorting → a select control above the list
- Selection → a checkbox in the card's top-right

Implement once as `<ResponsiveTable />`. Do not re-solve this per screen.

---

## 7. Images and responsive loading

```tsx
<Image
  src={photoUrl(photo, 1600)}
  width={photo.w}
  height={photo.h}
  sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL={blurhashToDataUrl(photo.blur)}
  onError={handleFallback}
  alt={photo.alt}
/>
```

`sizes` per context:

| Context | `sizes` |
|---|---|
| Card in a 3-col grid | `(max-width:767px) 100vw, (max-width:1279px) 50vw, 33vw` |
| Listing hero | `(max-width:1023px) 100vw, 66vw` |
| City hero | `100vw` |
| Article cover | `(max-width:767px) 100vw, 720px` |
| Portrait | `(max-width:767px) 100vw, 400px` |

Getting `sizes` wrong is the most common cause of a failed mobile Lighthouse
score on an image-heavy site. It is checked in the responsive audit.

---

## 8. Testing procedure

Run for every page before it is marked done.

1. **Widths** — 360, 390, 414, 480, 768, 834, 1024, 1280, 1440. No horizontal
   scrollbar at any width.
2. **Zoom** — 200% at 1280px. Content reflows, nothing is clipped, nothing
   overlaps.
3. **Landscape phone** — 844 x 390. Sticky elements must not eat the viewport.
4. **Long content** — a 90-character address, a $12,500,000 price, a 15-word
   city name in a chip. Nothing breaks the layout.
5. **Empty content** — no photos, no description, zero results. Every one has a
   designed state.
6. **Slow network** — throttle to Fast 3G. Skeletons appear, layout does not
   shift when content lands.
7. **Keyboard only** — tab through the entire page. Focus is always visible and
   in logical order.
8. **Reduced motion** — the OS setting on. Nothing animates.
9. **iOS Safari specifically** — check `100vh`, sticky elements, input zoom, and
   `env(safe-area-inset-*)`.

Automate steps 1 and 7 with a Playwright script; do steps 3–6 and 9 by hand.

---

## 9. Common failure modes to check for

| Failure | Where it usually appears |
|---|---|
| Horizontal overflow from a fixed-width element | Filter chips, admin tables, hero headlines |
| Text under 16px in an input | Search bar, admin forms → iOS zooms |
| `100vh` hero | Mobile Safari address bar |
| Sticky element with no `top` offset for the header | Filter bar, contact card |
| Hover-only reveal | Card action buttons, admin row actions |
| Image without an aspect-ratio box | Gallery, article covers → CLS |
| Modal without body scroll lock | Mobile filter sheet, lightbox |
| Two-column form squeezed at 768px | Admin listing editor |
| Tap targets under 44px | Pagination, gallery dots, chip remove buttons |
| Long price or address overflowing a card | 7-figure listings |
