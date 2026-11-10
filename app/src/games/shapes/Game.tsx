import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { LEARN_HEX, type LearnColor } from '../../core/tokens';
import { SHAPES, dealColors, markTapped, allTapped, type Shape, type ShapesState } from './logic';

const SHAPE_POSITIONS: [number, number, number][] = [
  [-2.4, 0.8, 0],
  [-0.8, 0.8, 0],
  [0.8, 0.8, 0],
  [2.4, 0.8, 0],
];

const POND_COLOR = '#a0e7e5';
const SHORE_COLOR = '#9be38a';

function createStarShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const outerRadius = 0.6;
  const innerRadius = 0.28;
  const points = 5;

  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

type ShapeMeshProps = {
  shape: Shape;
  color: LearnColor;
  position: [number, number, number];
  phase: number;
  bouncing: boolean;
  onTap: () => void;
};

function ShapeMesh({ shape, color, position, phase, bouncing, onTap }: ShapeMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bounceStart = useRef(0);
  const baseY = position[1];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Floating animation
    let y = baseY + Math.sin(t * 1.2 + phase) * 0.08;

    // Slow rotation
    groupRef.current.rotation.y = t * 0.3 + phase;

    // Bounce animation when tapped
    if (bouncing) {
      const elapsed = t - bounceStart.current;
      if (elapsed < 0.6) {
        const progress = elapsed / 0.6;
        // Bounce up then squash
        const bounceHeight = Math.sin(progress * Math.PI) * 0.5;
        const squash = 1 - Math.sin(progress * Math.PI) * 0.15;
        y += bounceHeight;
        groupRef.current.scale.set(1 / squash, squash, 1 / squash);
      } else {
        groupRef.current.scale.set(1, 1, 1);
      }
    } else {
      groupRef.current.scale.set(1, 1, 1);
    }

    groupRef.current.position.y = y;
  });

  useEffect(() => {
    if (bouncing && groupRef.current) {
      bounceStart.current = performance.now() / 1000; // will be synced on next frame
    }
  }, [bouncing]);

  const handlePointerDown = (e: THREE.Event) => {
    e.stopPropagation();
    onTap();
  };

  const hexColor = LEARN_HEX[color];

  // Render appropriate geometry based on shape
  const renderGeometry = () => {
    switch (shape) {
      case 'circle':
        return (
          <mesh onPointerDown={handlePointerDown}>
            <sphereGeometry args={[0.65, 32, 24]} />
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </mesh>
        );
      case 'square':
        return (
          <RoundedBox args={[1.1, 1.1, 1.1]} radius={0.15} onPointerDown={handlePointerDown}>
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </RoundedBox>
        );
      case 'triangle':
        return (
          <mesh rotation={[Math.PI / 2, 0, 0]} onPointerDown={handlePointerDown}>
            <cylinderGeometry args={[0.7, 0.7, 1.1, 3]} />
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </mesh>
        );
      case 'star':
        return (
          <mesh rotation={[0, 0, 0]} onPointerDown={handlePointerDown}>
            <extrudeGeometry
              args={[
                createStarShape(),
                {
                  depth: 0.5,
                  bevelEnabled: true,
                  bevelThickness: 0.08,
                  bevelSize: 0.08,
                  bevelSegments: 3,
                },
              ]}
            />
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </mesh>
        );
    }
  };

  return (
    <group ref={groupRef} position={[position[0], baseY, position[2]]}>
      {renderGeometry()}
    </group>
  );
}

function Pond() {
  return (
    <group>
      {/* Shore (grass) ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
        <ringGeometry args={[3.5, 4.5, 64]} />
        <meshStandardMaterial color={SHORE_COLOR} roughness={0.8} />
      </mesh>
      {/* Water surface */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[3.5, 64]} />
        <meshStandardMaterial color={POND_COLOR} roughness={0.3} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}

function Ripple({ delay }: { delay: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = (clock.elapsedTime + delay) % 4;
    const scale = 0.5 + t * 0.6;
    const opacity = Math.max(0, 1 - t / 3);
    meshRef.current.scale.set(scale, scale, 1);
    (meshRef.current.material as THREE.MeshStandardMaterial).opacity = opacity * 0.3;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <torusGeometry args={[1.5, 0.02, 8, 64]} />
      <meshStandardMaterial color="#ffffff" transparent opacity={0.3} />
    </mesh>
  );
}

function ShapesScene({
  state,
  bouncingShape,
  onTapShape,
}: {
  state: ShapesState;
  bouncingShape: Shape | null;
  onTapShape: (shape: Shape) => void;
}) {
  return (
    <>
      <Pond />
      <Ripple delay={0} />
      <Ripple delay={1.5} />
      <Ripple delay={3} />
      {SHAPES.map((shape, idx) => (
        <ShapeMesh
          key={shape}
          shape={shape}
          color={state.colors[shape]}
          position={SHAPE_POSITIONS[idx]}
          phase={(idx * Math.PI) / 2}
          bouncing={bouncingShape === shape}
          onTap={() => onTapShape(shape)}
        />
      ))}
    </>
  );
}

export default function Game({ speaker, onExit }: GameProps) {
  const [state, setState] = useState<ShapesState>(() => ({
    colors: dealColors(),
    tapped: new Set(),
  }));
  const [lastSay, setLastSay] = useState('');
  const [bouncingShape, setBouncingShape] = useState<Shape | null>(null);
  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  useEffect(() => {
    say('pond.hello');
    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
      if (greatTimeoutRef.current) clearTimeout(greatTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
    };
  }, [say]);

  const handleTapShape = useCallback(
    (shape: Shape) => {
      // Cancel any pending timeouts
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
      if (greatTimeoutRef.current) clearTimeout(greatTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);

      // Start bounce animation
      setBouncingShape(shape);
      setTimeout(() => setBouncingShape(null), 600);

      // Say color first
      const color = state.colors[shape];
      say(`color.${color}`);

      // Update tapped state
      const newState = markTapped(state, shape);
      setState(newState);

      // Say shape after 1000ms
      shapeTimeoutRef.current = setTimeout(() => {
        say(`shape.${shape}`);

        // Check if all tapped after saying shape
        if (allTapped(newState)) {
          greatTimeoutRef.current = setTimeout(() => {
            say('ui.great');
            // All shapes bounce
            setBouncingShape('circle');
            setTimeout(() => setBouncingShape('square'), 100);
            setTimeout(() => setBouncingShape('triangle'), 200);
            setTimeout(() => setBouncingShape('star'), 300);

            // Reset with new colors after celebration
            resetTimeoutRef.current = setTimeout(() => {
              setState({
                colors: dealColors(),
                tapped: new Set(),
              });
            }, 1500);
          }, 1200);
        }
      }, 1000);
    },
    [state, say]
  );

  return (
    <div
      data-testid="game-shapes"
      data-last-say={lastSay || undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%)',
      }}
    >
      <Scene3D label="Hồ nước" view={{ position: [0, 3.6, 11], target: [0, 0.6, 0], fov: 38 }}>
        <ShapesScene state={state} bouncingShape={bouncingShape} onTapShape={handleTapShape} />
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
