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
 * Reduced motion is handled inside `revealOnScroll` — the elements are set to
 * their final state immediately, never left invisible. That matters more here
 * than usual, because GSAP writes inline styles and an inline style beats the
 * `prefers-reduced-motion` block in `globals.css`; the CSS guard cannot save us.
 *
 * The cleanup return from `revealOnScroll` is not optional. A ScrollTrigger
 * that outlives its element holds a detached node and recalculates on every
 * scroll — the classic GSAP leak in a client-routed app, where components
 * unmount constantly but the page never reloads to clear them.
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

    return revealOnScroll(targets, { stagger, y });
  }, [stagger, y, mode]);

  return (
    <Tag ref={host as React.Ref<never>} className={className}>
      {children}
    </Tag>
  );
}
