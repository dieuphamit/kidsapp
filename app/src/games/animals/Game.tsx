import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Scene3D } from '../../ui/Scene3D';
import { WanderAnimal, WanderProbe, type WanderRegistry } from '../../ui/WanderAnimal';
import { startReact } from '../../ui/wander';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { ANIMALS } from './animals';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

/** Cột hàng rào gỗ đơn giản */
function FencePost({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Cột */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.08, 0.1, 1, 8]} />
        <meshStandardMaterial color="#c8a87c" roughness={0.9} metalness={0} />
      </mesh>
      {/* Đỉnh cột tròn */}
      <mesh position={[0, 1.02, 0]}>
        <sphereGeometry args={[0.1, 8, 6]} />
        <meshStandardMaterial color="#d4b896" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/** Thanh ngang hàng rào */
function FenceRail({ x1, x2, z, y }: { x1: number; x2: number; z: number; y: number }) {
  const length = Math.abs(x2 - x1);
  const midX = (x1 + x2) / 2;
  return (
    <mesh position={[midX, y, z]} rotation={[0, 0, 0]}>
      <boxGeometry args={[length, 0.08, 0.06]} />
      <meshStandardMaterial color="#d4b896" roughness={0.85} metalness={0} />
    </mesh>
  );
}

/** Bụi cây tròn đơn giản */
function Bush({ x, z, scale = 1, color = '#6fd17a' }: { x: number; z: number; scale?: number; color?: string }) {
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 0.3, 0]}>
        <sphereGeometry args={[0.4, 12, 10]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[0.25, 0.22, 0.15]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
      <mesh position={[-0.2, 0.25, -0.1]}>
        <sphereGeometry args={[0.32, 10, 8]} />
        <meshStandardMaterial color={color} roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

function GrassGround() {
  // Hàng rào: 5 cột ở z = -4, từ x = -5 đến x = 5
  const fencePosts = [-5, -2.5, 0, 2.5, 5];

  return (
    <group>
      {/* Mặt đất phẳng rộng - plane kéo tới chân trời */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#9be38a" roughness={0.85} metalness={0} />
      </mesh>

      {/* Hàng rào gỗ phía sau */}
      {fencePosts.map((x) => (
        <FencePost key={x} x={x} z={-4} />
      ))}
      <FenceRail x1={-5} x2={5} z={-4} y={0.35} />
      <FenceRail x1={-5} x2={5} z={-4} y={0.7} />

      {/* Bụi cây phía sau */}
      <Bush x={-6} z={-5.5} scale={1.2} color="#5bb34e" />
      <Bush x={-3.5} z={-5} scale={0.9} color="#6fd17a" />
      <Bush x={1} z={-5.2} scale={1.1} color="#4da644" />
      <Bush x={4} z={-4.8} scale={0.8} color="#6fd17a" />
      <Bush x={6.5} z={-5.5} scale={1.3} color="#5bb34e" />

      {/* Vài hoa nhỏ pastel rải rác */}
      <mesh position={[-4, 0.08, 2.5]}>
        <sphereGeometry args={[0.12, 10, 8]} />
        <meshStandardMaterial color="#ffb4a2" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[4.5, 0.1, 0.5]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#cdb4ff" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[-5, 0.09, -1]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshStandardMaterial color="#ffe29a" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[5.2, 0.08, 2]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#a0e7e5" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}

export default function Game({ speaker, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [loadedCount, setLoadedCount] = useState(0);
  // Sẵn sàng khi mọi model đã load
  const ready = loadedCount >= ANIMALS.length;
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Trạng thái đi lại của từng con (đọc/ghi trong useFrame, không gây render lại)
  const [registry] = useState<WanderRegistry>(() => new Map());

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  const handleTap = useCallback(
    (animalId: string) => {
      // Hủy timeout cũ nếu có
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }

      // Con vật dừng lại, ngoảnh về bé và nhảy (vẽ trong useFrame)
      const st = registry.get(animalId);
      if (st) startReact(st);

      // Nói tên con vật
      say(`animal.${animalId}`);

      // Sau 1300ms nói tiếng kêu
      soundTimeoutRef.current = setTimeout(() => {
        say(`animal.${animalId}-sound`);
      }, 1300);
    },
    [say, registry]
  );

  const handleAnimalLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  // Nói lời chào khi vào game
  useEffect(() => {
    say('farm.hello');
    return () => {
      if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);
    };
  }, [say]);

  // Đăng ký hook cho e2e testing
  useEffect(() => {
    if (IS_E2E) {
      window.__behocTap = handleTap;
      return () => {
        delete window.__behocTap;
      };
    }
  }, [handleTap]);

  return (
    <div
      data-testid="game-animals"
      data-last-say={lastSay || undefined}
      data-ready={ready ? 'true' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
      }}
    >
      <Scene3D label="Trang trại" shadowScale={18} view={{ position: [0, 4.2, 10], target: [0, 0.5, -0.2], fov: 45 }}>
        <Suspense fallback={<GrassGround />}>
          <GrassGround />
          {ANIMALS.map((animal, i) => (
            <WanderAnimal
              key={animal.id}
              id={animal.id}
              model={animal.model}
              height={animal.height}
              pos={animal.pos}
              rotY={animal.rotY}
              lane={animal.lane}
              gait={animal.gait}
              phase={i * 0.8}
              registry={registry}
              onTap={() => handleTap(animal.id)}
              onLoaded={handleAnimalLoaded}
            />
          ))}
        </Suspense>
        <WanderProbe registry={registry} />
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
