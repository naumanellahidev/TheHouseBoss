"use client";

import * as React from "react";
import { Canvas } from "@react-three/fiber";

import { ArchitecturalScene } from "@/components/three/architectural-scene";
import {
  getCapabilities,
  getServerCapabilities,
  noopSubscribe,
} from "@/lib/three/capabilities";
import { THREE_PALETTE as C } from "@/lib/three/palette";

/**
 * The WebGL boundary.
 *
 * Everything that can refuse to run 3D is decided here, before a canvas is
 * ever mounted, so the caller only has to render a fallback:
 *
 *   - no WebGL context           → refuse (old browsers, blocked GPUs, some VMs)
 *   - prefers-reduced-motion     → refuse; this scene is continuous motion
 *   - coarse pointer / narrow    → refuse; mobile gets the image composition
 *   - deviceMemory <= 4 GB       → low quality
 *
 * The mobile decision is the client's, taken deliberately: mobile Lighthouse
 * Performance is already short of the ≥90 target and a WebGL canvas is the
 * single most expensive thing that could be added to it. `docs/17` § 3 has the
 * numbers.
 *
 * `frameloop` is switched to "demand" when the hero leaves the viewport, which
 * stops the render loop entirely rather than merely hiding it — a canvas that
 * keeps drawing behind the fold is pure battery cost.
 */

export default function HeroCanvas({
  scrollRef,
}: {
  scrollRef: React.RefObject<number>;
}) {
  /*
    Hero3D has already checked this before importing us, so `enabled` is true by
    the time this runs. Re-reading it is deliberate belt-and-braces: this
    component must never mount a WebGL context on a device that refused one,
    whoever renders it in future. The result is cached, so it costs nothing.
  */
  const { enabled, quality } = React.useSyncExternalStore(
    noopSubscribe,
    getCapabilities,
    getServerCapabilities,
  );
  const [visible, setVisible] = React.useState(true);
  const host = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = host.current;
    if (!element || !enabled) return;

    const io = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "120px" },
    );
    io.observe(element);
    return () => io.disconnect();
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={host} className="absolute inset-0" aria-hidden="true">
      <Canvas
        // Capped at 1.5: a 3x device pixel ratio quadruples fragment work for a
        // difference nobody sees on a scene with no fine detail.
        dpr={quality === "high" ? [1, 1.5] : [1, 1]}
        frameloop={visible ? "always" : "demand"}
        camera={{ position: [0, 1.6, 8.4], fov: 42 }}
        gl={{
          antialias: quality === "high",
          powerPreference: "high-performance",
          /*
            TRANSPARENT, and it has to be.

            An opaque buffer is cheaper, but this canvas sits ON TOP of the hero
            photograph — the whole concept is architectural geometry layered
            over real property imagery. With `alpha: false` the canvas paints a
            solid rectangle and the photograph behind it is simply gone, which
            is not a subtle regression: it deletes half the composition.
          */
          alpha: true,
        }}
        onCreated={({ gl, scene }) => {
          // Clear to fully transparent so only the geometry composites.
          gl.setClearColor(C.royal950, 0);
          scene.matrixWorldAutoUpdate = true;
        }}
      >
        {/*
          Fog fades the massing into the photograph at distance instead of
          stopping at a hard silhouette edge, which is what makes the two layers
          read as one image rather than as a render pasted over a photo.
        */}
        <fog attach="fog" args={[C.royal950, 10, 30]} />
        <ArchitecturalScene scrollRef={scrollRef} quality={quality} />
      </Canvas>
    </div>
  );
}
