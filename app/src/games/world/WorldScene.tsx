import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';
import { MeshStandardMaterial, Vector3, type Group, type Mesh, type PerspectiveCamera } from 'three';
import { Scene3D } from '../../ui/Scene3D';
import { AnimalHerd } from '../../ui/AnimatedAnimal';
import type { Herd } from '../../core/herd';
import type { Agent } from '../../core/steer';
import { HABITAT_IDS, HABITATS, type Habitat } from '../../core/worldAnimals';
import { makeGeometry, sceneryFor, SHADOW_FAR, SPACING, WORLD_COLORS, type Prop, type WorldColor } from './scenery';
import type { Swipe } from './swipe';

/**
 * Phần 3D của "Khám phá thế giới": một Canvas (Scene3D) chứa 5 khu nối nhau theo trục x, mỗi khu cách nhau
 * SPACING. Camera lướt theo `swipe.pos` (do Game.tsx điều khiển) và nội suy góc nhìn giữa hai khu kề nhau.
 * Chỉ dựng các khu trong `mounted` (khu đang xem ±1); thú và cảnh chỉ chuyển động ở các khu trong `visible`.
 */

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

const materials = new Map<string, MeshStandardMaterial>();
/** Vật liệu phẳng dùng chung theo màu; vật trong suốt có vật liệu riêng (gợn nước đổi độ trong khi chạy) */
function materialFor(c: WorldColor, o?: number): MeshStandardMaterial {
  const make = () =>
    new MeshStandardMaterial({
      color: WORLD_COLORS[c],
      roughness: 0.9,
      metalness: 0,
      flatShading: true,
      transparent: o !== undefined,
      opacity: o ?? 1,
      depthWrite: o === undefined,
    });
  if (o !== undefined) return make();
  let m = materials.get(c);
  if (!m) {
    m = make();
    materials.set(c, m);
  }
  return m;
}

type AnimRec = { g: Group; p: Prop };

function Node({ p, anims }: { p: Prop; anims: AnimRec[] }) {
  const geo = useMemo(() => (p.g ? makeGeometry(p.g, p.a) : null), [p]);
  const mat = useMemo(() => (p.g && p.c ? materialFor(p.c, p.o) : null), [p]);
  useEffect(
    () => () => {
      geo?.dispose();
      if (p.o !== undefined) mat?.dispose();
    },
    [geo, mat, p],
  );
  const ref = useCallback(
    (g: Group | null) => {
      if (!g || !p.anim) return;
      const rec = { g, p };
      anims.push(rec);
      return () => {
        const i = anims.indexOf(rec);
        if (i >= 0) anims.splice(i, 1);
      };
    },
    [p, anims],
  );
  const s = p.s ?? 1;
  return (
    <group ref={ref} position={p.p} rotation={p.anim ? undefined : p.r} scale={typeof s === 'number' ? [s, s, s] : s}>
      {geo && mat && <mesh geometry={geo} material={mat} position={p.off} rotation={p.anim ? p.r : undefined} />}
      {p.kids?.map((k, i) => <Node key={i} p={k} anims={anims} />)}
    </group>
  );
}

/** Cảnh một khu + chuyển động nhẹ (một useFrame cho cả khu) */
function Scenery({ habitat, active }: { habitat: Habitat; active: boolean }) {
  const props = sceneryFor(habitat);
  const anims = useMemo<AnimRec[]>(() => [], []);
  useFrame(({ clock }) => {
    if (!active) return;
    const t = clock.elapsedTime;
    for (const { g, p } of anims) {
      const ph = p.ph ?? 0;
      const [px, py, pz] = p.p ?? [0, 0, 0];
      switch (p.anim) {
        case 'sway': {
          const a = p.amp ?? 0.08;
          g.rotation.z = Math.sin(t * 1.4 + ph) * a;
          g.rotation.x = Math.sin(t * 1.1 + ph * 1.7) * a * 0.5;
          break;
        }
        case 'drift':
          g.position.x = px + Math.sin(t * 0.045 + ph) * (p.amp ?? 8);
          break;
        case 'bob':
          g.position.y = py + Math.sin(t * 1.6 + ph) * (p.amp ?? 0.03);
          g.rotation.y = Math.sin(t * 0.4 + ph) * 0.15;
          break;
        case 'rise': {
          const u = (t * 0.2 + ph) % 1;
          g.position.set(px + Math.sin(t * 2.2 + ph * 9) * 0.12, py + u * (p.amp ?? 4), pz);
          const k = u > 0.92 ? (1 - u) / 0.08 : 0.6 + u * 0.5;
          g.scale.setScalar(k);
          break;
        }
        case 'ripple': {
          const u = (t * 0.35 + ph) % 1;
          g.scale.setScalar(0.4 + u * 1.8);
          const m = g.children[0] as Mesh | undefined;
          if (m) (m.material as MeshStandardMaterial).opacity = (1 - u) * 0.8;
          break;
        }
        case 'spin':
          g.rotation.z = t * 0.25;
          break;
      }
    }
  });
  return (
    <>
      {props.map((p, i) => (
        <Node key={i} p={p} anims={anims} />
      ))}
    </>
  );
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const tmpTarget = new Vector3();

/** Camera lướt theo vị trí trên dải, nội suy góc nhìn của hai khu kề nhau */
function CameraRig({ swipe }: { swipe: Swipe }) {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useFrame(() => {
    const p = swipe.pos;
    const n = HABITAT_IDS.length;
    const i0 = Math.max(0, Math.min(n - 1, Math.floor(p)));
    const i1 = Math.min(n - 1, i0 + 1);
    const f0 = Math.max(0, Math.min(1, p - i0));
    const f = f0 * f0 * (3 - 2 * f0);
    const a = HABITATS[HABITAT_IDS[i0]].view;
    const b = HABITATS[HABITAT_IDS[i1]].view;
    const x = p * SPACING;
    camera.position.set(x + lerp(a.position[0], b.position[0], f), lerp(a.position[1], b.position[1], f), lerp(a.position[2], b.position[2], f));
    tmpTarget.set(x + lerp(a.target[0], b.target[0], f), lerp(a.target[1], b.target[1], f), lerp(a.target[2], b.target[2], f));
    camera.lookAt(tmpTarget);
    const fov = lerp(a.fov, b.fov, f);
    if (Math.abs(camera.fov - fov) > 1e-4) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

/** e2e (?e2e=1): `window.__behocWander()` trả vị trí và toạ độ trên canvas của thú khu đang xem */
function Probe({ agents, offsetX }: { agents: readonly Agent[]; offsetX: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!IS_E2E) return;
    window.__behocWander = () => {
      const out: Record<string, { x: number; y: number; z: number; yaw: number; mode: string; sx: number; sy: number }> = {};
      const v = new Vector3();
      for (const a of agents) {
        v.set(a.x + offsetX, a.y + 0.4, a.z).project(camera);
        out[a.id] = { x: a.x, y: a.y, z: a.z, yaw: a.yaw, mode: a.mode, sx: ((v.x + 1) / 2) * size.width, sy: ((1 - v.y) / 2) * size.height };
      }
      return out;
    };
    return () => {
      delete window.__behocWander;
    };
  }, [agents, offsetX, camera, size]);
  return null;
}

function HabitatView({
  index,
  herd,
  active,
  shadows,
  onTap,
  onLoaded,
}: {
  index: number;
  herd: Herd;
  active: boolean;
  shadows: boolean;
  onTap(index: number, id: string, agent: Agent): void;
  onLoaded(index: number): void;
}) {
  const habitat = HABITAT_IDS[index];
  const tap = useCallback((id: string, agent: Agent) => onTap(index, id, agent), [index, onTap]);
  const loaded = useCallback(() => onLoaded(index), [index, onLoaded]);
  return (
    <group position={[index * SPACING, 0, 0]}>
      <Scenery habitat={habitat} active={active} />
      {shadows && (
        <ContactShadows position={[0, 0.005, 0]} opacity={0.3} blur={2.8} scale={14} far={SHADOW_FAR[habitat]} resolution={256} color="#5b3f6b" />
      )}
      <Suspense fallback={null}>
        <AnimalHerd herd={herd} active={active} onTap={tap} onLoaded={loaded} />
      </Suspense>
    </group>
  );
}

export type WorldSceneProps = {
  swipe: Swipe;
  herds: readonly Herd[];
  /** khu được dựng (khu đang xem ±1) */
  mounted: readonly number[];
  /** khu đang thấy (chuyển động, có bóng) */
  visible: readonly number[];
  /** khu hiện tại (đích của dải) */
  current: number;
  onTap(index: number, id: string, agent: Agent): void;
  onLoaded(index: number): void;
};

export default function WorldScene({ swipe, herds, mounted, visible, current, onTap, onLoaded }: WorldSceneProps) {
  const [start] = useState(() => HABITATS[HABITAT_IDS[current]].view);
  return (
    <Scene3D label="world" contactShadows={false} view={start}>
      <CameraRig swipe={swipe} />
      {mounted.map((i) => (
        <HabitatView key={i} index={i} herd={herds[i]} active={visible.includes(i)} shadows={visible.includes(i)} onTap={onTap} onLoaded={onLoaded} />
      ))}
      <Probe agents={herds[current].agents} offsetX={current * SPACING} />
    </Scene3D>
  );
}
