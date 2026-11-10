import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';

const FUR = '#f6c27a';
const CREAM = '#fff3e0';
const PINK = '#ff9fb2';
const INK = '#3a2a40';

type V3 = [number, number, number];

function Clay({ c, opacity = 1 }: { c: string; opacity?: number }) {
  return <meshStandardMaterial color={c} roughness={0.6} transparent={opacity < 1} opacity={opacity} />;
}

function Ball({ r, c, p, s = [1, 1, 1], opacity }: { r: number; c: string; p: V3; s?: V3; opacity?: number }) {
  return (
    <mesh position={p} scale={s}>
      <sphereGeometry args={[r, 40, 32]} />
      <Clay c={c} opacity={opacity} />
    </mesh>
  );
}

function Ear({ x }: { x: number }) {
  const tilt = x > 0 ? -0.38 : 0.38;
  return (
    <group position={[x, 2.72, 0.05]} rotation={[-0.12, 0, tilt]}>
      <mesh scale={[1, 1, 0.6]}>
        <coneGeometry args={[0.3, 0.6, 32]} />
        <Clay c={FUR} />
      </mesh>
      {/* lòng tai hồng, đẩy ra trước để không trùng mặt với tai ngoài */}
      <mesh position={[0, -0.05, 0.1]} scale={[1, 1, 0.5]}>
        <coneGeometry args={[0.18, 0.4, 32]} />
        <Clay c={PINK} />
      </mesh>
    </group>
  );
}

function Eye({ x }: { x: number }) {
  return (
    <group position={[x, 2.0, 0.78]}>
      <Ball r={0.13} c={INK} p={[0, 0, 0]} s={[1, 1.15, 0.6]} />
      <mesh position={[-0.04, 0.05, 0.075]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
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
      g.position.y = Math.sin(p * Math.PI) * 0.6;
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
      {/* thân + bụng kem (nhô ra trước thân để không z-fight) */}
      <Ball r={0.7} c={FUR} p={[0, 0.75, 0]} s={[1, 1.05, 0.9]} />
      <Ball r={0.42} c={CREAM} p={[0, 0.72, 0.47]} s={[1, 1.1, 0.45]} />
      {/* tay, chân */}
      <Ball r={0.19} c={FUR} p={[-0.48, 0.82, 0.42]} s={[1, 1.1, 1]} />
      <Ball r={0.19} c={FUR} p={[0.48, 0.82, 0.42]} s={[1, 1.1, 1]} />
      <Ball r={0.27} c={FUR} p={[-0.34, 0.2, 0.33]} s={[1, 0.78, 1.2]} />
      <Ball r={0.27} c={FUR} p={[0.34, 0.2, 0.33]} s={[1, 0.78, 1.2]} />
      {/* đuôi cong tròn */}
      <group position={[0.78, 0.92, -0.38]} rotation={[0, -0.5, -Math.PI / 2]}>
        <mesh>
          <torusGeometry args={[0.32, 0.1, 16, 48, Math.PI * 1.25]} />
          <Clay c={FUR} />
        </mesh>
        <Ball r={0.1} c={FUR} p={[0.32 * Math.cos(Math.PI * 1.25), 0.32 * Math.sin(Math.PI * 1.25), 0]} />
      </group>
      {/* đầu to (tỉ lệ chibi) */}
      <Ball r={0.88} c={FUR} p={[0, 1.95, 0]} s={[1.05, 0.95, 0.95]} />
      <Ear x={-0.5} />
      <Ear x={0.5} />
      <Eye x={-0.32} />
      <Eye x={0.32} />
      {/* mõm, mũi, má hồng */}
      <Ball r={0.17} c={CREAM} p={[-0.12, 1.72, 0.76]} s={[1.15, 0.85, 0.7]} />
      <Ball r={0.17} c={CREAM} p={[0.12, 1.72, 0.76]} s={[1.15, 0.85, 0.7]} />
      <Ball r={0.06} c={PINK} p={[0, 1.83, 0.86]} s={[1.3, 0.9, 0.8]} />
      <Ball r={0.13} c={PINK} p={[-0.52, 1.8, 0.66]} s={[1, 0.6, 0.4]} opacity={0.75} />
      <Ball r={0.13} c={PINK} p={[0.52, 1.8, 0.66]} s={[1, 0.6, 0.4]} opacity={0.75} />
    </group>
  );
}
