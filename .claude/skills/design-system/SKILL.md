---
name: design-system
description: Load BEFORE writing or editing any UI in this project — a page, a component, a layout, a Tailwind class, or anything in app/globals.css. Supplies the House Boss token contract (Luxury Authority — navy/gold/bone, Fraunces + Inter), the component state checklist, and the rules that keep every screen consistent. Also use when reviewing UI someone else wrote.
---

# Design System Enforcement

Full reference: `docs/03-design-system.md`. This skill is the working checklist.

## Before writing anything

1. Read `docs/03-design-system.md` § 1 (color) and § 2 (typography) if you have
   not this session.
2. Check whether the component already exists in `components/ui/`,
   `components/site/`, or `components/listing/`. **Extend, do not duplicate.**
3. Identify which semantic tokens the piece needs. If one is missing, add it to
   the `@theme` block in `app/globals.css` **first**, then use it.

## The token contract

Use semantic tokens only. Never a palette token directly, never a hex literal,
never an arbitrary value.

```
✅  bg-surface  text-foreground  border-border  text-accent-quiet
❌  bg-[#FDFCFA]  text-[#26241F]  bg-gold-500 (raw palette)  p-[13px]
```

Semantic tokens available:

```
background  surface  surface-sunken  surface-raised
foreground  foreground-muted  foreground-subtle  foreground-invert
border  border-strong
primary  primary-hover  primary-fg
accent  accent-hover  accent-fg  accent-quiet  accent-wash
ring  ring-invert
surface-invert  foreground-invert  foreground-invert-muted  border-invert
success/-bg  warning/-bg  danger/-bg  info/-bg
```

## The gold rule — the mistake this palette invites

`--color-accent` (`#C9A227`) is **2.36:1** on the light background. It fails for
text. Every figure here is computed by `npm run check:contrast`, not estimated.

- Gold as a **surface** (button fill, badge, rule, underline) -> `accent`
- Gold as **text on light** -> `accent-quiet` (`#826713`, 5.25:1)
- Gold as **text on navy** -> `accent` (7.14:1) or `gold-400` (9.29:1)
- Gold text on bone using `accent` -> **defect**

Two related traps:

- **Input borders.** `--color-border` is a decorative divider, far below 3:1. A
  form control's border is what identifies it (WCAG 1.4.11), so inputs, selects
  and textareas use `--color-border-strong` (3.25:1).
- **Focus rings.** `--color-ring` is `gold-600`, not `gold-500`, because the ring
  must clear 3:1 on **both** grounds. On inverted surfaces use
  `--color-ring-invert` (`gold-400`).

Run `npm run check:contrast` after touching any color token. It parses the real
hex values out of `globals.css` and fails the build on any pairing below AA.

## Typography rules

- `font-display` (Fraunces) on h1, h2, h3, hero text, and the large price on a
  listing detail page. Nothing else.
- `font-body` (Inter) everywhere else, including h4.
- Sizes come from the `--text-*` scale. Never `text-[19px]`.
- Body copy is never below 16px. Inputs are never below 16px (iOS zoom).
- `--text-xs` (13px) is for labels and metadata only, never for sentences.
- Numeric columns and prices get `tabular-nums`.
- `text-wrap: balance` on headings, `pretty` on paragraphs.

## Spacing

Only these steps: `0 1 2 3 4 5 6 8 10 12 16 20 24 32`.
Section rhythm: 48px mobile → 64px tablet → 96px desktop.
Container 1280px max; prose 720px; gutters 20 / 24 / 32.

## Every interactive component needs

- [ ] default
- [ ] hover
- [ ] active
- [ ] **focus-visible** — `outline: 2px solid var(--color-ring); outline-offset: 2px`
- [ ] disabled
- [ ] loading, where an async action exists (width locked, no reflow)

Never `outline: none` without a replacement. Never `:focus` alone.

## Every data-bearing component needs

- [ ] loaded state
- [ ] loading skeleton at the **exact** final dimensions
- [ ] empty state with a next action
- [ ] error state with a retry

## HTML validity traps that axe catches late

These have each been introduced once already in this project. Check them by
inspection rather than waiting for the accessibility run.

- **`<dl>` structure.** A `<div>` inside a `<dl>` may contain **only** a `dt`/`dd`
  group. No wrapper `<span>` for an icon, no nested `<div>`, no trailing `<p>`
  for a hint. Put the icon inside the `<dt>` and the hint inside the `<dd>`.
- **One `<h1>` per page.** A specimen or a type sample must use a `<div>` with
  the heading class, never a real heading element.
- **A `<main>` landmark on every route.** Routes outside the `(marketing)` group
  need their own layout providing one.
- **Accessible name must contain the visible text** (WCAG 2.5.3). An
  `aria-label` on a link whose visible text differs — a logo, an icon button
  with a caption — fails. Prefer no `aria-label` when visible text already names
  the control, and mark decorative SVGs `aria-hidden`.

## Images

- Always through `<PropertyImage />` or an equivalent that has an `onError`
  fallback.
- `width` and `height` always passed from the DB. Zero CLS.
- `sizes` correct for the context — see `docs/04-responsive-spec.md` § 7.
- Aspect-ratio box on every image container.
- Scrim behind any text over a photo. Never raw text on an image.

## Motion

- `transform` and `opacity` only.
- Durations from `--dur-*`; easings from `--ease-*`.
- Card hover: `translateY(-2px)` plus a one-rung shadow change. Nothing more.
- No parallax, no scroll-jacking, no auto-playing carousel.
- The global `prefers-reduced-motion` block must remain in `globals.css`.

## Elevation ladder

page 0 → card `sm` → card hover `md` → dropdown `lg` → modal `xl`.
Never skip a rung. Shadows are navy-tinted, never neutral gray.

## Before you say a component is done

Run this list:

1. No hex, no arbitrary value, no raw palette token
2. Every state above implemented
3. Contrast checked, especially any gold
4. Keyboard operable, focus visible
5. Renders at 360 / 480 / 768 / 1024 / 1440
6. Touch targets ≥ 44px
7. No layout shift
8. Added to `/dev/styleguide` if it is a new primitive

## Self-check commands

```bash
npm run check:tokens     # hex literals and arbitrary px outside globals.css
npm run check:contrast   # every documented pairing against WCAG 2.1 AA
npm run guards           # both of the above, plus migrations, typecheck, lint
```

All must be clean before a component is done.
