"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { gsap, prefersReducedMotion } from "@/lib/motion/gsap";

/**
 * Route transitions.
 *
 * A short fade-and-lift on the new page when the pathname changes. Deliberately
 * an ENTRANCE only, with no exit animation, and that is a considered choice
 * rather than a shortcut: the App Router gives no hook that reliably fires
 * before navigation commits, so an "exit" has to be faked by intercepting every
 * link and delaying the push. That adds latency to every click, breaks
 * browser-native back/forward and middle-click, and fails whenever navigation
 * starts from somewhere that is not a link. A fast entrance reads as polish; a
 * delayed exit reads as a slow site.
 *
 * Duration is deliberately short. Anything past ~350ms on a route change stops
 * feeling like craft and starts feeling like waiting.
 *
 * Under reduced motion this renders its children and does nothing else.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const container = React.useRef<HTMLDivElement>(null);
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    /*
      THE FIRST PAINT IS NEVER ANIMATED.

      Fading the initial page in from opacity 0 delays server-rendered content
      that is already there, and for the ~320ms of the tween every piece of text
      on the page is invisible. That is not a theoretical concern: axe reported
      723 colour-contrast violations across ten pages, because it sampled the
      document mid-fade and every element composited to its background.

      A route change is different — the content genuinely is new, and the
      transition is what stops it snapping in. So: animate on navigation, never
      on arrival.
    */
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const element = container.current;
    if (!element || prefersReducedMotion()) return;

    const tween = gsap.fromTo(
      element,
      { opacity: 0, y: 8 },
      {
        opacity: 1,
        y: 0,
        duration: 0.32,
        ease: "power2.out",
        // Clear the inline transform when finished. Left in place it creates a
        // containing block, which silently breaks `position: fixed` descendants
        // — the sticky header and the mobile nav sheet both live inside here.
        clearProps: "transform",
      },
    );

    return () => {
      tween.kill();
    };
  }, [pathname]);

  return <div ref={container}>{children}</div>;
}
