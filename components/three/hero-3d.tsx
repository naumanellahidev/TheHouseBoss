"use client";

import * as React from "react";
import dynamic from "next/dynamic";

import {
  getCapabilities,
  getServerCapabilities,
  noopSubscribe,
} from "@/lib/three/capabilities";

/**
 * The boundary between the page and the 3D bundle.
 *
 * `ssr: false` is what keeps Three off the server — it touches `window`,
 * `document` and a WebGL context at module scope, so server-rendering it is a
 * guaranteed "window is not defined". In the App Router `ssr: false` is only
 * legal inside a Client Component, which is why this thin wrapper exists rather
 * than the import living in the page.
 *
 * The practical effect is that `three`, `@react-three/fiber` and `drei` are a
 * separate 866 kB chunk, requested only after the page is interactive and only
 * on devices that pass `lib/three/capabilities.ts` — which is checked *below*,
 * before `<HeroCanvas />` is rendered, for the reason documented there. A phone
 * downloads none of it: measured at 0 bytes.
 *
 * There is no loading skeleton on purpose: the hero already renders its
 * photographic composition underneath, and the canvas fades in over it. A
 * spinner here would announce a decoration nobody asked to wait for.
 */
const HeroCanvas = dynamic(() => import("@/components/three/hero-canvas"), {
  ssr: false,
});

export function Hero3D() {
  /**
   * Scroll progress as a ref, not state.
   *
   * The scene reads this every frame. Holding it in state would re-render the
   * React tree on every scroll event and defeat the entire point of driving the
   * camera from `useFrame`.
   */
  const progress = React.useRef(0);

  /*
    Decided HERE, before <HeroCanvas /> is rendered.

    next/dynamic fetches on render, not on the component deciding to draw, so
    checking inside HeroCanvas made every phone download 866 kB of Three and
    then return null. Measured: mobile TBT 225ms -> 903ms and 13 Lighthouse
    points, for a scene that never appeared.
  */
  const { enabled } = React.useSyncExternalStore(
    noopSubscribe,
    getCapabilities,
    getServerCapabilities,
  );

  /*
    ARMED ON FIRST INTERACTION, not on hydration.

    The capability gate above keeps Three off phones. On a capable desktop it
    still arrived the moment the page hydrated: 866 kB of JavaScript parsed and
    compiled during exactly the window Lighthouse scores for Total Blocking
    Time, and while a visitor's first click was waiting for the main thread.
    The scene is atmosphere behind the hero, not content — nothing is lost by
    starting it a beat later.

    So the canvas (and with it the dynamic import) is rendered only after the
    visitor first moves the pointer, scrolls, touches or presses a key — on a
    desktop that is usually within the first second — or after six seconds if
    they do none of those. It fades in either way.
  */
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    if (!enabled || armed) return;

    const events = ["pointermove", "scroll", "keydown", "touchstart", "wheel"] as const;
    const arm = () => setArmed(true);
    for (const event of events) {
      window.addEventListener(event, arm, { once: true, passive: true });
    }
    const timer = window.setTimeout(arm, 6000);

    return () => {
      window.clearTimeout(timer);
      for (const event of events) window.removeEventListener(event, arm);
    };
  }, [enabled, armed]);

  React.useEffect(() => {
    if (!enabled) return;

    let frame = 0;
    const onScroll = () => {
      // rAF-throttled, matching the pattern already in components/site/header.tsx.
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const span = window.innerHeight;
        progress.current = Math.min(1, Math.max(0, window.scrollY / span));
        frame = 0;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [enabled]);

  /*
    There is no `mounted` guard here any more, and there should not be one.
    `next/dynamic({ ssr: false })` already renders nothing on the server, so the
    flag was guarding against a render that cannot happen — it only added a
    setState-in-effect and a second render pass.
  */
  // Nothing rendered means nothing imported: the Three chunk is never
  // requested on a device that cannot use it.
  if (!enabled || !armed) return null;

  return (
    <div className="pointer-events-none absolute inset-0 -z-10 opacity-0 [animation:fade-in_var(--dur-page)_var(--ease-out)_forwards] motion-reduce:opacity-100">
      <HeroCanvas scrollRef={progress} />
    </div>
  );
}
