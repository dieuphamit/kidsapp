import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { ANIMALS, type AnimalData } from './animals';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

const TARGET_HEIGHT = 1.2; // Chuẩn hóa chiều cao ~1.2

type AnimalProps = {
  data: AnimalData;
  phaseOffset: number;
  onTap: () => void;
  isJumping: boolean;
  jumpProgress: number;
  onLoaded: () => void;
};

function Animal({ data, phaseOffset, onTap, isJumping, jumpProgress, onLoaded }: AnimalProps) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(import.meta.env.BASE_URL + 'models/' + data.model);
  const { actions } = useAnimations(animations, ref);

  // Clone và chuẩn hóa model
  const { clonedScene, scale, yOffset } = useMemo(() => {
    // SkeletonUtils.clone: model có khung xương (ngựa, cừu) cần bản sao xương riêng, scene.clone giữ bind vào xương gốc
    const cloned = cloneSkinned(scene);
    // Reset transform để đo chính xác
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrixWorld(true);

    const box = new Box3().setFromObject(cloned, true);
    const size = new Vector3();
    box.getSize(size);
    // Scale theo CHIỀU CAO (y) để chuẩn hóa mọi con cùng chiều cao ~1.2
    const height = size.y;
    const s = height > 0 ? (data.height ?? TARGET_HEIGHT) / height : 1;

    // Tính offset Y để chân đặt trên mặt đất
    const yOff = -box.min.y * s;
    // Căn tâm x/z về gốc group để model nào cũng đứng đúng ô của nó
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

    // Chạy animation Idle nếu có
    const idleAction = actions['Idle'] || actions['idle'];
    if (idleAction) {
      idleAction.play();
    }

    // Báo đã load xong
    onLoaded();
  }, [clonedScene, actions, onLoaded]);

  // Lắc lư idle và xử lý nhảy
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;

    if (isJumping) {
      // Nhảy lên và squash/stretch
      const p = jumpProgress;
      g.position.y = yOffset + Math.sin(p * Math.PI) * 0.7;
      const sq = 1 + Math.sin(p * Math.PI * 2) * 0.08;
      g.scale.set(scale * sq, scale / sq, scale * sq);
    } else {
      // Lắc lư nhẹ
      g.rotation.y = Math.sin(state.clock.elapsedTime * 0.6 + phaseOffset) * 0.15;
      g.position.y = yOffset;
      g.scale.set(scale, scale, scale);
    }
  });

  // Tính bounding box cho vùng chạm
  const hitboxSize: [number, number, number] = [1.2, 1.6, 1.2];

  return (
    <group position={data.pos} rotation={[0, data.rotY ?? 0, 0]}>
      <group ref={ref} rotation={[0, Math.PI, 0]}>
        <primitive object={clonedScene} />
      </group>
      {/* Vùng chạm trong suốt */}
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

      // Bắt đầu nhảy
      setJumping({ id: animalId, startTime: Date.now() });

      // Nói tên con vật
      say(`animal.${animalId}`);

      // Sau 1300ms nói tiếng kêu
      soundTimeoutRef.current = setTimeout(() => {
        say(`animal.${animalId}-sound`);
      }, 1300);
    },
    [say]
  );

  const handleAnimalLoaded = useCallback(() => {
    setLoadedCount((c) => c + 1);
  }, []);

  // Đánh dấu ready khi tất cả model đã load
  useEffect(() => {
    if (loadedCount >= ANIMALS.length && !ready) {
      setReady(true);
    }
  }, [loadedCount, ready]);

  // Nói lời chào khi vào game
  useEffect(() => {
    say('farm.hello');
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

    const duration = 600; // 0.6s
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
            <Animal
              key={animal.id}
              data={animal}
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
