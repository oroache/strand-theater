"use client";

import { useRef, useState, useSyncExternalStore, type PointerEvent } from "react";
import dynamic from "next/dynamic";

const ClapperboardScene = dynamic(() => import("./clapperboard-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
      <span className="animate-pulse">Loading 3D scene…</span>
    </div>
  ),
});

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(callback: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

// There's no media query on the server, so the server snapshot is always
// "false" - useSyncExternalStore reconciles that with the real client value
// right after hydration without the cascading-render setState-in-effect
// this would otherwise take.
function getReducedMotionServerSnapshot() {
  return false;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );
}

// A static, motion-free stand-in for the interactive scene: an open
// clapperboard drawn with plain SVG shapes, styled to match the 3D version
// (dark board, striped arm, light hinge point).
function ClapperboardIllustration() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-6">
      <svg viewBox="0 0 200 130" className="h-40 w-40" aria-hidden="true">
        <defs>
          <pattern
            id="clapper-stripes"
            width="16"
            height="16"
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
          >
            <rect width="8" height="16" fill="#18181b" />
            <rect x="8" width="8" height="16" fill="#e4e4e7" />
          </pattern>
        </defs>

        <rect x="14" y="78" width="172" height="38" rx="4" fill="#2b2b2e" />

        <g transform="rotate(-18 14 78)">
          <rect
            x="14"
            y="52"
            width="172"
            height="26"
            rx="4"
            fill="url(#clapper-stripes)"
            stroke="#18181b"
            strokeWidth="3"
          />
        </g>

        <circle cx="14" cy="78" r="6" fill="#e4e4e7" stroke="#18181b" strokeWidth="1.5" />
      </svg>
      <p className="max-w-xs text-center text-sm text-zinc-500">
        The interactive 3D scene is disabled because your system prefers
        reduced motion.
      </p>
    </div>
  );
}

export default function ThreeDDemoPage() {
  const prefersReducedMotion = usePrefersReducedMotion();
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
        {prefersReducedMotion
          ? "A static illustration is shown in place of the animated scene."
          : "Drag to rotate, scroll to zoom, click anywhere to clap the arm open or closed."}
      </p>

      <div className="h-[500px] w-full overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
        {prefersReducedMotion ? (
          <ClapperboardIllustration />
        ) : (
          <div className="h-full w-full" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            <ClapperboardScene open={open} />
          </div>
        )}
      </div>
    </div>
  );
}
