"use client";

import type { gsap as GsapNamespace } from "gsap";

/**
 * GSAP, loaded on demand rather than imported at the top of every page.
 *
 * ── Why it is not a static import any more ────────────────────────────────
 *
 * It used to be, and `CustomCursor`, `PageTransition` and `Reveal` all sit in
 * the marketing layout — so GSAP was in the critical path of every public page.
 * Measured in the build output: a 111 kB chunk, downloaded and parsed before
 * anything could animate, on a phone that in most cases would never use it.
 *
 * Now it is fetched inside the effect, AFTER the reduced-motion check. Three
 * consequences, all of them wanted:
 *
 *   - It is never on the critical path. The page renders, then the animation
 *     library arrives, then things animate. Nothing waits on it.
 *   - A visitor with `prefers-reduced-motion: reduce` never downloads it at
 *     all. Their effects return before the import, so the 111 kB is not merely
 *     deferred for them, it is skipped.
 *   - A phone that also fails the pointer check for the custom cursor pays for
 *     GSAP only if something else on the page actually animates.
 *
 * ── Why a promise and not a hook ──────────────────────────────────────────
 *
 * The three callers are effects, not renders. A hook would mean a state update
 * and a second render per component for a library that has nothing to say to
 * React. `loadGsap()` is memoised, so the module is fetched once per page even
 * when three components ask for it in the same tick.
 */

type Gsap = typeof GsapNamespace;

let pending: Promise<Gsap> | null = null;

/**
 * Fetch GSAP and register ScrollTrigger, once.
 *
 * `registerPlugin` is idempotent, but the import is not free and registration
 * order matters once there is more than one plugin — centralising it means a
 * second plugin is added here and nowhere else.
 */
export function loadGsap(): Promise<Gsap> {
  pending ??= (async () => {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([
      import("gsap"),
      import("gsap/ScrollTrigger"),
    ]);
    gsap.registerPlugin(ScrollTrigger);
    return gsap;
  })();

  return pending;
}

/**
 * Does this visitor want motion?
 *
 * Checked in JavaScript as well as CSS because GSAP writes inline styles, and
 * an inline style beats the `prefers-reduced-motion` block in `globals.css`.
 * The CSS guard cannot save us here — every timeline has to ask.
 *
 * Deliberately synchronous and free of any GSAP import, which is what lets a
 * caller check it BEFORE deciding whether to download the library.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * The standard section reveal.
 *
 * Returns a promise of a cleanup function, and callers MUST call it. A
 * ScrollTrigger that outlives its element keeps a reference to a detached node
 * and recalculates on every scroll — the classic GSAP leak in a client-routed
 * app, where components unmount constantly but the page never reloads to clear
 * them.
 *
 * Under reduced motion nothing is animated AND nothing is imported: the
 * elements are already at their final position, because the rise below is a
 * transform applied by this function rather than a starting style in CSS.
 */
export async function revealOnScroll(
  targets: Element | Element[] | NodeListOf<Element>,
  options: { stagger?: number; y?: number; delay?: number } = {},
): Promise<() => void> {
  const items = Array.from(
    targets instanceof Element ? [targets] : (targets as ArrayLike<Element>),
  );
  if (items.length === 0) return () => {};

  // Before the import, on purpose. See the note at the top of the file.
  if (prefersReducedMotion()) return () => {};

  const gsap = await loadGsap();

  /*
    TRANSFORM ONLY — no opacity, deliberately.

    A fade-up is the conventional reveal, and it is an accessibility problem:
    content below the fold sits at `opacity: 0` until it is scrolled to, which
    means it is genuinely invisible text. axe reports it as a colour-contrast
    failure and axe is right — a tool or a person sampling the page before that
    scroll sees nothing.

    A 24px rise alone still reads as a reveal, still gives the stagger its
    rhythm, and costs nothing: the text is legible at every moment, including
    before the trigger fires and if JavaScript never runs at all.
  */
  const tween = gsap.fromTo(
    items,
    { y: options.y ?? 24 },
    {
      y: 0,
      duration: 0.7,
      ease: "power3.out",
      delay: options.delay ?? 0,
      stagger: options.stagger ?? 0.08,
      scrollTrigger: {
        trigger: items[0],
        start: "top 85%",
        // `once` rather than toggleActions: a reveal that replays on scroll-up
        // makes a page feel restless rather than considered.
        once: true,
      },
    },
  );

  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
}
