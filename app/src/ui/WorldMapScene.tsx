import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Scene3D } from './Scene3D';
import { DauDau } from './DauDau';

type WalkerProps = {
  target: number;
  children: React.ReactNode;
};

function Walker({ target, children }: WalkerProps) {
  const ref = useRef<Group>(null);
  const bouncePhase = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;

    const speed = 2.5;
    const diff = target - g.position.x;

    if (Math.abs(diff) > 0.02) {
      const dir = Math.sign(diff);
      const step = Math.min(Math.abs(diff), speed * dt) * dir;
      g.position.x += step;

      // Nảy 2 nhịp khi di chuyển
      bouncePhase.current += dt * 12;
      g.position.y = Math.abs(Math.sin(bouncePhase.current)) * 0.4;

      // Xoay mặt về hướng đi
      g.rotation.y = dir > 0 ? -0.4 : 0.4;
    } else {
      g.position.x = target;
      g.position.y = 0;
      bouncePhase.current = 0;
      // Giữ hướng cuối cùng hoặc về trước
      if (Math.abs(target) < 0.1) {
        g.rotation.y = 0;
      }
    }
  });

  return <group ref={ref}>{children}</group>;
}

type WorldMapSceneProps = {
  target: number;
  onTapDauDau(): void;
};

export function WorldMapScene({ target, onTapDauDau }: WorldMapSceneProps) {
  return (
    <Scene3D label="Đậu Đậu">
      <Walker target={target}>
        <DauDau onTap={onTapDauDau} />
      </Walker>
    </Scene3D>
  );
}
