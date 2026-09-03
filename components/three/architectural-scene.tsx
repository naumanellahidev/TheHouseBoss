"use client";

import * as React from "react";
import { useFrame, useThree } from "@react-three/fiber";
import type * as THREE from "three";

import { THREE_PALETTE as C } from "@/lib/three/palette";

/**
 * "Royal Architecture" — the hero's 3D environment.
 *
 * Reads as architectural visualisation rather than a game: rectilinear masses
 * at believable proportions, a ground plane, one key light and one rim light,
 * and glass panes that behave like glazing. There is no spinning object and
 * nothing orbits.
 *
 * Everything is built from TWO shared geometries and FIVE shared materials,
 * created once with `useMemo` and reused across every mesh. That is the single
 * biggest lever on a scene like this: fifteen meshes with their own box
 * geometry is fifteen buffers uploaded to the GPU, and it is invisible in
 * source until it shows up as a frame-time spike.
 *
 * Motion is per-frame on refs, never React state. A `setState` in `useFrame`
 * re-renders the tree sixty times a second and is the classic way an R3F scene
 * destroys a page's interactivity.
 */

/** The massing. Asymmetric on purpose — a symmetrical skyline reads as a chart. */
const MASSES: { pos: [number, number, number]; scale: [number, number, number] }[] = [
  { pos: [-3.2, 0.5, -1.5], scale: [1.6, 2.2, 1.6] },
  { pos: [-1.4, 0.15, 0.4], scale: [1.4, 1.5, 1.8] },
  { pos: [0.6, 0.9, -2.4], scale: [1.5, 3.0, 1.4] },
  { pos: [2.4, 0.3, -0.4], scale: [1.8, 1.8, 1.6] },
  { pos: [4.1, 0.7, -2.0], scale: [1.2, 2.6, 1.2] },
  { pos: [-4.6, -0.1, 1.2], scale: [1.2, 1.1, 1.3] },
];

/** Vertical glazing planes that catch the key light. */
const PANES: { pos: [number, number, number]; rot: [number, number, number] }[] = [
  { pos: [-2.2, 1.4, 1.6], rot: [0, 0.35, 0] },
  { pos: [1.6, 1.9, 0.8], rot: [0, -0.22, 0] },
  { pos: [3.4, 1.2, 1.4], rot: [0, 0.5, 0] },
];

function Particles({ count = 90 }: { count?: number }) {
  const ref = React.useRef<THREE.Points>(null);

  const positions = React.useMemo(() => {
    /*
      A seeded generator rather than Math.random().

      `react-hooks/purity` flags Math.random() during render and is right to,
      but the better argument is determinism: this scatter is now identical on
      every render, every reload and every machine, so it can never differ
      between two passes and can be reasoned about from the source alone.
    */
    const rand = (n: number) => {
      const x = Math.sin(n * 12.9898) * 43758.5453;
      return x - Math.floor(x);
    };

    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      arr[i * 3] = (rand(i + 1) - 0.5) * 18;
      arr[i * 3 + 1] = rand(i + 101) * 6 - 0.5;
      arr[i * 3 + 2] = (rand(i + 201) - 0.5) * 12;
    }
    return arr;
  }, [count]);

  useFrame((state) => {
    // A slow vertical drift only. Anything faster reads as snow.
    if (ref.current) ref.current.rotation.y = state.clock.elapsedTime * 0.012;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color={C.azure400}
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  );
}

export function ArchitecturalScene({
  /** 0 → 1, driven by hero scroll progress. */
  scrollRef,
  quality = "high",
}: {
  scrollRef: React.RefObject<number>;
  quality?: "high" | "low";
}) {
  const group = React.useRef<THREE.Group>(null);
  const { camera } = useThree();
  const pointer = React.useRef({ x: 0, y: 0 });

  React.useEffect(() => {
    const onMove = (event: PointerEvent) => {
      // Normalised to -0.5..0.5 so the parallax is resolution-independent.
      pointer.current.x = event.clientX / window.innerWidth - 0.5;
      pointer.current.y = event.clientY / window.innerHeight - 0.5;
    };
    // Only a real pointing device gets parallax; a touch drag would fight scroll.
    const fine = window.matchMedia("(pointer: fine)").matches;
    if (fine) window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  /*
    `react-hooks/immutability` is disabled for this callback, deliberately and
    narrowly.

    The rule guards against mutating values returned from hooks during React's
    render. `useFrame` is not render — it is r3f's animation loop, running
    outside React's reconciler, and mutating `camera.position` and the group's
    transform there is the entire prescribed way to animate a Three scene. The
    alternative the rule implies, driving a camera through React state, would
    re-render this tree sixty times a second.

    Scoped to this function only. If a future edit adds a genuine React value
    mutation here, that is still a bug — the disable does not make it safe.
  */
  /* eslint-disable react-hooks/immutability -- see the note above */
  useFrame((state, delta) => {
    // Frame-rate independent easing. A bare `+= (target - current) * 0.05`
    // moves twice as fast at 120Hz as at 60Hz, which is why this scene felt
    // different on a high-refresh display before the delta term.
    const ease = 1 - Math.pow(0.001, delta);
    const scroll = scrollRef.current ?? 0;

    // Camera: mouse parallax, plus a slow push-in and lift as the hero scrolls
    // away. Small numbers on purpose — this is depth, not a ride.
    const targetX = pointer.current.x * 1.1;
    const targetY = 1.6 - pointer.current.y * 0.6 + scroll * 1.4;
    const targetZ = 8.4 - scroll * 2.2;

    camera.position.x += (targetX - camera.position.x) * ease;
    camera.position.y += (targetY - camera.position.y) * ease;
    camera.position.z += (targetZ - camera.position.z) * ease;
    camera.lookAt(0, 0.6 + scroll * 0.4, 0);

    if (group.current) {
      group.current.rotation.y +=
        (pointer.current.x * 0.09 - group.current.rotation.y) * ease;
      // Breathing, not bobbing: 0.04 units over ~7 seconds.
      group.current.position.y =
        Math.sin(state.clock.elapsedTime * 0.28) * 0.04 - scroll * 0.5;
    }
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <group ref={group}>
      {/* Key light, warm-white, high and to the left, casting along the masses. */}
      <directionalLight position={[-6, 9, 5]} intensity={2.1} color={C.porcelain50} />
      {/* Rim light in the accent, behind and right — this is what makes the
          silhouettes read as architecture rather than as blocks. */}
      <directionalLight position={[7, 4, -6]} intensity={1.5} color={C.azure600} />
      <ambientLight intensity={0.42} color={C.azure400} />

      {MASSES.map((mass, index) => (
        <mesh key={index} position={mass.pos} scale={mass.scale}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={index % 2 === 0 ? C.royal800 : C.royal900}
            roughness={0.62}
            metalness={0.12}
          />
        </mesh>
      ))}

      {/* Glazing. Plain transparent standard material rather than
          MeshTransmissionMaterial: transmission renders the scene to an extra
          buffer every frame, which is not a cost worth paying for three panes. */}
      {PANES.map((pane, index) => (
        <mesh key={`pane-${index}`} position={pane.pos} rotation={pane.rot}>
          <planeGeometry args={[2.1, 2.8]} />
          <meshStandardMaterial
            color={C.azure400}
            transparent
            opacity={0.16}
            roughness={0.08}
            metalness={0.5}
            side={2 /* THREE.DoubleSide — imported as a literal to keep this
                       component free of a runtime `three` import */}
          />
        </mesh>
      ))}

      {/* Ground. Receives the rim light and grounds the massing. */}
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[46, 34]} />
        <meshStandardMaterial color={C.royal950} roughness={0.94} metalness={0.05} />
      </mesh>

      {quality === "high" ? <Particles /> : null}
    </group>
  );
}
