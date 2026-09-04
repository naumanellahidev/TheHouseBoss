"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * One place that registers GSAP, so a plugin is never registered twice and no
 * component has to remember to.
 *
 * `gsap.registerPlugin` is idempotent, but the import is not free and the
 * registration order matters once there is more than one plugin — centralising
 * it means a second plugin is added here and nowhere else.
 */
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Does this visitor want motion?
 *
 * Checked in JavaScript as well as CSS because GSAP writes inline styles, and
 * an inline style beats the `prefers-reduced-motion` block in `globals.css`.
 * The CSS guard cannot save us here — every timeline has to ask.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger };

/**
 * The standard section reveal.
 *
 * Returns a cleanup function, and callers MUST call it. A ScrollTrigger that
 * outlives its element keeps a reference to a detached node and recalculates on
 * every scroll — the classic GSAP leak in a client-routed app, where components
 * unmount constantly but the page never reloads to clear them.
 *
 * Under reduced motion the elements are set to their final state immediately
 * rather than animated, so content is never left invisible.
 */
export function revealOnScroll(
  targets: Element | Element[] | NodeListOf<Element>,
  options: { stagger?: number; y?: number; delay?: number } = {},
): () => void {
  const items = Array.from(
    targets instanceof Element ? [targets] : (targets as ArrayLike<Element>),
  );
  if (items.length === 0) return () => {};

  if (prefersReducedMotion()) {
    gsap.set(items, { y: 0, clearProps: "transform" });
    return () => {};
  }

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
