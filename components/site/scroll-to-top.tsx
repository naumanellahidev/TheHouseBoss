"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * A new page starts at the top of the page.
 *
 * ── Why this is needed at all ─────────────────────────────────────────────
 *
 * The App Router does scroll on navigation, but the way it decides WHERE is
 * fragile here. It looks at the first element of the new route segment, asks
 * whether the top of it is in the viewport, and scrolls it into view if not.
 * On a listing page the segment contains a `position: fixed` action bar pinned
 * to the bottom of the window; its rect is nowhere near the top, so the check
 * fails and the router scrolls to the next thing it finds instead. Measured
 * before this component: navigating from /search to a listing landed at
 * scrollY 716 — a whole hero below where the page starts.
 *
 * The fix is not "reorder that one page". Any page can grow a fixed element,
 * and a rule that only holds while nobody adds one is not a rule. This makes
 * the guarantee explicit and route-independent.
 *
 * ── The two cases it must NOT touch ───────────────────────────────────────
 *
 * Back and forward restore the position the reader left, and clobbering that
 * is the single most irritating thing a scroll handler can do — you press back
 * from a listing and lose your place in the results. `popstate` fires before
 * the route change commits, so the flag it sets is still true when the effect
 * below runs, and that navigation is left alone.
 *
 * A URL with a hash is asking for a specific element, not the top. `#faq` on a
 * guide is a link somebody sent deliberately.
 *
 * ── Why scroll-behavior is turned off around it ───────────────────────────
 *
 * `html { scroll-behavior: smooth }` makes in-page anchors glide, which is
 * wanted — and would make THIS animate, which is not: a page that visibly
 * slides up on arrival reads as a bug, and an animated scroll can also be
 * overtaken by the router's own. It is restored immediately afterwards.
 */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();
  const isFirstRender = React.useRef(true);
  const cameFromHistory = React.useRef(false);

  React.useEffect(() => {
    const onPopState = () => {
      cameFromHistory.current = true;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  React.useEffect(() => {
    /*
      Never on arrival. The first paint is either already at the top or has a
      restored position the browser chose, and neither is ours to override.
    */
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (cameFromHistory.current) {
      cameFromHistory.current = false;
      return;
    }

    if (window.location.hash) return;

    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    window.scrollTo(0, 0);

    /*
      And once more on the next frame.

      The router's own scroll runs in the layout phase, before this effect, but
      what it starts is an ANIMATION that carries on across frames. An instant
      scroll aborts one already in flight; a second pass catches one that
      started late.
    */
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      root.style.scrollBehavior = previous;
    });

    return () => {
      cancelAnimationFrame(frame);
      root.style.scrollBehavior = previous;
    };
  }, [pathname]);

  return null;
}
