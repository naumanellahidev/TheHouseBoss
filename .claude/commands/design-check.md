---
description: Audit a page or component against the design system and the responsive contract
argument-hint: <route or component path, e.g. /lake-mary or components/listing/PropertyCard.tsx>
---

Audit `$1` against The House Boss design and responsive standards.

Load both the `design-system` and `responsive-audit` skills, then:

1. **Token compliance** — run the hex-literal and arbitrary-value greps. Every
   color, size and spacing value must come from a semantic token.
2. **The gold rule** — find every use of `--color-accent`. Gold as a surface is
   fine; gold as text on a light background is a defect and must be
   `accent-quiet`.
3. **Typography** — Fraunces on h1/h2/h3 and hero text only; Inter everywhere
   else. Every size from the `--text-*` scale. Nothing below 16px for body or
   inputs.
4. **States** — every interactive element has default, hover, active,
   focus-visible, disabled, and loading where async.
5. **Data states** — loaded, skeleton at exact dimensions, empty with a next
   action, error with a retry.
6. **Responsive** — check every width from 360 to 1440 against
   `docs/04-responsive-spec.md`. Report any horizontal overflow with the
   specific culprit element.
7. **Touch** — every target at least 44 x 44 px; no hover-only affordance.
8. **Images** — `width`/`height` present, `sizes` correct for the context,
   `onError` fallback, aspect-ratio box, scrim behind any text over a photo.
9. **Accessibility** — heading order, labels, focus order, contrast, live
   regions, reduced motion.

Report findings grouped by severity: defects that must be fixed, then
improvements worth making, then notes. For each defect give the file, the line,
and the specific fix — not a general principle.
