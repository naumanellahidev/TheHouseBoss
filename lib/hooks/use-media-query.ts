"use client";

import * as React from "react";

/**
 * Media query as React state, via useSyncExternalStore so it stays correct
 * across concurrent renders.
 *
 * The server snapshot is always `false`. Every caller phrases its query so that
 * `false` means the desktop layout: the admin editor is a desktop-first screen
 * (docs/06 § 11 rule 8), so rendering the desktop branch on the server means no
 * visible switch for the machine this is actually used on.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    [query],
  );

  return React.useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Below the `md` breakpoint — where tables become cards and tabs become an accordion. */
export const useIsCompact = () => useMediaQuery("(max-width: 767px)");
