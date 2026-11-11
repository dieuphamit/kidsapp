import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { pickSixAnimals, type WildAnimalData } from './wildAnimals';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

const TARGET_HEIGHT = 1.2;

/** Bố cục 2 hàng × 3: hàng sau gần hơn (z = -0.6), hàng trước xa hơn (z = 3.0) */
const POSITIONS: [number, number, number][] = [
  // Hàng sau (z = -0.6): 3 con
  [-3.5, 0, -0.6],
  [0, 0, -0.6],
  [3.5, 0, -0.6],
  // Hàng trước (z = 3.0): 3 con
  [-3.0, 0, 3.0],
  [0, 0, 3.0],
  [3.0, 0, 3.0],
];

type AnimalProps = {
  data: WildAnimalData;
  pos: [number, number, number];
  phaseOffset: number;
  onTap: () => void;
  isJumping: boolean;
  jumpProgress: number;
  onLoaded: () => void;
};

function Animal({ data, pos, phaseOffset, onTap, isJumping, jumpProgress, onLoaded }: AnimalProps) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(import.meta.env.BASE_URL + 'models/' + data.model);
  const { actions } = useAnimations(animations, ref);

  // Clone và chuẩn hóa model
  const { clonedScene, scale, yOffset } = useMemo(() => {
    const cloned = cloneSkinned(scene);
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrixWorld(true);

    const box = new Box3().setFromObject(cloned, true);
    const size = new Vector3();
    box.getSize(size);
    const height = size.y;
    const s = height > 0 ? (data.height ?? TARGET_HEIGHT) / height : 1;

    const yOff = -box.min.y * s;
    const center = new Vector3();
    box.getCenter(center);
    cloned.position.set(-center.x, 0, -center.z);

    return { clonedScene: cloned, scale: s, yOffset: yOff };
  }, [scene, data.height]);

  // Áp vật liệu lì kiểu đất sét và chạy animation Idle
  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mesh = child as Mesh;
        const mat = mesh.material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.roughness = 0.85;
          mat.metalness = 0;
        }
      }
    });

    const idleAction = actions['Idle'] || actions['idle'];
    if (idleAction) {
      idleAction.play();
    }

    onLoaded();
  }, [clonedScene, actions, onLoaded]);

  // Lắc lư idle và xử lý nhảy
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;

    if (isJumping) {
      const p = jumpProgress;
      g.position.y = yOffset + Math.sin(p * Math.PI) * 0.7;
      const sq = 1 + Math.sin(p * Math.PI * 2) * 0.08;
      g.scale.set(scale * sq, scale / sq, scale * sq);
    } else {
      g.rotation.y = Math.sin(state.clock.elapsedTime * 0.6 + phaseOffset) * 0.15;
      g.position.y = yOffset;
      g.scale.set(scale, scale, scale);
    }
  });

  const hitboxSize: [number, number, number] = [1.2, 1.6, 1.2];

  return (
    <group position={pos} rotation={[0, data.rotY ?? 0, 0]}>
      <group ref={ref} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
      <mesh
        position={[0, 0.8, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap();
        }}
      >
        <boxGeometry args={hitboxSize} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

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

type JumpState = {
  id: string;
  startTime: number;
};

export default function Game({ speaker, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [jumping, setJumping] = useState<JumpState | null>(null);
  const [jumpProgress, setJumpProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);

  // Chọn ngẫu nhiên 6 con khi mount, giữ ổn định trong suốt game
  const animals = useMemo(() => pickSixAnimals(), []);

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

      setJumping({ id: animalId, startTime: Date.now() });
      say(`animal.${animalId}`);

      soundTimeoutRef.current = setTimeout(() => {
        say(`animal.${animalId}-sound`);
      }, 1300);
    },
    [say]
  );

  const handleAnimalLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (loadedCount >= 6 && !ready) {
      setReady(true);
    }
  }, [loadedCount, ready]);

  useEffect(() => {
    say('zoo.hello');
    return () => {
      if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
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

  // Animation nhảy
  useEffect(() => {
    if (!jumping) {
      setJumpProgress(0);
      return;
    }

    const duration = 600;
    const startTime = jumping.startTime;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setJumpProgress(progress);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setJumping(null);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [jumping]);

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
          {animals.map((animal, i) => (
            <Animal
              key={animal.id}
              data={animal}
              pos={POSITIONS[i]}
              phaseOffset={i * 0.8}
              onTap={() => handleTap(animal.id)}
              isJumping={jumping?.id === animal.id}
              jumpProgress={jumping?.id === animal.id ? jumpProgress : 0}
              onLoaded={handleAnimalLoaded}
            />
          ))}
        </Suspense>
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
