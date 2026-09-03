# 03 — Design System

**Direction: Luxury Authority.**
Deep navy ground, warm gold accent, high-contrast serif display over a clean
sans. Generous whitespace. Photography does the selling; the interface gets out
of its way.

Why this direction: the brand is called *The House Boss*. The visual language
has to read as confident and premium without tipping into gaudy. Navy and gold
is the most reliable trust signal in real estate, and the serif/sans pairing
separates her from the all-Inter template sites every other agent uses.

> Hard rule 23: tokens live only in the `@theme` block of `app/globals.css`.
> A hex literal or arbitrary pixel value inside a component is a defect.

---

## 1. Color

### Palette

| Token | Value | Use |
|---|---|---|
| `--color-royal-950` | `#071023` | Deepest ground, compliance footer |
| `--color-royal-900` | `#0C1B3A` | **Primary brand blue** — header, hero overlay |
| `--color-royal-800` | `#14295A` | Raised surfaces on dark |
| `--color-royal-700` | `#1D3A7A` | Borders on dark, hover on dark |
| `--color-royal-600` | `#2A4E9E` | Muted text on dark |
| `--color-azure-700` | `#1D4ED8` | **Accent as text on light** — 6.6:1 |
| `--color-azure-600` | `#2563EB` | **Primary accent** — CTAs, rules, focus ring |
| `--color-azure-400` | `#8AB4F8` | Accent on dark — text and ring, 8.1:1 |
| `--color-azure-200` | `#C7DBFE` | Tints, selection |
| `--color-azure-50` | `#EFF5FF` | Accent wash background |
| `--color-porcelain-50` | `#FDFEFF` | Page ground (light) |
| `--color-porcelain-100` | `#F3F7FC` | Section alternate |
| `--color-porcelain-200` | `#E6EEF8` | Card ground, input ground |
| `--color-porcelain-300` | `#D2DEEC` | Borders |
| `--color-slate-500` | `#5D6B81` | Subtle text on light |
| `--color-slate-700` | `#445064` | Secondary text |
| `--color-slate-900` | `#0F172A` | Body text on light |

**Direction: white and royal blue.** This replaces the navy-and-gold "Luxury
Authority" palette the project launched with. White grounds carry the site; royal
blue is the single brand colour, used as both the dark ground (`royal-*`) and the
interactive accent (`azure-*`).

**The gold trap is gone, and that is the main practical difference.** The old
`--color-accent` was 2.36:1 and could never be used for text, which is why
`--color-accent-quiet` existed as a separate darker token. `azure-600` is
**5.2:1 with white on it** and `azure-700` is **6.6:1 as text on white**, so the
accent is legible in both roles. `--color-accent-quiet` is kept — it is the
correct token for accent-coloured *text*, and `--color-accent` remains the token
for a filled surface — but a mistake between them is now a style inconsistency
rather than an accessibility failure.

**The one rule that replaces it:** `azure-600` is only 3.3:1 on `royal-900`, so
**accent text on a dark ground must use `azure-400`** (8.1:1). The focus ring
follows the same split — `--color-ring` is `azure-600` for light grounds,
`--color-ring-invert` is `azure-400` for dark. Both are asserted by
`npm run check:contrast`.

### Semantic tokens

Components reference **only** these. Never a raw palette token.

```css
@theme {
  --color-background:        var(--color-porcelain-50);
  --color-surface:           #FFFFFF;
  --color-surface-sunken:    var(--color-porcelain-100);
  --color-surface-raised:    #FFFFFF;
  --color-surface-invert:    var(--color-royal-900);

  --color-foreground:        var(--color-slate-900);
  --color-foreground-muted:  var(--color-slate-700);
  --color-foreground-subtle: var(--color-slate-500);
  --color-foreground-invert: var(--color-porcelain-50);

  --color-border:            var(--color-porcelain-300);
  --color-border-strong:     #7D8CA4;   /* 3.4:1 — control boundaries */

  --color-primary:           var(--color-royal-900);
  --color-primary-hover:     var(--color-royal-800);
  --color-primary-fg:        var(--color-porcelain-50);

  --color-accent:            var(--color-azure-600);  /* takes a WHITE label */
  --color-accent-hover:      var(--color-azure-700);  /* darker on hover, not lighter */
  --color-accent-fg:         #FFFFFF;
  --color-accent-quiet:      var(--color-azure-700);  /* accent as TEXT on light */
  --color-accent-wash:       var(--color-azure-50);

  --color-ring:              var(--color-azure-600);  /* light grounds */
  --color-ring-invert:       var(--color-azure-400);  /* dark grounds */

  --color-success:  #2B6E51;  --color-success-bg:  #E8F3EE;
  --color-warning:  #8F5A12;  --color-warning-bg:  #FBF1E2;
  --color-danger:   #A32B2B;  --color-danger-bg:   #F8ECEC;
  --color-info:     #2C5F8A;  --color-info-bg:     #E9F1F7;
}
```

### Contrast rules — non-negotiable

Every figure below is **computed**, not estimated, by
`npm run check:contrast` (`scripts/check-contrast.mjs`). That script parses the
real hex values out of `app/globals.css` and fails the build if any documented
pairing drops below its threshold. If you change a color token, run it and
paste the new numbers here.

| Combination | Ratio | Need | Purpose |
|---|---|---|---|
| `slate-900` on `porcelain-50` | 17.68:1 | 4.5 | body text on the page ground |
| `slate-700` on `porcelain-50` | 8.07:1 | 4.5 | secondary text |
| `slate-500` on `porcelain-50` | 5.35:1 | 4.5 | subtle text — labels, metadata at 13px |
| `slate-500` on `porcelain-100` | 5.02:1 | 4.5 | subtle text on a sunken section |
| `slate-500` on `surface` | 5.40:1 | 4.5 | subtle text on a card |
| `azure-700` on `porcelain-50` | 6.64:1 | 4.5 | accent-quiet as text on light |
| `azure-700` on `porcelain-100` | 6.23:1 | 4.5 | accent-quiet on a sunken section |
| `azure-700` on `surface` | 6.70:1 | 4.5 | accent-quiet on a card |
| `azure-700` on `accent-wash` | 6.12:1 | 4.5 | accent-quiet on the accent wash |
| `azure-700` on `danger-bg` | 5.81:1 | 4.5 | accent-quiet inside a danger callout |
| `azure-700` on `warning-bg` | 5.99:1 | 4.5 | accent-quiet inside a warning callout |
| `azure-700` on `success-bg` | 5.90:1 | 4.5 | accent-quiet inside a success callout |
| `azure-700` on `info-bg` | 5.87:1 | 4.5 | accent-quiet inside an info callout |
| `slate-700` on `porcelain-100` | 7.57:1 | 4.5 | secondary text on a sunken section |
| `slate-500` on `danger-bg` | 4.68:1 | 4.5 | subtle text inside a callout |
| `azure-600` on `porcelain-50` | 5.12:1 | 3 | --color-ring on a light ground |
| `azure-400` on `royal-900` | 8.08:1 | 3 | --color-ring-invert on a dark ground |
| `azure-400` on `royal-900` | 8.08:1 | 4.5 | accent text on royal blue |
| `azure-400` on `royal-950` | 9.00:1 | 4.5 | accent text on the compliance footer |
| `porcelain-50` on `azure-600` | 5.12:1 | 4.5 | white label on a royal-blue button |
| `porcelain-50` on `royal-900` | 16.86:1 | 4.5 | inverted body text |
| `porcelain-50` on `royal-950` | 18.78:1 | 4.5 | inverted text on the compliance footer |
| `border-strong` on `porcelain-50` | 3.38:1 | 3 | input and outline-button borders |
| `success` on `success-bg` | 5.36:1 | 4.5 | success message |
| `warning` on `warning-bg` | 5.16:1 | 4.5 | warning message |
| `danger` on `danger-bg` | 6.20:1 | 4.5 | error message |
| `info` on `info-bg` | 5.91:1 | 4.5 | info message |

Every row above is generated from the guard output. Re-run
`npm run check:contrast` and paste the result rather than editing a number
by hand — a figure typed from memory is how a palette drifts out of
compliance without anyone noticing.

**What replaced the gold trap.** The previous accent (`gold-500`) was 2.36:1
and could never be used as text, which made "accent as a surface" versus
"accent as text" an accessibility rule rather than a style choice.
`azure-600` carries a white label at 5.1:1 and `azure-700` is 6.6:1 as text on
white, so both roles are safe.

**The rule that took its place:** `azure-600` is only 3.3:1 on `royal-900`.
**Accent text on any dark ground must use `azure-400`** (8.1:1), and the focus
ring splits the same way — `--color-ring` (`azure-600`) on light,
`--color-ring-invert` (`azure-400`) on dark. Both halves are asserted above.

Two consequences that are still easy to get wrong:

- **Input borders.** `--color-border` is a decorative divider, below 3:1. A
  form control's boundary is what identifies it (WCAG 1.4.11), so inputs,
  selects and textareas use `--color-border-strong` (3.4:1).
- **Hover direction.** `--color-accent-hover` is *darker* than
  `--color-accent`, not lighter. A filled blue button that lightens on hover
  loses contrast against its own white label.

### Dark mode

Not shipped in v1. The palette is already dark-capable — the token layer flips
`background`/`foreground`/`surface` and swaps `accent` to `gold-400`. Do not
half-implement it: either the full token flip or nothing.

---

## 2. Typography

### Families

```ts
// app/fonts.ts
import { Fraunces, Inter } from 'next/font/google'

// Variable fonts: `axes` and an explicit `weight` array are mutually
// exclusive in next/font. Omit weight so the whole range stays available.
export const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK', 'opsz'],
})

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})
```

- **Fraunces** — display serif. Headings only: h1, h2, hero, section titles,
  large price figures. Optical sizing makes it feel editorial rather than dated.
- **Inter** — everything else. Body, UI, labels, tables, admin.
- **No third family.** Numeric tables use Inter with
  `font-variant-numeric: tabular-nums`.

Two families, both variable, both self-hosted through `next/font`. That is the
entire font budget.

### Scale — fluid, mobile-first

```css
@theme {
  --text-display:  clamp(2.5rem, 1.6rem + 4.5vw, 4.5rem);   /* 40 → 72 */
  --text-h1:       clamp(2rem,   1.4rem + 3vw,   3.25rem);  /* 32 → 52 */
  --text-h2:       clamp(1.625rem, 1.25rem + 1.9vw, 2.5rem);/* 26 → 40 */
  --text-h3:       clamp(1.375rem, 1.15rem + 1.1vw, 1.875rem);/* 22 → 30 */
  --text-h4:       clamp(1.125rem, 1.05rem + 0.4vw, 1.375rem);/* 18 → 22 */
  --text-lead:     clamp(1.0625rem, 1rem + 0.4vw, 1.25rem); /* 17 → 20 */
  --text-body:     1rem;      /* 16 — never smaller for body copy */
  --text-sm:       0.9375rem; /* 15 — secondary */
  --text-xs:       0.8125rem; /* 13 — labels, meta. Never for sentences. */
  --text-overline: 0.75rem;   /* 12 — uppercase, tracked, short words only */
}
```

### Pairings

| Role | Font | Size | Weight | Line height | Tracking |
|---|---|---|---|---|---|
| Hero display | Fraunces | `--text-display` | 600 | 1.02 | -0.02em |
| h1 | Fraunces | `--text-h1` | 600 | 1.08 | -0.015em |
| h2 | Fraunces | `--text-h2` | 600 | 1.15 | -0.01em |
| h3 | Fraunces | `--text-h3` | 600 | 1.25 | -0.005em |
| h4 | Inter | `--text-h4` | 600 | 1.35 | 0 |
| Lead paragraph | Inter | `--text-lead` | 400 | 1.6 | 0 |
| Body | Inter | `--text-body` | 400 | 1.7 | 0 |
| Small | Inter | `--text-sm` | 400 | 1.55 | 0 |
| Overline | Inter | `--text-overline` | 600 | 1.2 | 0.12em, uppercase |
| Price (card) | Inter | `--text-h4` | 700 | 1.1 | -0.01em, tabular |
| Price (detail) | Fraunces | `--text-h2` | 700 | 1.0 | -0.02em, tabular |
| Button | Inter | `--text-sm` | 600 | 1 | 0.01em |

### Prose rules

- Measure: `max-width: 68ch` for article body. Never full-bleed paragraphs.
- Long-form body on article pages steps up to 17px (`--text-lead`) for reading
  comfort; UI stays at 16px.
- No text over an image without a scrim. See § 7.
- Headings never orphan a single word: use `text-wrap: balance` on h1–h3 and
  `text-wrap: pretty` on paragraphs.

---

## 3. Space, radius, elevation

### Spacing

4 px base. Only these steps exist:

```
0  1(4)  2(8)  3(12)  4(16)  5(20)  6(24)  8(32)  10(40)  12(48)
16(64)  20(80)  24(96)  32(128)
```

Section rhythm:

| Context | Mobile | Tablet | Desktop |
|---|---|---|---|
| Section vertical padding | 48px | 64px | 96px |
| Hero vertical padding | 64px | 96px | 128px |
| Card internal padding | 16px | 20px | 20px |
| Gap between cards | 16px | 20px | 24px |
| Container gutter | 20px | 24px | 32px |

Container max width: **1280px**. Prose container: **720px**. Wide media: **1440px**.

### Radius

```css
--radius-sm: 4px;    /* badges, chips */
--radius-md: 8px;    /* inputs, buttons */
--radius-lg: 12px;   /* cards, and ALL listing photography */
--radius-xl: 20px;   /* modals, sheets */
--radius-2xl: 28px;  /* editorial media frames and hero panels ONLY */
--radius-full: 9999px;
```

**Listing photography is never rounded above `--radius-lg`.** Round corners on a
property photo past 12px looks like a social app, not a listing. This is the
original rule and it still holds without exception for anything showing a
property that is for sale.

`--radius-2xl` exists for **editorial** imagery, which is a different job: the
home and city heroes, city tiles, the About portrait, and guide headers. Those
images sell a place and a person rather than a specific listing, and the larger
radius is what makes the composition read as designed rather than as a stack of
rectangles. Apply it only through the `media-frame` utility, so the decision
stays in one place and cannot drift into listing contexts.

### Elevation

Shadows are soft and navy-tinted, never neutral gray.

```css
--shadow-xs: 0 1px 2px rgb(15 27 45 / 0.05);
--shadow-sm: 0 1px 3px rgb(15 27 45 / 0.07), 0 1px 2px rgb(15 27 45 / 0.04);
--shadow-md: 0 4px 12px rgb(15 27 45 / 0.08), 0 2px 4px rgb(15 27 45 / 0.04);
--shadow-lg: 0 12px 32px rgb(15 27 45 / 0.10), 0 4px 8px rgb(15 27 45 / 0.05);
--shadow-xl: 0 24px 64px rgb(15 27 45 / 0.14);
--shadow-float: 0 32px 80px rgb(15 27 45 / 0.18), 0 8px 24px rgb(15 27 45 / 0.08);
```

Elevation ladder: page 0 → card `sm` → card hover `md` → dropdown `lg` →
modal `xl` → overlapping card `float`. Never skip a rung.

`--shadow-float` is the top rung and has exactly one use: a card that overlaps
the media behind it, via the `float-card` utility. The wide soft spread is what
separates the two planes — with a lesser shadow an overlapping card reads as a
misalignment rather than as depth. Do not reach for it to make an ordinary card
look important; that is what the ladder below it is for.

---

## 4. Motion

```css
--ease-out:  cubic-bezier(0.22, 1, 0.36, 1);
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
--dur-fast:  120ms;   /* hover, focus */
--dur-base:  200ms;   /* dropdowns, toggles */
--dur-slow:  320ms;   /* modals, drawers */
--dur-page:  400ms;   /* hero image reveal only */
```

Rules:

- Animate `transform` and `opacity` only. Never `width`, `height`, `top`.
- Card hover: `translateY(-2px)` plus shadow `sm → md`, 120ms. Nothing else.
- Image reveal: blurhash → fade to sharp over 320ms.
- No scroll-jacking, no parallax, no auto-playing carousel.
- Every animation is wrapped:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## 5. Brand lockup

Two forms. Both live in `components/site/Logo.tsx`.

**Primary (header, footer, OG images)**

```
THE HOUSE BOSS          ← Fraunces 600, tracking 0.06em, uppercase
──────────              ← 32px gold rule, 2px
Powered by World Properties Group
                        ← Inter 500, --text-xs, tracking 0.04em
```

**Compact (mobile header, favicon context)**

```
THB monogram in a gold-ruled square + "The House Boss" wordmark
```

Compliance note: the FREC rule that the brokerage name must not be smaller than
the agent's name applies to the **compliance footer**, not to the logo lockup.
The footer is a separate component with its own sizing rules — see
`09-compliance-legal.md`. Do not conflate them.

Clear space around the logo: at least the cap height of the wordmark on all
sides. Minimum wordmark width 140px; below that, use the compact form.

---

## 6. Component inventory

Each entry lists the states that must exist before the component is done.

### Buttons

| Variant | Fill | Text | Border | Use |
|---|---|---|---|---|
| `primary` | `--color-primary` | `--color-primary-fg` | none | Main action |
| `accent` | `--color-accent` | `--color-accent-fg` | none | Hero CTA, "Schedule a Showing" |
| `outline` | transparent | `--color-primary` | 1px `--color-border-strong` | Secondary |
| `ghost` | transparent | `--color-foreground-muted` | none | Tertiary, toolbars |
| `danger` | `--color-danger` | white | none | Admin destructive |

Sizes: `sm` 36px, `md` 44px (default), `lg` 52px.
**No button is shorter than 44px on touch viewports**, regardless of variant.

States required: default, hover, active, focus-visible, disabled, loading
(spinner replaces the label, width locked so nothing reflows).

Focus ring, universal:

```css
outline: 2px solid var(--color-ring);
outline-offset: 2px;
```

Never `outline: none` without a replacement. Never rely on `:focus` alone — use
`:focus-visible`.

### Property card

The single most important component on the site.

```
┌─────────────────────────────┐
│ [4:3 photo]        [status] │  ← status badge top-left, absolute
│                      [♡]    │  ← save, top-right (v1: hidden)
├─────────────────────────────┤
│ $525,000                    │  ← price, h4, 700, tabular
│ 123 Lakeview Dr             │  ← address, body, 600
│ Lake Mary, FL 32746         │  ← city, sm, muted
│ ─────────────────────────── │
│ 4 bd · 3 ba · 2,410 sqft    │  ← specs, sm, tabular
│ [New Construction]          │  ← type chip, only if not resale
└─────────────────────────────┘
```

- Photo aspect ratio **4:3**, fixed. Never let a photo dictate card height.
- Whole card is one link. No nested interactive elements in v1 — a link inside a
  link is an accessibility failure.
- Skeleton state matches the exact final dimensions. Zero layout shift.
- Sold cards: grayscale photo at 85% opacity, gold "SOLD" badge, sold price
  shown with the original struck through if different.

Status badge colors:

| Status | Background | Text |
|---|---|---|
| Active | `--color-success-bg` | `--color-success` |
| Coming Soon | `--color-info-bg` | `--color-info` |
| Pending | `--color-warning-bg` | `--color-warning` |
| Sold | `--color-royal-900` | `--color-azure-400` |

### Filter bar

Desktop: a single horizontal row inside a raised surface, sticky under the
header. Mobile: a compact trigger row that opens a full-screen sheet.

- Each control shows its current value as its label when active
  ("$400k – $700k"), not the placeholder.
- Active filters render as removable chips beneath the bar.
- "Clear all" appears only when at least one filter is set.
- Result count updates live and is announced with `aria-live="polite"`.
- Options come from `listing_facets`. An option with `total = 0` is disabled
  with the count shown, never silently hidden — a disabled option teaches the
  user what exists.

### Gallery

- Above the fold: a hero image plus a 2x2 thumbnail grid on desktop; a swipe
  carousel with dot indicators on mobile.
- Click opens a lightbox: keyboard arrows, Escape closes, focus trapped, focus
  returns to the trigger on close.
- Every image has real alt text from the DB. Never "listing photo".
- Blurhash placeholder on every image.

### Forms

- Label above the input, always visible. **No placeholder-as-label, ever.**
- Input height 44px, 12px horizontal padding, `--radius-md`.
- Error: red 1px border, message below in `--color-danger` at `--text-sm`, with
  an icon. Linked via `aria-describedby`, input gets `aria-invalid`.
- Required marked with a visible "Required", not a bare asterisk.
- Success: inline confirmation replaces the form; do not navigate away.
- Font size 16px minimum on all inputs — smaller triggers iOS zoom.

### Other required primitives

Accordion (FAQ), Tabs (admin forms), Toast, Dialog, Sheet (mobile filters),
Dropdown, Breadcrumb, Pagination, Badge, Chip, Avatar, Skeleton, EmptyState,
Table (admin, becomes a card list below 768px), Stat tile, Rich-text renderer.

---

## 7. Imagery

- Property photography is the loudest element on any page. Everything else
  recedes.
- Aspect ratios: cards 4:3, hero 16:9 (21:9 above 1280px), article cover 16:9,
  agent portrait 4:5.
- **Scrim required** for any text over an image:
  `linear-gradient(to top, rgb(10 20 32 / 0.85), rgb(10 20 32 / 0.25) 55%, transparent)`.
  Never place text on a raw photograph.
- Above-the-fold hero image: `priority`, `fetchPriority="high"`. Everything
  else: `loading="lazy"`.
- Decorative images get `alt=""` and `aria-hidden`. Meaningful images get real
  descriptions.

---

## 8. Iconography

Lucide React, 1.5px stroke, sizes 16 / 20 / 24 only. Icons are always paired
with a text label except in the admin toolbar, where an icon-only button
requires an `aria-label` and a tooltip.

---

## 9. Accessibility baseline

WCAG 2.1 AA is a requirement, not an aspiration.

- Contrast: 4.5:1 body text, 3:1 large text and UI boundaries.
- Every interactive element reachable and operable by keyboard, in visual order.
- Visible focus on everything focusable.
- "Skip to content" as the first focusable element.
- One `h1` per page; heading levels never skip.
- Landmarks: `header`, `nav`, `main`, `aside`, `footer`, each labelled when
  repeated.
- Live regions for result counts, form status and toasts.
- Forms fully labelled and error-linked.
- Color is never the only carrier of meaning — status badges pair color with
  text.
- Zoom to 200% without loss of content or function.
- `prefers-reduced-motion` honored globally.
- Target size 44x44 CSS px minimum on touch.

---

## 10. Tailwind theme wiring

```css
/* app/globals.css */
@import "tailwindcss";

@theme {
  /* colors: full palette + semantic aliases from § 1 */
  /* fonts */
  --font-display: var(--font-fraunces), Georgia, 'Times New Roman', serif;
  --font-body: var(--font-inter), ui-sans-serif, system-ui, -apple-system, sans-serif;
  /* text sizes from § 2, spacing from § 3, radius, shadows, easings, durations */

  --breakpoint-xs: 22.5rem;  /* 360 */
  --breakpoint-sm: 30rem;    /* 480 */
  --breakpoint-md: 48rem;    /* 768 */
  --breakpoint-lg: 64rem;    /* 1024 */
  --breakpoint-xl: 80rem;    /* 1280 */
  --breakpoint-2xl: 96rem;   /* 1536 */
}

@layer base {
  html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; }
  body {
    background: var(--color-background);
    color: var(--color-foreground);
    font-family: var(--font-body);
    font-size: var(--text-body);
    line-height: 1.7;
    -webkit-font-smoothing: antialiased;
  }
  h1, h2, h3 { font-family: var(--font-display); text-wrap: balance; }
  p { text-wrap: pretty; }
  :focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px; }
  ::selection { background: var(--color-gold-200); color: var(--color-ink-950); }
}
```

shadcn/ui components are generated, then their color classes are rewritten once
to semantic tokens. After that, generated files are not hand-edited — wrap
instead.

---

## 11. Definition of done for any UI work

1. Uses only semantic tokens. No hex, no arbitrary values.
2. Renders correctly at 360 / 480 / 768 / 1024 / 1440.
3. All interactive states implemented, including `focus-visible` and `loading`.
4. Keyboard-operable end to end.
5. Empty, loading and error states exist and are designed, not default.
6. Contrast checked against the § 1 table.
7. No layout shift — dimensions reserved for every image and async block.
8. `prefers-reduced-motion` respected.
9. Zero axe-core violations on the page.
