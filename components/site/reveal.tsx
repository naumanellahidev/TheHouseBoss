"use client";

import * as React from "react";

import { revealOnScroll } from "@/lib/motion/gsap";

/**
 * Scroll choreography.
 *
 * Wraps a section and staggers its direct children in as it enters the
 * viewport. GSAP + ScrollTrigger rather than the CSS/IntersectionObserver
 * version this replaced, so the whole site has ONE reveal mechanism — two would
 * drift apart in timing and easing and look like a bug.
 *
 * Staggering the *children* rather than the wrapper is what makes it read as
 * choreography instead of a fade: an overline, a heading and a grid arriving
 * 80ms apart feels authored; the same three arriving together does not.
 *
 * The motion is IntersectionObserver + the Web Animations API — no library
 * (see `revealOnScroll`; it was GSAP + ScrollTrigger, which put an animation
 * library on every phone's critical path to move text 24px).
 *
 * Reduced motion is handled inside `revealOnScroll`, which returns before it
 * offsets anything. The elements are never left invisible. That matters more
 * here than usual, because the offset is an inline style and an inline style
 * beats the `prefers-reduced-motion` block in `globals.css`; the CSS guard
 * cannot save us.
 *
 * The cleanup return from `revealOnScroll` is not optional. An observer or an
 * animation that outlives its element holds a detached node — in a
 * client-routed app components unmount constantly but the page never reloads
 * to clear them.
 */
export function Reveal({
  children,
  /** Gap between children, in seconds. */
  stagger = 0.08,
  /** How far they travel, in px. */
  y = 24,
  /** Stagger the direct children (default) or animate the wrapper as one. */
  mode = "children",
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  stagger?: number;
  y?: number;
  mode?: "children" | "self";
  as?: "div" | "section" | "ul" | "article";
  className?: string;
}) {
  const host = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const element = host.current;
    if (!element) return;

    const targets =
      mode === "self"
        ? [element]
        : (Array.from(element.children) as Element[]);

    /*
      `revealOnScroll` returns a promise of its cleanup. An effect cannot be
      async, so the cleanup is captured in a mutable slot and a `cancelled`
      flag covers the unmount-before-resolve case — without it, a component
      that unmounts first would leave an observer with no way to disconnect it.
    */
    let cancelled = false;
    let dispose: (() => void) | null = null;

    void revealOnScroll(targets, { stagger, y }).then((cleanup) => {
      if (cancelled) cleanup();
      else dispose = cleanup;
    });

    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [stagger, y, mode]);

  return (
    <Tag ref={host as React.Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
