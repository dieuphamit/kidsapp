import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { BuddyCharacter } from '../core/tokens';
import { BUDDY_LOOKS, ballSegments, buddyParts, type Part, type PartRole } from './buddyModel';

type Roles = Partial<Record<PartRole, Group | null>>;
type SetRole = (role: PartRole, g: Group | null) => void;

function Clay({ c, opacity = 1 }: { c: string; opacity?: number }) {
  return <meshStandardMaterial color={c} roughness={0.6} transparent={opacity < 1} opacity={opacity} />;
}

function PartMesh({ part, setRole }: { part: Part; setRole: SetRole }) {
  switch (part.kind) {
    case 'ball':
      return (
        <mesh position={part.p} scale={part.s ?? [1, 1, 1]}>
          <sphereGeometry args={[part.r, ...ballSegments(part.r)]} />
          <Clay c={part.color} opacity={part.opacity} />
        </mesh>
      );
    case 'cone':
      return (
        <mesh position={part.p} scale={part.s ?? [1, 1, 1]}>
          <coneGeometry args={[part.r, part.h, 32]} />
          <Clay c={part.color} />
        </mesh>
      );
    case 'torus':
      return (
        <mesh position={part.p}>
          <torusGeometry args={[part.r, part.tube, 16, 48, part.arc]} />
          <Clay c={part.color} />
        </mesh>
      );
    case 'shine':
      return (
        <mesh position={part.p}>
          <sphereGeometry args={[part.r, 16, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      );
    case 'group':
      return (
        <group
          position={part.p}
          rotation={part.rot ?? [0, 0, 0]}
          ref={part.role ? (g) => setRole(part.role!, g) : undefined}
        >
          {part.children.map((c, i) => <PartMesh key={i} part={c} setRole={setRole} />)}
        </group>
      );
  }
}

const WAVE_S = 1.6;

type Props = {
  character: BuddyCharacter;
  onTap?(): void;
  /** Đổi giá trị (ví dụ tăng 1) để nhân vật vẫy tay chào; 0 = không vẫy lúc mới hiện. */
  wave?: number;
};

/** Bạn đồng hành đất sét đang chọn: lắc lư nhẹ, chạm thì nhảy, `wave` đổi thì vẫy tay. */
export function Buddy({ character, onTap, wave = 0 }: Props) {
  const ref = useRef<Group>(null);
  const roles = useRef<Roles>({});
  const jump = useRef(0); // 1 → 0 trong 0.6 giây; dùng ref để không render lại mỗi khung hình
  const waveT = useRef(0); // 1 → 0 trong WAVE_S giây
  const setRole = useCallback<SetRole>((role, g) => { roles.current[role] = g; }, []);
  const parts = useMemo(() => buddyParts(BUDDY_LOOKS[character]), [character]);

  useEffect(() => {
    if (wave) waveT.current = 1;
  }, [wave]);

  useFrame((state, rawDt) => {
    // khung hình chậm (máy yếu, tab vừa mở lại) cho dt lớn: kẹp lại để cú nhảy/vẫy tay vẫn được thấy trọn
    const dt = Math.min(rawDt, 0.1);
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.rotation.y = Math.sin(t * 0.8) * 0.4;
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
    const arm = roles.current.wave;
    if (arm) {
      if (waveT.current > 0) {
        waveT.current = Math.max(0, waveT.current - dt / WAVE_S);
        // giơ tay lên rồi hạ xuống, giữa chừng lắc qua lại
        const lift = Math.min(1, Math.sin((1 - waveT.current) * Math.PI) * 1.6);
        arm.rotation.z = lift * (2.3 + Math.sin(t * 14) * 0.35);
      } else {
        arm.rotation.z = 0;
      }
    }
    const tailG = roles.current.wag;
    if (tailG) tailG.rotation.z = Math.sin(t * 9) * 0.45;
  });

  return (
    <group
      ref={ref}
      onPointerDown={(e) => {
        e.stopPropagation();
        jump.current = 1;
        onTap?.();
      }}
    >
      {parts.map((p, i) => <PartMesh key={`${character}-${i}`} part={p} setRole={setRole} />)}
    </group>
  );
}
