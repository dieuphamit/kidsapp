import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Scene3D } from './Scene3D';
import { DauDau } from './DauDau';

/** Hướng Đậu Đậu nhìn: -1 trái, 0 giữa, 1 phải (theo cột của khu vừa chạm). */
export type Facing = -1 | 0 | 1;

type TurnerProps = {
  facing: Facing;
  children: React.ReactNode;
};

const TURN = 0.7; // rad
const LEAN = 0.35; // nhích người về phía khu

function Turner({ facing, children }: TurnerProps) {
  const ref = useRef<Group>(null);
  const hop = useRef(0);
  const last = useRef<Facing>(facing);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;
    if (last.current !== facing) {
      last.current = facing;
      hop.current = 1; // nảy một nhịp mỗi khi đổi hướng
    }
    const k = Math.min(1, dt * 12);
    g.rotation.y += (facing * TURN - g.rotation.y) * k;
    g.position.x += (facing * LEAN - g.position.x) * k;
    if (hop.current > 0) {
      hop.current = Math.max(0, hop.current - dt * 3);
      g.position.y = Math.sin(hop.current * Math.PI) * 0.35;
    } else {
      g.position.y = 0;
    }
  });

  return <group ref={ref}>{children}</group>;
}

type WorldMapSceneProps = {
  facing: Facing;
  onTapDauDau(): void;
};

export function WorldMapScene({ facing, onTapDauDau }: WorldMapSceneProps) {
  return (
    <Scene3D label="Đậu Đậu">
      <Turner facing={facing}>
        <DauDau onTap={onTapDauDau} />
      </Turner>
    </Scene3D>
  );
}
