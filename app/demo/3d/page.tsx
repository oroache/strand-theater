"use client";

import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { Group } from "three";

const BASE_WIDTH = 3;
const BASE_HEIGHT = 0.3;
const BASE_DEPTH = 2;

const ARM_WIDTH = 3;
const ARM_HEIGHT = 0.25;
const ARM_DEPTH = 2;

// How far the top arm is tilted open around the hinge, in radians.
const OPEN_ANGLE = 0.5;
const CLOSED_ANGLE = 0;

// Long enough to read as motion rather than a snap, short enough that
// clapping repeatedly still feels responsive rather than sluggish.
const SWING_DURATION_S = 0.35;

// Slow at both ends, fast in the middle - reads as a physical swing
// (accelerating under its own weight, then decelerating into the stop)
// rather than a robotic linear sweep.
function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function ClapperArm({ open }: { open: boolean }) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState(false);

  const startAngleRef = useRef(CLOSED_ANGLE);
  const targetAngleRef = useRef(open ? -OPEN_ANGLE : CLOSED_ANGLE);
  const startTimeRef = useRef(0);

  // Re-aim the swing whenever `open` flips, starting from wherever the arm
  // actually is right now (not the last target) so a click mid-swing
  // reverses smoothly instead of jumping.
  useLayoutEffect(() => {
    const group = groupRef.current;
    if (!group) return;
    startAngleRef.current = group.rotation.x;
    targetAngleRef.current = open ? -OPEN_ANGLE : CLOSED_ANGLE;
    startTimeRef.current = performance.now() / 1000;
  }, [open]);

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const elapsed = performance.now() / 1000 - startTimeRef.current;
    const t = Math.min(elapsed / SWING_DURATION_S, 1);
    const eased = easeInOutCubic(t);
    group.rotation.x =
      startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased;
  });

  useEffect(() => {
    document.body.style.cursor = hovered ? "pointer" : "auto";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  return (
    <group ref={groupRef}>
      <mesh
        position={[0, ARM_HEIGHT / 2, ARM_DEPTH / 2]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHovered(false);
        }}
      >
        <boxGeometry args={[ARM_WIDTH, ARM_HEIGHT, ARM_DEPTH]} />
        <meshStandardMaterial
          color={hovered ? "#3f3f46" : "#18181b"}
          emissive="#f59e0b"
          emissiveIntensity={hovered ? 0.4 : 0}
        />
      </mesh>
    </group>
  );
}

function Clapperboard({ open }: { open: boolean }) {
  return (
    <group>
      <mesh position={[0, -BASE_HEIGHT / 2, 0]}>
        <boxGeometry args={[BASE_WIDTH, BASE_HEIGHT, BASE_DEPTH]} />
        <meshStandardMaterial color="#2b2b2e" />
      </mesh>

      {/* Hinge line sits along the back edge of the base, at the top surface (y = 0). */}
      <group position={[0, 0, -BASE_DEPTH / 2]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, BASE_WIDTH - 0.2, 16]} />
          <meshStandardMaterial color="#e4e4e7" metalness={0.7} roughness={0.25} />
        </mesh>
        {[-1, 0, 1].map((i) => (
          <mesh key={i} position={[i * (BASE_WIDTH / 2 - 0.3), 0, 0]}>
            <sphereGeometry args={[0.16, 16, 16]} />
            <meshStandardMaterial color="#e4e4e7" metalness={0.7} roughness={0.25} />
          </mesh>
        ))}

        {/* Top arm is a child of the hinge group so it pivots around the hinge line. */}
        <ClapperArm open={open} />
      </group>
    </group>
  );
}

export default function ThreeDDemoPage() {
  const [open, setOpen] = useState(true);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  }

  function handlePointerUp(e: PointerEvent<HTMLDivElement>) {
    const down = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!down || e.button !== 0) return;

    // OrbitControls drags also end in a pointerup on this element - only
    // treat it as a "click" (and toggle the arm) if the pointer barely
    // moved, so orbiting the camera doesn't also clap the board.
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 5) setOpen((o) => !o);
  }

  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">3D Clapperboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Drag to rotate, scroll to zoom, click anywhere to clap the arm open
        or closed.
      </p>

      <div
        className="h-[500px] w-full overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
      >
        <Canvas camera={{ position: [4, 3, 5], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <Clapperboard open={open} />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}
