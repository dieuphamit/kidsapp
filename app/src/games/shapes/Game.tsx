import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { BackHome } from '../../ui/BackHome';
import type { GameProps } from '../../core/games';
import { LEARN_HEX, type LearnColor } from '../../core/tokens';
import {
  SHAPES,
  SLOTS,
  dealColors,
  markTapped,
  dropResult,
  markPlaced,
  allPlaced,
  type Shape,
  type ShapesState,
} from './logic';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

const SHAPE_POSITIONS: Record<Shape, [number, number, number]> = {
  circle: [-2.4, 0.8, 0],
  square: [-0.8, 0.8, 0],
  triangle: [0.8, 0.8, 0],
  star: [2.4, 0.8, 0],
};

const POND_COLOR = '#a0e7e5';
const SHORE_COLOR = '#9be38a';
const SLOT_COLOR = '#3b2a6b'; // --ink

const DRAG_THRESHOLD = 12; // pixels on screen to start drag
const DRAG_Y = 0.4; // y position of drag plane
const DRAG_LIFT = 0.3; // how much to lift shape while dragging
const DRAG_SCALE = 1.1; // scale while dragging

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

// Flat shadow shape for slots
function createFlatStarShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const outerRadius = 0.55;
  const innerRadius = 0.25;
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

type DragState = {
  shape: Shape;
  pointerId: number;
  startScreenX: number;
  startScreenY: number;
  isDragging: boolean;
  position: [number, number, number];
  originalPosition: [number, number, number];
};

type ShapeMeshProps = {
  shape: Shape;
  color: LearnColor;
  position: [number, number, number];
  phase: number;
  bouncing: boolean;
  placed: boolean;
  slotPosition: [number, number, number] | null;
  dragging: boolean;
  dragPosition: [number, number, number] | null;
  animatingBack: boolean;
  animateBackTarget: [number, number, number] | null;
  animateBackProgress: number;
  onPointerDown: (e: ThreeEvent<PointerEvent>, shape: Shape) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
};

function ShapeMesh({
  shape,
  color,
  position,
  phase,
  bouncing,
  placed,
  slotPosition,
  dragging,
  dragPosition,
  animatingBack,
  animateBackTarget,
  animateBackProgress,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: ShapeMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const bounceStart = useRef(0);

  // Determine actual position
  const actualPosition = useMemo(() => {
    if (placed && slotPosition) {
      return [slotPosition[0], 0.5, slotPosition[2]] as [number, number, number];
    }
    if (dragging && dragPosition) {
      return dragPosition;
    }
    if (animatingBack && animateBackTarget) {
      // Interpolate between current and target
      const eased = 1 - Math.pow(1 - animateBackProgress, 3); // ease out cubic
      const startPos = animateBackTarget;
      const endPos = position;
      return [
        startPos[0] + (endPos[0] - startPos[0]) * eased,
        startPos[1] + (endPos[1] - startPos[1]) * eased,
        startPos[2] + (endPos[2] - startPos[2]) * eased,
      ] as [number, number, number];
    }
    return position;
  }, [placed, slotPosition, dragging, dragPosition, animatingBack, animateBackTarget, animateBackProgress, position]);

  const baseY = actualPosition[1];

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;

    // Floating animation (only when not dragging/animating and not placed)
    let y = baseY;
    if (!dragging && !animatingBack && !placed) {
      y = baseY + Math.sin(t * 1.2 + phase) * 0.08;
    }

    // Slow rotation (pause when dragging or placed)
    if (!dragging && !placed) {
      groupRef.current.rotation.y = t * 0.3 + phase;
    }

    // Scale handling
    let scaleVal = 1;
    if (dragging) {
      scaleVal = DRAG_SCALE;
    }

    // Bounce animation when tapped/snapped
    if (bouncing) {
      const elapsed = t - bounceStart.current;
      if (elapsed < 0.6) {
        const progress = elapsed / 0.6;
        const bounceHeight = Math.sin(progress * Math.PI) * 0.5;
        const squash = 1 - Math.sin(progress * Math.PI) * 0.15;
        y += bounceHeight;
        groupRef.current.scale.set(scaleVal / squash, scaleVal * squash, scaleVal / squash);
      } else {
        groupRef.current.scale.set(scaleVal, scaleVal, scaleVal);
      }
    } else {
      groupRef.current.scale.set(scaleVal, scaleVal, scaleVal);
    }

    groupRef.current.position.set(actualPosition[0], y, actualPosition[2]);
  });

  useEffect(() => {
    if (bouncing && groupRef.current) {
      bounceStart.current = performance.now() / 1000;
    }
  }, [bouncing]);

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    onPointerDown(e, shape);
  };

  const hexColor = LEARN_HEX[color];

  const renderGeometry = () => {
    switch (shape) {
      case 'circle':
        return (
          <mesh onPointerDown={handlePointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <sphereGeometry args={[0.65, 32, 24]} />
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </mesh>
        );
      case 'square':
        return (
          <RoundedBox
            args={[1.1, 1.1, 1.1]}
            radius={0.15}
            onPointerDown={handlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </RoundedBox>
        );
      case 'triangle':
        return (
          <mesh
            rotation={[Math.PI / 2, 0, 0]}
            onPointerDown={handlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
            <cylinderGeometry args={[0.7, 0.7, 1.1, 3]} />
            <meshStandardMaterial color={hexColor} roughness={0.55} />
          </mesh>
        );
      case 'star':
        return (
          <mesh
            rotation={[0, 0, 0]}
            onPointerDown={handlePointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          >
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
    <group ref={groupRef} position={[actualPosition[0], baseY, actualPosition[2]]}>
      {renderGeometry()}
    </group>
  );
}

// Shadow slot component
function ShadowSlot({ shape, position, filled }: { shape: Shape; position: [number, number, number]; filled: boolean }) {
  const flatStarShape = useMemo(() => createFlatStarShape(), []);

  if (filled) return null;

  const renderSlotGeometry = () => {
    switch (shape) {
      case 'circle':
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.01, position[2]]}>
            <circleGeometry args={[0.6, 32]} />
            <meshStandardMaterial color={SLOT_COLOR} transparent opacity={0.18} />
          </mesh>
        );
      case 'square':
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.01, position[2]]}>
            <planeGeometry args={[1.0, 1.0]} />
            <meshStandardMaterial color={SLOT_COLOR} transparent opacity={0.18} />
          </mesh>
        );
      case 'triangle':
        return (
          <mesh rotation={[-Math.PI / 2, Math.PI, 0]} position={[position[0], 0.01, position[2]]}>
            <circleGeometry args={[0.65, 3]} />
            <meshStandardMaterial color={SLOT_COLOR} transparent opacity={0.18} />
          </mesh>
        );
      case 'star':
        return (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[position[0], 0.01, position[2]]}>
            <shapeGeometry args={[flatStarShape]} />
            <meshStandardMaterial color={SLOT_COLOR} transparent opacity={0.18} />
          </mesh>
        );
    }
  };

  return renderSlotGeometry();
}

// Celebration stars
function CelebrationStars({ active }: { active: boolean }) {
  const starsRef = useRef<THREE.Group>(null);
  const [stars] = useState(() => {
    const arr: { x: number; z: number; vx: number; vy: number; vz: number; color: string }[] = [];
    const colors = ['#ffb4a2', '#a0e7e5', '#ffe29a', '#b4f8c8', '#cdb4ff'];
    for (let i = 0; i < 40; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 6,
        z: 2 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        vz: (Math.random() - 0.5) * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    return arr;
  });
  const startTimeRef = useRef(0);

  useFrame(({ clock }) => {
    if (!starsRef.current || !active) return;
    const elapsed = clock.elapsedTime - startTimeRef.current;
    if (elapsed > 1.5) {
      starsRef.current.visible = false;
      return;
    }
    starsRef.current.visible = true;
    starsRef.current.children.forEach((child, i) => {
      const star = stars[i];
      const t = elapsed;
      child.position.set(star.x + star.vx * t, star.vy * t - 4.9 * t * t * 0.5, star.z + star.vz * t);
      const opacity = Math.max(0, 1 - elapsed / 1.5);
      (child as THREE.Mesh).material = new THREE.MeshBasicMaterial({
        color: star.color,
        transparent: true,
        opacity,
      });
    });
  });

  useEffect(() => {
    if (active) {
      startTimeRef.current = performance.now() / 1000;
    }
  }, [active]);

  return (
    <group ref={starsRef} visible={false}>
      {stars.map((star, i) => (
        <mesh key={i} position={[star.x, 0, star.z]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial color={star.color} />
        </mesh>
      ))}
    </group>
  );
}

function Pond() {
  return (
    <group>
      {/* Shore (grass) - extended to cover slot area */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 1.5]}>
        <planeGeometry args={[10, 8]} />
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

function ReadyNotifier({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (gl) onReady();
    });
    return () => cancelAnimationFrame(id);
  }, [gl, onReady]);
  return null;
}

// Component for handling drag plane intersection
function DragPlane({
  dragState,
  onDragMove,
}: {
  dragState: DragState | null;
  onDragMove: (point: [number, number, number]) => void;
}) {
  const planeRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -DRAG_Y));
  const intersectPoint = useRef(new THREE.Vector3());

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragState || !dragState.isDragging) return;
      if (e.pointerId !== dragState.pointerId) return;

      const ray = e.ray;
      if (ray.intersectPlane(planeRef.current, intersectPoint.current)) {
        onDragMove([intersectPoint.current.x, DRAG_Y + DRAG_LIFT, intersectPoint.current.z]);
      }
    },
    [dragState, onDragMove]
  );

  if (!dragState || !dragState.isDragging) return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, DRAG_Y, 0]}
      visible={false}
      onPointerMove={handlePointerMove}
    >
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

function ShapesScene({
  state,
  bouncingShapes,
  dragState,
  animateBackState,
  celebrating,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onDragMove,
  onReady,
}: {
  state: ShapesState;
  bouncingShapes: Set<Shape>;
  dragState: DragState | null;
  animateBackState: { shape: Shape; from: [number, number, number]; progress: number } | null;
  celebrating: boolean;
  onPointerDown: (e: ThreeEvent<PointerEvent>, shape: Shape) => void;
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onPointerUp: (e: ThreeEvent<PointerEvent>) => void;
  onDragMove: (point: [number, number, number]) => void;
  onReady: () => void;
}) {
  return (
    <>
      <ReadyNotifier onReady={onReady} />
      <Pond />
      <Ripple delay={0} />
      <Ripple delay={1.5} />
      <Ripple delay={3} />

      {/* Shadow slots on shore */}
      {SHAPES.map((shape) => (
        <ShadowSlot key={`slot-${shape}`} shape={shape} position={SLOTS[shape]} filled={state.placed.has(shape)} />
      ))}

      {/* Shape meshes */}
      {SHAPES.map((shape, idx) => (
        <ShapeMesh
          key={shape}
          shape={shape}
          color={state.colors[shape]}
          position={SHAPE_POSITIONS[shape]}
          phase={(idx * Math.PI) / 2}
          bouncing={bouncingShapes.has(shape)}
          placed={state.placed.has(shape)}
          slotPosition={state.placed.has(shape) ? SLOTS[shape] : null}
          dragging={dragState?.shape === shape && dragState.isDragging}
          dragPosition={dragState?.shape === shape && dragState.isDragging ? dragState.position : null}
          animatingBack={animateBackState?.shape === shape}
          animateBackTarget={animateBackState?.shape === shape ? animateBackState.from : null}
          animateBackProgress={animateBackState?.shape === shape ? animateBackState.progress : 0}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        />
      ))}

      {/* Drag plane for smooth dragging */}
      <DragPlane dragState={dragState} onDragMove={onDragMove} />

      {/* Celebration stars */}
      <CelebrationStars active={celebrating} />
    </>
  );
}

export default function Game({ speaker, onExit }: GameProps) {
  const [state, setState] = useState<ShapesState>(() => ({
    colors: dealColors(),
    tapped: new Set(),
    placed: new Set(),
  }));
  const [lastSay, setLastSay] = useState('');
  const [bouncingShapes, setBouncingShapes] = useState<Set<Shape>>(new Set());
  const [ready, setReady] = useState(false);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [animateBackState, setAnimateBackState] = useState<{
    shape: Shape;
    from: [number, number, number];
    progress: number;
  } | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const hasEverDraggedRef = useRef(false);

  const shapeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const greatTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animateBackIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  const cancelPendingSpeech = useCallback(() => {
    if (shapeTimeoutRef.current) {
      clearTimeout(shapeTimeoutRef.current);
      shapeTimeoutRef.current = null;
    }
  }, []);

  const startBounce = useCallback((shape: Shape) => {
    setBouncingShapes((prev) => new Set(prev).add(shape));
    setTimeout(() => {
      setBouncingShapes((prev) => {
        const next = new Set(prev);
        next.delete(shape);
        return next;
      });
    }, 600);
  }, []);

  const handleTap = useCallback(
    (shape: Shape) => {
      // Cancel any pending shape speech
      cancelPendingSpeech();

      // Start bounce animation
      startBounce(shape);

      // Say color first (immediate feedback)
      const color = state.colors[shape];
      say(`color.${color}`);

      // Update tapped state
      const newState = markTapped(state, shape);
      setState(newState);

      // Say shape after 1000ms
      shapeTimeoutRef.current = setTimeout(() => {
        say(`shape.${shape}`);
      }, 1000);
    },
    [state, say, cancelPendingSpeech, startBounce]
  );

  const handleDrop = useCallback(
    (shape: Shape, dropPoint: [number, number, number]) => {
      const result = dropResult(shape, dropPoint, SLOTS);

      if (result === 'snap') {
        // Snap to slot
        const newState = markPlaced(state, shape);
        setState(newState);
        startBounce(shape);
        say('ui.great');

        // Check if all placed
        if (allPlaced(newState)) {
          // All shapes bounce after short delay
          greatTimeoutRef.current = setTimeout(() => {
            setCelebrating(true);
            SHAPES.forEach((s, i) => {
              setTimeout(() => startBounce(s), i * 100);
            });

            // Reset after celebration
            resetTimeoutRef.current = setTimeout(() => {
              setCelebrating(false);
              setState({
                colors: dealColors(),
                tapped: new Set(),
                placed: new Set(),
              });
            }, 2500);
          }, 800);
        }
      } else if (result === 'wrong') {
        // Animate back and say try-again
        say('pond.try-again');
        setAnimateBackState({ shape, from: dropPoint, progress: 0 });

        // Animate back over 600ms
        const startTime = performance.now();
        animateBackIntervalRef.current = setInterval(() => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / 600);
          setAnimateBackState((prev) => (prev ? { ...prev, progress } : null));
          if (progress >= 1) {
            clearInterval(animateBackIntervalRef.current!);
            setAnimateBackState(null);
          }
        }, 16);
      } else {
        // 'none' - animate back silently
        setAnimateBackState({ shape, from: dropPoint, progress: 0 });

        const startTime = performance.now();
        animateBackIntervalRef.current = setInterval(() => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / 600);
          setAnimateBackState((prev) => (prev ? { ...prev, progress } : null));
          if (progress >= 1) {
            clearInterval(animateBackIntervalRef.current!);
            setAnimateBackState(null);
          }
        }, 16);
      }
    },
    [state, say, startBounce]
  );

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, shape: Shape) => {
      // Ignore if already dragging another shape
      if (dragState && dragState.pointerId !== e.pointerId) return;

      // Ignore if this shape is already placed
      if (state.placed.has(shape)) {
        // Still allow tap to hear color/shape
        handleTap(shape);
        return;
      }

      // Capture pointer
      (e.target as HTMLElement)?.setPointerCapture?.(e.pointerId);

      // Start potential drag
      const originalPos = SHAPE_POSITIONS[shape];
      setDragState({
        shape,
        pointerId: e.pointerId,
        startScreenX: e.nativeEvent.clientX,
        startScreenY: e.nativeEvent.clientY,
        isDragging: false,
        position: [originalPos[0], originalPos[1] + DRAG_LIFT, originalPos[2]],
        originalPosition: originalPos,
      });

      // Immediate feedback: bounce and say color
      startBounce(shape);
      const color = state.colors[shape];
      say(`color.${color}`);

      // Schedule shape name (will be cancelled if drag starts)
      shapeTimeoutRef.current = setTimeout(() => {
        say(`shape.${shape}`);
      }, 1000);
    },
    [dragState, state, handleTap, startBounce, say]
  );

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragState) return;
      if (e.pointerId !== dragState.pointerId) return;

      if (!dragState.isDragging) {
        // Check if moved past threshold
        const dx = e.nativeEvent.clientX - dragState.startScreenX;
        const dy = e.nativeEvent.clientY - dragState.startScreenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > DRAG_THRESHOLD) {
          // Start dragging - cancel pending shape speech
          cancelPendingSpeech();
          hasEverDraggedRef.current = true;

          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  isDragging: true,
                }
              : null
          );
        }
      }
    },
    [dragState, cancelPendingSpeech]
  );

  const handleDragMove = useCallback(
    (point: [number, number, number]) => {
      if (!dragState || !dragState.isDragging) return;
      setDragState((prev) =>
        prev
          ? {
              ...prev,
              position: point,
            }
          : null
      );
    },
    [dragState]
  );

  const handlePointerUp = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (!dragState) return;
      if (e.pointerId !== dragState.pointerId) return;

      // Release pointer capture
      (e.target as HTMLElement)?.releasePointerCapture?.(e.pointerId);

      if (dragState.isDragging) {
        // Handle drop
        handleDrop(dragState.shape, dragState.position);
      }

      setDragState(null);
    },
    [dragState, handleDrop]
  );

  // Initial hello and drag hint
  useEffect(() => {
    say('pond.hello');

    // Show drag hint after ~4s if user hasn't dragged
    hintTimeoutRef.current = setTimeout(() => {
      if (!hasEverDraggedRef.current) {
        say('pond.drag-hint');
      }
    }, 4000);

    return () => {
      if (shapeTimeoutRef.current) clearTimeout(shapeTimeoutRef.current);
      if (greatTimeoutRef.current) clearTimeout(greatTimeoutRef.current);
      if (resetTimeoutRef.current) clearTimeout(resetTimeoutRef.current);
      if (hintTimeoutRef.current) clearTimeout(hintTimeoutRef.current);
      if (animateBackIntervalRef.current) clearInterval(animateBackIntervalRef.current);
    };
  }, [say]);

  // E2E test hooks
  useEffect(() => {
    if (!IS_E2E) return;
    const win = window as unknown as {
      __behocTap?: (id: string) => void;
      __behocDrag?: (id: string, toX: number, toZ: number) => void;
    };
    win.__behocTap = (id: string) => {
      if (SHAPES.includes(id as Shape)) {
        handleTap(id as Shape);
      }
    };
    win.__behocDrag = (id: string, toX: number, toZ: number) => {
      if (SHAPES.includes(id as Shape)) {
        const shape = id as Shape;
        if (state.placed.has(shape)) return;

        // Simulate drag and drop
        const dropPoint: [number, number, number] = [toX, DRAG_Y, toZ];
        hasEverDraggedRef.current = true;
        handleDrop(shape, dropPoint);
      }
    };
    return () => {
      delete win.__behocTap;
      delete win.__behocDrag;
    };
  }, [handleTap, handleDrop, state.placed]);

  const handleReady = useCallback(() => {
    setReady(true);
  }, []);

  return (
    <div
      data-testid="game-shapes"
      data-last-say={lastSay || undefined}
      data-ready={ready ? 'true' : undefined}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%)',
      }}
    >
      <Scene3D label="Hồ nước" view={{ position: [0, 3.6, 11], target: [0, 0.6, 0], fov: 38 }}>
        <ShapesScene
          state={state}
          bouncingShapes={bouncingShapes}
          dragState={dragState}
          animateBackState={animateBackState}
          celebrating={celebrating}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onDragMove={handleDragMove}
          onReady={handleReady}
        />
      </Scene3D>
      <BackHome onExit={onExit} />
    </div>
  );
}
