"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

const BASE_WIDTH = 3;
const BASE_HEIGHT = 0.3;
const BASE_DEPTH = 2;

const ARM_WIDTH = 3;
const ARM_HEIGHT = 0.25;
const ARM_DEPTH = 2;

// How far the top arm is tilted open around the hinge, in radians.
const OPEN_ANGLE = 0.5;

function Clapperboard() {
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
        <group rotation={[-OPEN_ANGLE, 0, 0]}>
          <mesh position={[0, ARM_HEIGHT / 2, ARM_DEPTH / 2]}>
            <boxGeometry args={[ARM_WIDTH, ARM_HEIGHT, ARM_DEPTH]} />
            <meshStandardMaterial color="#18181b" />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function ThreeDDemoPage() {
  return (
    <div className="flex flex-1 flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">3D Clapperboard</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Drag to rotate, scroll to zoom.
      </p>

      <div className="h-[500px] w-full overflow-hidden rounded-md border border-zinc-300 dark:border-zinc-700">
        <Canvas camera={{ position: [4, 3, 5], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <directionalLight position={[5, 8, 5]} intensity={1.5} />
          <Clapperboard />
          <OrbitControls />
        </Canvas>
      </div>
    </div>
  );
}
