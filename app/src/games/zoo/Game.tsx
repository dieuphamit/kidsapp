import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Scene3D } from '../../ui/Scene3D';
import { AgentProbe, AnimalHerd } from '../../ui/AnimatedAnimal';
import { createAgent, startReact, type Agent } from '../../core/steer';
import type { Herd } from '../../core/herd';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { pickSixAnimals, placeZooAnimals, zooDef } from './wildAnimals';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');
/** e2e: `?e2e=1&seed=N` chọn cố định 6 con để ảnh chụp/test lặp lại được */
const E2E_SEED = IS_E2E ? Number(new URLSearchParams(window.location.search).get('seed')) || undefined : undefined;

/** Cột hàng rào gỗ đơn giản */
function FencePost({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.8, 8]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} metalness={0} />
      </mesh>
      <mesh position={[0, 0.82, 0]}>
        <sphereGeometry args={[0.08, 8, 6]} />
        <meshStandardMaterial color="#b89878" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/** Thanh ngang hàng rào */
function FenceRail({ x1, x2, z, y }: { x1: number; x2: number; z: number; y: number }) {
  const length = Math.abs(x2 - x1);
  const midX = (x1 + x2) / 2;
  return (
    <mesh position={[midX, y, z]}>
      <boxGeometry args={[length, 0.06, 0.05]} />
      <meshStandardMaterial color="#b89878" roughness={0.85} metalness={0} />
    </mesh>
  );
}

/** Cây xanh trang trí */
function Tree({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Thân cây */}
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.12, 0.18, 1.0, 8]} />
        <meshStandardMaterial color="#a08060" roughness={0.9} metalness={0} />
      </mesh>
      {/* Tán lá dưới */}
      <mesh position={[0, 1.3, 0]}>
        <sphereGeometry args={[0.6, 12, 10]} />
        <meshStandardMaterial color="#5bb34e" roughness={0.85} metalness={0} />
      </mesh>
      {/* Tán lá trên */}
      <mesh position={[0, 1.8, 0]}>
        <sphereGeometry args={[0.45, 10, 8]} />
        <meshStandardMaterial color="#6fd17a" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

/** Đá tròn trang trí */
function Rock({ x, z, scale = 1 }: { x: number; z: number; scale?: number }) {
  return (
    <mesh position={[x, 0.15 * scale, z]} scale={scale}>
      <sphereGeometry args={[0.25, 10, 8]} />
      <meshStandardMaterial color="#c0b0a0" roughness={0.9} metalness={0} />
    </mesh>
  );
}

function ZooGround() {
  const fencePosts = [-5, -2.5, 0, 2.5, 5];

  return (
    <group>
      {/* Mặt đất đồng cỏ vàng nhạt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[40, 30]} />
        <meshStandardMaterial color="#d4e8a0" roughness={0.85} metalness={0} />
      </mesh>

      {/* Hàng rào thấp phía sau */}
      {fencePosts.map((x) => (
        <FencePost key={x} x={x} z={-4} />
      ))}
      <FenceRail x1={-5} x2={5} z={-4} y={0.28} />
      <FenceRail x1={-5} x2={5} z={-4} y={0.56} />

      {/* Cây phía sau */}
      <Tree x={-6.5} z={-5.5} />
      <Tree x={6} z={-5.2} />
      <Tree x={-1} z={-5.8} />

      {/* Đá trang trí */}
      <Rock x={-5.5} z={1.5} scale={1.2} />
      <Rock x={5} z={-2} scale={0.9} />
      <Rock x={4.5} z={2.5} scale={0.7} />

      {/* Vài hoa nhỏ pastel */}
      <mesh position={[-4.5, 0.08, 2.5]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#ffb4a2" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[4.2, 0.09, 0.5]}>
        <sphereGeometry args={[0.09, 10, 8]} />
        <meshStandardMaterial color="#cdb4ff" roughness={0.8} metalness={0} />
      </mesh>
      <mesh position={[-5.2, 0.08, -0.5]}>
        <sphereGeometry args={[0.1, 10, 8]} />
        <meshStandardMaterial color="#ffe29a" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}

export default function Game({ speaker, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [loadedCount, setLoadedCount] = useState(0);
  // Sẵn sàng khi mọi model đã load
  const ready = loadedCount >= 6;
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Trạng thái đi lại của từng con (đọc/ghi trong useFrame, không gây render lại)

  // Chọn ngẫu nhiên 6 con khi mount, giữ ổn định trong suốt game; 3 con đi dạo, 3 con đứng yên
  const animals = useMemo(() => pickSixAnimals(E2E_SEED), []);
  const placed = useMemo(() => placeZooAnimals(animals), [animals]);
  // hạt giống ngẫu nhiên cho đường đi (cố định khi e2e)
  const [walkSeed] = useState(() => E2E_SEED ?? Math.floor(Math.random() * 1e6));
  // Mỗi con một Agent (steering): 3 con đi dạo trong dải của mình, 3 con đứng một chỗ lắc lư
  const herd = useMemo<Herd>(() => {
    const members = placed.map((p, i) => {
      const def = zooDef(p.data);
      const agent = createAgent({
        id: p.data.id,
        motion: 'walk',
        area: p.area ?? { xMin: p.pos[0], xMax: p.pos[0], zMin: p.pos[2], zMax: p.pos[2] },
        pos: p.pos,
        fixed: !p.area,
        restYaw: p.rotY,
        seed: walkSeed * 7 + i,
        maxSpeed: def.speed,
        radius: def.radius,
      });
      return { key: p.data.id, def, agent };
    });
    return { members, agents: members.map((m) => m.agent) };
  }, [placed, walkSeed]);
  const registry = useMemo(() => new Map<string, Agent>(herd.agents.map((a) => [a.id, a])), [herd]);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  const handleTap = useCallback(
    (animalId: string) => {
      if (soundTimeoutRef.current) {
        clearTimeout(soundTimeoutRef.current);
        soundTimeoutRef.current = null;
      }

      // Con vật dừng lại, ngoảnh về bé và nhảy (vẽ trong useFrame)
      const st = registry.get(animalId);
      if (st && st.mode !== 'react') startReact(st);
      say(`animal.${animalId}`);

      soundTimeoutRef.current = setTimeout(() => {
        say(`animal.${animalId}-sound`);
        // Sau tiếng kêu thật, Đậu Đậu nói một câu vui về con vật
        soundTimeoutRef.current = setTimeout(() => {
          say(`animal.${animalId}-fact`);
        }, 2800);
      }, 1300);
    },
    [say, registry]
  );

  const handleAnimalLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);


  useEffect(() => {
    say('zoo.hello');
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

  // Lấy danh sách id của 6 con đang hiện để e2e có thể kiểm tra
  const visibleIds = useMemo(() => animals.map((a) => a.id).join(','), [animals]);

  return (
    <div
      data-testid="game-zoo"
      data-last-say={lastSay || undefined}
      data-ready={ready ? 'true' : undefined}
      data-visible-animals={visibleIds}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
      }}
    >
      <Scene3D label="Sở thú" shadowScale={18} view={{ position: [0, 4.2, 10], target: [0, 0.5, -0.2], fov: 45 }}>
        <Suspense fallback={<ZooGround />}>
          <ZooGround />
          <AnimalHerd herd={herd} onTap={handleTap} onLoaded={handleAnimalLoaded} />
        </Suspense>
        <AgentProbe agents={herd.agents} />
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
