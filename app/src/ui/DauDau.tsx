import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const FUR = '#f6c27a';
const CREAM = '#fff1dc';
const INK = '#2b2233';

type V3 = [number, number, number];

function Ball({ r, c, p, s = [1, 1, 1] }: { r: number; c: string; p: V3; s?: V3 }) {
  return (
    <mesh position={p} scale={s} castShadow>
      <sphereGeometry args={[r, 32, 24]} />
      <meshStandardMaterial color={c} roughness={0.75} />
    </mesh>
  );
}

function Ear({ x }: { x: number }) {
  return (
    <mesh position={[x, 2.62, 0]} rotation={[0, 0, x > 0 ? -0.35 : 0.35]} castShadow>
      <coneGeometry args={[0.24, 0.5, 24]} />
      <meshStandardMaterial color={FUR} roughness={0.75} />
    </mesh>
  );
}

export function DauDau({ onTap }: { onTap(): void }) {
  const ref = useRef<Group>(null);
  const jump = useRef(0); // 1 → 0 trong 0.6 giây; dùng ref để không render lại mỗi khung hình
  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.4;
    if (jump.current > 0) {
      jump.current = Math.max(0, jump.current - dt / 0.6);
      const p = 1 - jump.current;
      g.position.y = Math.sin(p * Math.PI) * 1.0;
      const sq = 1 + Math.sin(p * Math.PI * 2) * 0.06;
      g.scale.set(sq, 1 / sq, sq);
    } else {
      g.position.y = 0;
      g.scale.set(1, 1, 1);
    }
  });
  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation();
        jump.current = 1;
        onTap();
      }}
    >
      <Ball r={0.85} c={FUR} p={[0, 0.9, 0]} s={[1, 1.05, 0.9]} />
      <Ball r={0.5} c={CREAM} p={[0, 0.85, 0.5]} s={[1, 1.1, 0.5]} />
      <Ball r={0.72} c={FUR} p={[0, 2.05, 0]} />
      <Ear x={-0.45} />
      <Ear x={0.45} />
      <Ball r={0.3} c={CREAM} p={[0, 1.88, 0.55]} s={[1.2, 0.8, 0.7]} />
      <Ball r={0.07} c={'#ff8fa3'} p={[0, 1.98, 0.85]} />
      <Ball r={0.11} c={INK} p={[-0.26, 2.2, 0.6]} />
      <Ball r={0.11} c={INK} p={[0.26, 2.2, 0.6]} />
      <Ball r={0.3} c={FUR} p={[-0.45, 0.22, 0.35]} />
      <Ball r={0.3} c={FUR} p={[0.45, 0.22, 0.35]} />
      <mesh position={[0.85, 0.9, -0.3]} rotation={[0.4, 0, -0.8]} castShadow>
        <capsuleGeometry args={[0.12, 0.9, 8, 16]} />
        <meshStandardMaterial color={FUR} roughness={0.75} />
      </mesh>
    </group>
  );
}
