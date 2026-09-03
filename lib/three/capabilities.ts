/**
 * Can this device have the 3D scene at all?
 *
 * This lives outside the Three components on purpose. It has to be answerable
 * BEFORE `next/dynamic` is asked for the canvas, because a dynamic import is
 * triggered by rendering the component, not by the component deciding to draw.
 *
 * That distinction was a measured bug, not a theoretical one: with the check
 * inside `HeroCanvas`, every phone downloaded the entire 866 kB Three chunk and
 * then rendered `null`. Mobile TBT went from 225 ms to 903 ms and the home page
 * lost 13 Lighthouse points for a scene nobody could see.
 *
 * Read through `useSyncExternalStore`. None of these inputs can change without
 * a reload, so `subscribe` is a no-op and the result is cached for the page.
 */

export type Capabilities = { enabled: boolean; quality: "high" | "low" };

export const DISABLED: Capabilities = { enabled: false, quality: "low" };

function supportsWebGl(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

function detect(): Capabilities {
  // Continuous motion, so a reduced-motion preference rules it out entirely
  // rather than merely slowing it down.
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  // Touch devices get the photographic composition — the client's decision,
  // taken because mobile Performance is already short of the >=90 target and a
  // WebGL canvas is the most expensive thing that could be added to it.
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const narrow = window.innerWidth < 1024;

  if (reduced || coarse || narrow || !supportsWebGl()) return DISABLED;

  // `deviceMemory` is Chromium-only. Absent elsewhere, which is fine — a
  // browser that does not report it is not necessarily low-powered.
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  return {
    enabled: true,
    quality: typeof memory === "number" && memory <= 4 ? "low" : "high",
  };
}

let cached: Capabilities | null = null;

export function getCapabilities(): Capabilities {
  cached ??= detect();
  return cached;
}

/** Server snapshot: never 3D, so the first client render agrees with the HTML. */
export const getServerCapabilities = () => DISABLED;

export const noopSubscribe = () => () => {};
