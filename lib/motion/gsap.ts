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
 * The standard section reveal — a 24px rise, staggered, once, as the section
 * reaches 85% of the viewport.
 *
 * NO GSAP. This used to be a GSAP tween driven by ScrollTrigger, which meant
 * the home page and /hire-contractor downloaded and compiled GSAP plus
 * ScrollTrigger on every phone, during the window Lighthouse scores for Total
 * Blocking Time, to move some text 24px. The browser already has both halves:
 * IntersectionObserver for the trigger, the Web Animations API for the motion.
 * Same distance, same easing (power3.out is cubic-bezier(.215,.61,.355,1)),
 * same stagger, same trigger line.
 *
 * TRANSFORM ONLY — no opacity, deliberately. A fade-up leaves below-the-fold
 * content at `opacity: 0` until it is scrolled to, which is genuinely invisible
 * text; axe reports it as a colour-contrast failure and axe is right. A rise
 * alone still reads as a reveal and the text is legible at every moment,
 * including before the trigger fires and if JavaScript never runs.
 *
 * Still returns a promise of a cleanup function, and callers MUST call it:
 * the observer and any running animation are tied to elements that a
 * client-routed app unmounts constantly.
 *
 * Under reduced motion nothing is offset and nothing is observed: the elements
 * are already at their final position, because the offset is applied here
 * rather than as a starting style in CSS.
 */
export async function revealOnScroll(
  targets: Element | Element[] | NodeListOf<Element>,
  options: { stagger?: number; y?: number; delay?: number } = {},
): Promise<() => void> {
  const items = Array.from(
    targets instanceof Element ? [targets] : (targets as ArrayLike<Element>),
  ).filter((el): el is HTMLElement => el instanceof HTMLElement);
  if (items.length === 0) return () => {};

  if (prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
    return () => {};
  }

  const y = options.y ?? 24;
  const stagger = options.stagger ?? 0.08;
  const delay = options.delay ?? 0;
  const offset = `translateY(${y}px)`;
  const running: Animation[] = [];

  // Start offset, exactly as the GSAP `fromTo` did on creation.
  for (const el of items) el.style.transform = offset;

  const play = () => {
    items.forEach((el, i) => {
      const animation = el.animate(
        [{ transform: offset }, { transform: "translateY(0)" }],
        {
          duration: 700,
          easing: "cubic-bezier(0.215, 0.61, 0.355, 1)",
          delay: (delay + i * stagger) * 1000,
          fill: "backwards",
        },
      );
      // The inline offset holds the element down until its turn in the
      // stagger; the animation's `backwards` fill covers the delay, so the
      // inline style can go now and the element ends at its natural position.
      el.style.transform = "";
      running.push(animation);
    });
  };

  // "top 85%" — fire when the first item's top crosses 85% of the viewport.
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        play();
      }
    },
    { rootMargin: "0px 0px -15% 0px" },
  );
  observer.observe(items[0]!);

  return () => {
    observer.disconnect();
    for (const animation of running) animation.cancel();
    for (const el of items) el.style.transform = "";
  };
}
