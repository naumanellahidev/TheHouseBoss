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
| `--color-ink-950` | `#0A1420` | Deepest ground, footer |
| `--color-ink-900` | `#0F1B2D` | **Primary brand navy** — header, hero overlay |
| `--color-ink-800` | `#16263F` | Raised surfaces on dark |
| `--color-ink-700` | `#1E3552` | Borders on dark, hover on dark |
| `--color-ink-600` | `#2C4767` | Muted text on dark |
| `--color-gold-600` | `#856A14` | **Gold as text on light** — the only gold that passes AA |
| `--color-gold-500` | `#C9A227` | **Primary accent** — CTAs, rules, active states |
| `--color-gold-400` | `#DDBB4C` | Hover on dark |
| `--color-gold-200` | `#F0E2AE` | Tints, badges |
| `--color-gold-50` | `#FBF6E6` | Accent wash background |
| `--color-bone-50` | `#FDFCFA` | Page ground (light) |
| `--color-bone-100` | `#F7F5F0` | Section alternate |
| `--color-bone-200` | `#EFEBE3` | Card ground, input ground |
| `--color-bone-300` | `#DFD9CE` | Borders |
| `--color-stone-500` | `#6E6A62` | Subtle text on light |
| `--color-stone-700` | `#57544E` | Secondary text |
| `--color-stone-900` | `#26241F` | Body text on light |

### Semantic tokens

Components reference **only** these. Never a raw palette token.

```css
@theme {
  --color-background:        var(--color-bone-50);
  --color-surface:           #FFFFFF;
  --color-surface-sunken:    var(--color-bone-100);
  --color-surface-raised:    #FFFFFF;

  --color-foreground:        var(--color-stone-900);
  --color-foreground-muted:  var(--color-stone-700);
  --color-foreground-subtle: var(--color-stone-500);
  --color-foreground-invert: var(--color-bone-50);

  --color-border:            var(--color-bone-300);
  --color-border-strong:     #948C7C;   /* 3:1 — control boundaries */

  --color-primary:           var(--color-ink-900);
  --color-primary-hover:     var(--color-ink-800);
  --color-primary-fg:        var(--color-bone-50);

  --color-accent:            var(--color-gold-500);
  --color-accent-hover:      var(--color-gold-400);
  --color-accent-fg:         var(--color-ink-950);
  --color-accent-quiet:      var(--color-gold-600);   /* accent as TEXT on light */
  --color-accent-wash:       var(--color-gold-50);

  --color-ring:              var(--color-gold-600);   /* 3:1 on BOTH grounds */
  --color-ring-invert:       var(--color-gold-400);   /* stronger on navy */

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

| Combination | Ratio | Need | Allowed |
|---|---|---|---|
| `stone-900` on `bone-50` | 15.12:1 | 4.5 | Body text ✅ |
| `stone-700` on `bone-50` | 7.36:1 | 4.5 | Secondary text ✅ |
| `stone-500` on `bone-50` | 5.25:1 | 4.5 | Subtle text ✅ |
| `stone-500` on `bone-100` | 4.94:1 | 4.5 | Subtle text on a sunken section ✅ |
| `gold-600` on `bone-50` | 5.03:1 | 4.5 | Accent text on light ✅ |
| `gold-600` on `bone-100` | 4.74:1 | 4.5 | Accent text on sunken ✅ |
| `gold-600` on `ink-900` | 3.35:1 | 3.0 | Focus ring on navy ✅ |
| `gold-400` on `ink-900` | 9.29:1 | 4.5 | Accent text on navy ✅ |
| `gold-500` on `ink-900` | 7.14:1 | 4.5 | Accent text on navy ✅ |
| `ink-950` on `gold-500` | 7.66:1 | 4.5 | Gold button label ✅ |
| `bone-50` on `ink-900` | 16.86:1 | 4.5 | Inverted body ✅ |
| `border-strong` on `bone-50` | 3.25:1 | 3.0 | Input and outline borders ✅ |
| `gold-500` on `bone-50` | 2.36:1 | 4.5 | ❌ **Never for text** |

**The one trap in this palette.** `--color-accent` (`gold-500`) is 2.36:1 on the
page ground — it fails for text. It is for **surfaces and marks**: button fill,
badge, rule, underline. For accent-colored **text on light**, use
`--color-accent-quiet` (`gold-600`, 5.03:1). On navy, `gold-500` is 7.14:1 and
is fine as text.

Two consequences that are easy to get wrong:

- **Input borders.** `--color-border` (`bone-300`) is a decorative divider and
  is far below 3:1. A form control's border is what identifies it against the
  page (WCAG 1.4.11), so every input, select and textarea uses
  `--color-border-strong`.
- **The focus ring.** `--color-ring` is `gold-600`, not `gold-500`, because the
  ring must clear 3:1 on **both** grounds. On inverted surfaces use
  `--color-ring-invert` (`gold-400`, 9.29:1) for a visibly stronger ring.

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
--radius-lg: 12px;   /* cards */
--radius-xl: 20px;   /* hero panels, modals */
--radius-full: 9999px;
```

Photography is never rounded above `--radius-lg`. Round corners on a property
photo past 12px looks like a social app, not a listing.

### Elevation

Shadows are soft and navy-tinted, never neutral gray.

```css
--shadow-xs: 0 1px 2px rgb(15 27 45 / 0.05);
--shadow-sm: 0 1px 3px rgb(15 27 45 / 0.07), 0 1px 2px rgb(15 27 45 / 0.04);
--shadow-md: 0 4px 12px rgb(15 27 45 / 0.08), 0 2px 4px rgb(15 27 45 / 0.04);
--shadow-lg: 0 12px 32px rgb(15 27 45 / 0.10), 0 4px 8px rgb(15 27 45 / 0.05);
--shadow-xl: 0 24px 64px rgb(15 27 45 / 0.14);
```

Elevation ladder: page 0 → card `sm` → card hover `md` → dropdown `lg` →
modal `xl`. Never skip a rung.

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
| Sold | `--color-ink-900` | `--color-gold-500` |

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
