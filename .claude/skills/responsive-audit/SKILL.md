---
name: responsive-audit
description: Run after building or significantly changing any page or layout in this project, before marking it done. Verifies the page against the House Boss responsive contract — nine widths from 360px up, touch targets, iOS Safari traps, table-to-card behavior, image sizes attributes, and zoom reflow. Also use when a layout bug is reported at a specific screen size.
---

# Responsive Audit

Full contract: `docs/04-responsive-spec.md`. Design and responsiveness are the
client's stated top priority — this audit is not a formality.

## 1. Automated pass

```bash
npm run test:responsive
```

Widths: **360, 390, 414, 480, 768, 834, 1024, 1280, 1440**.

The script asserts `document.documentElement.scrollWidth <= clientWidth` at
every width and writes a full-page screenshot to `shots/`.

If the script does not exist yet, run the check inline:

```js
await page.setViewportSize({ width, height: 900 })
await page.goto(url, { waitUntil: 'networkidle' })
const overflow = await page.evaluate(() =>
  document.documentElement.scrollWidth > document.documentElement.clientWidth)
```

**360px is the hard floor.** Any overflow there is a defect, not a nice-to-have.

## 2. Find the overflow culprit

When the assertion fails, run this in the console at the failing width:

```js
[...document.querySelectorAll('*')]
  .filter(el => el.getBoundingClientRect().right > document.documentElement.clientWidth + 1)
  .map(el => ({ el, w: el.getBoundingClientRect().width, cls: el.className }))
```

Usual suspects, in order of frequency:

| Culprit | Fix |
|---|---|
| A table | Wrap in `overflow-x-auto`, or switch to `<ResponsiveTable />` below 768px |
| A fixed-width element | Use `max-width: 100%` or a fluid unit |
| A long unbroken string (URL, address) | `overflow-wrap: anywhere` |
| A filter chip row | Horizontal scroll container with a fade mask |
| A grid with too many columns at that width | Check the grid table in the spec |
| A negative margin | Pair it with matching padding on the parent |
| An absolutely positioned element | Constrain with `inset` and `max-width` |

## 3. Layout conformance

Compare against `docs/04-responsive-spec.md`:

- § 4 for the grid column counts of every component
- § 5 for the section-by-section layout of this specific page

Grid counts most often wrong:

| Component | 360 | 768 | 1024 | 1280 |
|---|---|---|---|---|
| Property cards | 1 | 2 | 3 | 3 (not 4) |
| City tiles | 1 | 2 | 3 | 4 |
| Stat tiles | 2 | 4 | 4 | 4 |
| Footer | 1 | 2 | 4 | 4 |

## 4. Touch and interaction

- [ ] Every interactive element ≥ 44 x 44 CSS px
- [ ] ≥ 8px gap between adjacent targets
- [ ] Nothing revealed only on hover
- [ ] `touch-action: manipulation` on buttons
- [ ] Horizontal scroll containers have momentum scrolling

Measure targets rather than guessing:

```js
[...document.querySelectorAll('a, button, input, select, [role="button"]')]
  .map(el => ({ el, r: el.getBoundingClientRect() }))
  .filter(({ r }) => r.width < 44 || r.height < 44)
```

## 5. iOS Safari specifically

This is where responsive work breaks most often.

- [ ] No `100vh` — use `min(78vh, 640px)` or `dvh` with a fallback
- [ ] Sticky elements have an explicit `top` accounting for the header height
- [ ] All inputs ≥ 16px font size (otherwise the page zooms on focus)
- [ ] Sticky bottom bars use `padding-bottom: max(16px, env(safe-area-inset-bottom))`
- [ ] `overflow-x: clip` on `html`/`body`, **not** `hidden` — `hidden` breaks
      `position: sticky` descendants
- [ ] `backdrop-filter` on the header does not flicker on scroll

## 6. Zoom and reflow

- [ ] 200% zoom at 1280px: content reflows, nothing clipped, nothing overlapping
- [ ] 400% zoom at 1280px (WCAG 1.4.10): still usable, single column acceptable
- [ ] Text-only zoom does not break containers

## 7. Content stress test

Swap in hostile content and re-check:

- [ ] A 90-character street address in a card
- [ ] `$12,500,000` in a price field
- [ ] A 15-word community name in a chip
- [ ] A listing with 0 photos
- [ ] A search with 0 results
- [ ] An article with a 12-column table
- [ ] A city with no published listings

## 8. Images

- [ ] Every image has `width` and `height`
- [ ] `sizes` matches the context (`docs/04-responsive-spec.md` § 7)
- [ ] Above-the-fold hero is `priority`; everything else is lazy
- [ ] No image loads a 1600w variant into an 800px slot

Common `sizes` values:

```
card in 3-col grid: (max-width:767px) 100vw, (max-width:1279px) 50vw, 33vw
listing hero:       (max-width:1023px) 100vw, 66vw
city hero:          100vw
article cover:      (max-width:767px) 100vw, 720px
```

## 9. Manual passes the script cannot do

- [ ] Landscape phone, 844 x 390 — sticky elements must not eat the viewport
- [ ] Fast 3G throttle — skeletons appear, nothing shifts when content lands
- [ ] Keyboard-only navigation at 360px (the mobile nav sheet especially)
- [ ] Real iPhone and real Android, at least once per phase
- [ ] Eyeball every screenshot in `shots/` — the assertion catches overflow, only
      a person catches "this looks wrong at 768px"

## 10. Report

State plainly: which widths pass, which fail, what the culprit is, and what you
changed. If something is deliberately degraded at a width (the listing editor on
a phone, for instance), say so explicitly rather than leaving it looking broken.
