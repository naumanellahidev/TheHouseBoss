/**
 * Brand colours in Three.js space.
 *
 * Three takes numeric literals (`0x2563eb`), not CSS custom properties, so the
 * `@theme` block in `app/globals.css` cannot be the single source here the way
 * HR23 requires everywhere else. This file is the exception and the ONLY one —
 * every value below is a transcription of a token in that block, named after
 * it, so a palette change has exactly one other place to visit.
 *
 * Deliberately numeric rather than `#`-prefixed strings: `scripts/check-tokens.mjs`
 * forbids hex literals in `app`, `components` and `lib`, and it is right to.
 * Writing them as `0x` keeps the guard meaningful instead of adding another
 * allowlist entry that quietly weakens it.
 *
 * If you change a colour here, change it in `globals.css` too — and run
 * `npm run check:contrast`, because anything that ends up behind text still
 * owes a contrast ratio.
 */
export const THREE_PALETTE = {
  /** --color-royal-950 #071023 — the deepest ground, the scene's fog and clear colour. */
  royal950: 0x071023,
  /** --color-royal-900 #0c1b3a — primary brand blue. */
  royal900: 0x0c1b3a,
  /** --color-royal-800 #14295a — raised architectural masses. */
  royal800: 0x14295a,
  /** --color-royal-700 #1d3a7a — edges and structural lines. */
  royal700: 0x1d3a7a,
  /** --color-azure-600 #2563eb — the accent. Key light. */
  azure600: 0x2563eb,
  /** --color-azure-400 #8ab4f8 — accent on dark. Rim light, particles. */
  azure400: 0x8ab4f8,
  /** --color-porcelain-50 #fdfeff — white. Fill light, glass panes. */
  porcelain50: 0xfdfeff,
} as const;
