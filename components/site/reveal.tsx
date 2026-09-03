"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Reveal content as it enters the viewport.
 *
 * One shared IntersectionObserver for every instance on the page rather than
 * one each: a dozen observers on the home page is a dozen sets of callbacks
 * competing for the same main thread the Lighthouse score is already short on.
 *
 * Fires once and unobserves. A reveal that re-triggers on scroll-up is the
 * thing that makes a site feel restless rather than considered.
 *
 * Reduced motion is handled entirely in CSS (`app/globals.css`): the reduce
 * block forces `.reveal` to full opacity and no transform, and zeroes
 * `transition-delay` so a stagger cannot survive as a sequence of pops. That is
 * why `delay` below is safe.
 *
 * If JavaScript never runs, the element stays at `opacity: 0` — which is why
 * this is used for presentation only. Nothing that must be readable, and
 * nothing a crawler needs, may depend on it. The markup is server-rendered
 * either way, so the content is in the HTML source regardless.
 */

type Entry = { element: Element; reveal: () => void };

let observer: IntersectionObserver | null = null;
const registry = new Map<Element, Entry>();

function ensureObserver(): IntersectionObserver {
  observer ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        registry.get(entry.target)?.reveal();
        registry.delete(entry.target);
        observer?.unobserve(entry.target);
      }
    },
    // A little before the element arrives, so the transition is finishing as it
    // reaches comfortable reading position rather than starting there.
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
  );
  return observer;
}

export function Reveal({
  children,
  /** Stagger, in ms. Capped at 240 — beyond that it reads as a page that is slow. */
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  as?: "div" | "section" | "li" | "article";
  className?: string;
}) {
  const ref = React.useRef<HTMLElement>(null);
  const [revealed, setRevealed] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Already past it on load — a deep link or a restored scroll position.
    // Reveal immediately rather than waiting for a scroll that may never come.
    if (element.getBoundingClientRect().top < window.innerHeight) {
      setRevealed(true);
      return;
    }

    const io = ensureObserver();
    registry.set(element, { element, reveal: () => setRevealed(true) });
    io.observe(element);

    return () => {
      registry.delete(element);
      io.unobserve(element);
    };
  }, []);

  return (
    <Tag
      // `Tag` is one of several element types, so the ref is widened to the
      // common base. Every DOM API used above (getBoundingClientRect, observe)
      // lives on Element, so nothing narrower is needed.
      ref={ref as React.Ref<never>}
      className={cn("reveal", className)}
      data-revealed={revealed}
      style={delay > 0 ? { transitionDelay: `${Math.min(delay, 240)}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
