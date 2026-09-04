"use client";

import * as React from "react";

import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";

/**
 * The custom cursor.
 *
 * Desktop, fine-pointer, motion-allowed only. It is decoration, so it is
 * `aria-hidden` and `pointer-events: none` — it must never be able to intercept
 * a click or be announced.
 *
 * **The real cursor is never hidden.** Plenty of implementations set
 * `cursor: none` on the body and draw their own; that breaks text selection
 * affordances, native resize cursors and the disabled state, and leaves anyone
 * whose JavaScript fails with no pointer at all. This draws a ring that trails
 * the real cursor instead of replacing it.
 *
 * Labels come from a `data-cursor` attribute on any ancestor, so a component
 * opts in by adding one attribute and does not need to know this exists:
 *
 *   <article data-cursor="Open home">   → the ring expands and reads "Open home"
 *
 * Position is written with `gsap.quickTo`, which writes straight to the
 * transform on its own rAF. Driving this from React state would re-render on
 * every mouse move.
 */
export function CustomCursor() {
  const ring = React.useRef<HTMLDivElement>(null);
  const [label, setLabel] = React.useState<string | null>(null);
  const [active, setActive] = React.useState(false);

  React.useEffect(() => {
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (!fine || prefersReducedMotion()) return;

    const element = ring.current;
    if (!element) return;

    gsap.set(element, { xPercent: -50, yPercent: -50, opacity: 0 });

    const moveX = gsap.quickTo(element, "x", { duration: 0.35, ease: "power3" });
    const moveY = gsap.quickTo(element, "y", { duration: 0.35, ease: "power3" });

    let shown = false;
    const onMove = (event: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to(element, { opacity: 1, duration: 0.2 });
      }
      moveX(event.clientX);
      moveY(event.clientY);

      // Read the label from whatever is under the pointer. `closest` walks up,
      // so a nested link inside a card still reports the card's label.
      const target = event.target as Element | null;
      const holder = target?.closest?.("[data-cursor]") as HTMLElement | null;
      const next = holder?.dataset.cursor ?? null;

      setLabel((current) => (current === next ? current : next));
      const interactive = Boolean(
        next || target?.closest?.("a, button, [role='button'], input, select, textarea"),
      );
      setActive((current) => (current === interactive ? current : interactive));
    };

    // Leaving the window entirely should hide it, or it strands at the edge.
    const onLeave = () => {
      shown = false;
      gsap.to(element, { opacity: 0, duration: 0.2 });
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(element);
    };
  }, []);

  return (
    <div
      ref={ring}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-50 hidden opacity-0 lg:block motion-reduce:lg:hidden"
    >
      <span
        className={[
          "flex items-center justify-center rounded-full border transition-[width,height,background-color,border-color]",
          "duration-(--dur-base) ease-(--ease-out)",
          label
            ? "h-20 w-20 border-transparent bg-accent text-accent-fg"
            : active
              ? "size-12 border-accent bg-accent/10"
              : "size-8 border-accent/70",
        ].join(" ")}
      >
        {label ? (
          <span className="text-overline font-semibold tracking-[0.08em] uppercase">
            {label}
          </span>
        ) : null}
      </span>
    </div>
  );
}
