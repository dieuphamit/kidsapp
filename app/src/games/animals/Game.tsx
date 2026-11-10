import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { ANIMALS, type AnimalData } from './animals';

const TARGET_HEIGHT = 1.2; // Chuẩn hóa chiều cao ~1.2 đơn vị

type AnimalProps = {
  data: AnimalData;
  phaseOffset: number;
  onTap: () => void;
  isJumping: boolean;
  jumpProgress: number;
};

function Animal({ data, phaseOffset, onTap, isJumping, jumpProgress }: AnimalProps) {
  const ref = useRef<Group>(null);
  const { scene, animations } = useGLTF(import.meta.env.BASE_URL + 'models/' + data.model);
  const { actions } = useAnimations(animations, ref);

  // Tính scale để chuẩn hóa chiều cao (dùng useMemo, không setState trong effect)
  const scale = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = new Vector3();
    box.getSize(size);
    const height = size.y;
    return height > 0 ? TARGET_HEIGHT / height : 1;
  }, [scene]);

  // Áp vật liệu lì kiểu đất sét và chạy animation Idle
  useEffect(() => {
    scene.traverse((child) => {
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
  }, [scene, actions]);

  // Lắc lư idle và xử lý nhảy
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;

    if (isJumping) {
      // Nhảy lên và squash/stretch
      const p = jumpProgress;
      g.position.y = Math.sin(p * Math.PI) * 0.7;
      const sq = 1 + Math.sin(p * Math.PI * 2) * 0.08;
      g.scale.set(scale * sq, scale / sq, scale * sq);
    } else {
      // Lắc lư nhẹ
      g.rotation.y = Math.sin(state.clock.elapsedTime * 0.6 + phaseOffset) * 0.15;
      g.position.y = 0;
      g.scale.set(scale, scale, scale);
    }
  });

  // Tính bounding box cho vùng chạm
  const hitboxSize: [number, number, number] = [1.2, 1.6, 1.2];

  return (
    <group position={data.pos}>
      <group ref={ref} rotation={[0, Math.PI, 0]}>
        <primitive object={scene.clone()} />
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

function GrassGround() {
  return (
    <group>
      {/* Đĩa cỏ dẹt */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <cylinderGeometry args={[5, 5, 0.15, 64]} />
        <meshStandardMaterial color="#9be38a" roughness={0.8} />
      </mesh>
      {/* Mép bo bằng torus */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <torusGeometry args={[5, 0.08, 16, 64]} />
        <meshStandardMaterial color="#9be38a" roughness={0.8} />
      </mesh>
      {/* Vài bụi cỏ/hoa pastel */}
      <mesh position={[-3.5, 0.15, 2.5]}>
        <sphereGeometry args={[0.18, 16, 12]} />
        <meshStandardMaterial color="#ffb4a2" roughness={0.7} />
      </mesh>
      <mesh position={[3.2, 0.12, -2.8]}>
        <sphereGeometry args={[0.15, 16, 12]} />
        <meshStandardMaterial color="#cdb4ff" roughness={0.7} />
      </mesh>
      <mesh position={[2.8, 0.1, 3]}>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#ffe29a" roughness={0.7} />
      </mesh>
      <mesh position={[-2.5, 0.14, -3.2]}>
        <sphereGeometry args={[0.16, 16, 12]} />
        <meshStandardMaterial color="#a0e7e5" roughness={0.7} />
      </mesh>
      <mesh position={[0.5, 0.11, 3.5]}>
        <sphereGeometry args={[0.13, 16, 12]} />
        <meshStandardMaterial color="#b4f8c8" roughness={0.7} />
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
  const soundTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  // Nói lời chào khi vào game
  useEffect(() => {
    say('farm.hello');
    return () => {
      if (soundTimeoutRef.current) clearTimeout(soundTimeoutRef.current);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleTap = (animalId: string) => {
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
  };

  return (
    <div
      data-testid="game-animals"
      data-last-say={lastSay || undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
      }}
    >
      <Scene3D label="Trang trại" view={{ position: [0, 4.2, 13], target: [0, 0.8, 0], fov: 40 }}>
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
            />
          ))}
        </Suspense>
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
