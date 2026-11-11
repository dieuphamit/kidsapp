import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Box3, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Group, Mesh, MeshStandardMaterial } from 'three';
import { createWander, jumpProgress, stepWander, type Gait, type Lane, type WanderState } from './wander';

/**
 * Con vật 3D dùng chung cho Trang trại và Sở thú: tải GLB, chuẩn hóa chiều cao, đặt chân chạm đất,
 * rồi cho đi dạo theo làn (`lane`) hoặc đứng yên lắc lư/thở/cúi gặm cỏ. Model Google Poly là lưới tĩnh
 * (không có clip animation, không có xương) nên dáng đi là thủ tục: nhún theo bước, lắc thân, nhảy lò cò.
 *
 * Toàn bộ chuyển động chạy trong useFrame trên ref, không setState mỗi frame.
 */

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');
const TARGET_HEIGHT = 1.2;

/** Bảng tra trạng thái đi lại theo id, để Game gọi phản ứng khi chạm và để e2e đọc vị trí */
export type WanderRegistry = Map<string, WanderState>;

/** Thông số dáng đi: strideRate = rad pha bước / đơn vị quãng đường */
const GAITS: Record<Gait, { strideRate: number; bob: number; roll: number; pitch: number; hop: number }> = {
  walk: { strideRate: (Math.PI * 2) / 0.55, bob: 0.045, roll: 0.035, pitch: 0.02, hop: 0 },
  waddle: { strideRate: (Math.PI * 2) / 0.42, bob: 0.03, roll: 0.13, pitch: 0, hop: 0 },
  hop: { strideRate: (Math.PI * 2) / 0.5, bob: 0, roll: 0, pitch: 0.08, hop: 0.2 },
  swim: { strideRate: (Math.PI * 2) / 0.8, bob: 0.03, roll: 0.06, pitch: 0, hop: 0 },
};

type Props = {
  id: string;
  model: string;
  height?: number;
  /** vị trí ban đầu; con đi dạo lấy z của làn từ đây */
  pos: readonly [number, number, number];
  /** góc đứng yên (radian) để mặt nhìn về camera */
  rotY?: number;
  lane?: Lane;
  gait?: Gait;
  phase: number;
  registry: WanderRegistry;
  onTap: () => void;
  onLoaded: () => void;
};

export function WanderAnimal({ id, model, height, pos, rotY = 0, lane, gait = 'walk', phase, registry, onTap, onLoaded }: Props) {
  const rootRef = useRef<Group>(null);
  const yawRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const { scene } = useGLTF(import.meta.env.BASE_URL + 'models/' + model);
  const [state] = useState(() => createWander(pos, rotY, lane, Math.round(phase * 1000) + 7));

  const { clonedScene, scale, yOffset, size } = useMemo(() => {
    // SkeletonUtils.clone: an toàn cho cả model có xương lẫn lưới tĩnh
    const cloned = cloneSkinned(scene);
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrixWorld(true);

    const box = new Box3().setFromObject(cloned, true);
    const sz = new Vector3();
    box.getSize(sz);
    // Scale theo chiều cao để mọi con cao ~1.2 (riêng con to khai báo height)
    const s = sz.y > 0 ? (height ?? TARGET_HEIGHT) / sz.y : 1;
    // Offset y để chân đặt đúng mặt đất; căn tâm x/z về gốc
    const yOff = -box.min.y * s;
    const center = new Vector3();
    box.getCenter(center);
    cloned.position.set(-center.x, 0, -center.z);
    return { clonedScene: cloned, scale: s, yOffset: yOff, size: [sz.x * s, sz.y * s, sz.z * s] as const };
  }, [scene, height]);

  useEffect(() => {
    clonedScene.traverse((child) => {
      if ((child as Mesh).isMesh) {
        const mat = (child as Mesh).material as MeshStandardMaterial;
        if (mat && mat.isMeshStandardMaterial) {
          mat.roughness = 0.85;
          mat.metalness = 0;
        }
      }
    });
    onLoaded();
  }, [clonedScene, onLoaded]);

  useEffect(() => {
    registry.set(id, state);
    return () => {
      registry.delete(id);
    };
  }, [registry, id, state]);

  const g = GAITS[gait];
  // Nửa chiều dài thân (theo hướng mặt) và nửa bề ngang: để nâng thân khi nghiêng, chân/mũi không lún đất
  const halfLen = Math.max(size[0], size[2]) / 2;
  const halfWid = Math.min(size[0], size[2]) / 2;

  useFrame((frame, dt) => {
    const root = rootRef.current;
    const yawG = yawRef.current;
    const body = bodyRef.current;
    if (!root || !yawG || !body) return;

    stepWander(state, lane, dt, g.strideRate);
    const time = frame.clock.elapsedTime + phase;
    const m = state.moving;
    const still = 1 - m;
    const st = state.stride;

    // Dáng đi theo bước chân
    let y = 0;
    let roll = 0;
    let pitch = 0;
    let sy = 1;
    if (g.hop > 0) {
      // Nhảy lò cò: nửa chu kỳ trên không, nửa chu kỳ chạm đất (nén nhẹ khi đáp)
      const s = Math.sin(st);
      y = s > 0 ? s * g.hop * m : 0;
      sy = s > 0 ? 1 + 0.05 * s * m : 1 + 0.08 * s * m;
      pitch = Math.cos(st) * g.pitch * m;
    } else {
      y = Math.abs(Math.sin(st)) * g.bob * m;
      roll = Math.sin(st) * g.roll * m;
      pitch = Math.sin(st * 2) * g.pitch * m;
    }

    // Lúc đứng: thở (phình nhẹ) và thỉnh thoảng cúi đầu gặm cỏ / mổ thóc
    sy *= 1 + Math.sin(time * 1.7) * 0.018 * still;
    const nod = Math.max(0, Math.sin(time * 0.45));
    pitch += nod * nod * nod * nod * nod * nod * 0.12 * still;

    // Cá: uốn thân bơi qua lại
    let wiggle = 0;
    if (gait === 'swim') {
      wiggle = Math.sin(time * 3) * 0.14;
      roll += Math.sin(time * 3 + 1) * 0.05;
    }

    // Con đứng yên: lắc lư nhẹ quanh hướng nhìn camera (như trước)
    const sway = state.mode === 'idle' ? Math.sin(time * 0.6) * 0.15 : 0;

    // Phản ứng khi được chạm: nhảy lên + nén/giãn
    let jumpY = 0;
    let sq = 1;
    const jp = jumpProgress(state);
    if (jp >= 0) {
      jumpY = Math.sin(jp * Math.PI) * 0.7;
      sq = 1 + Math.sin(jp * Math.PI * 2) * 0.08;
    }

    root.position.set(state.x, 0, state.z);
    yawG.rotation.y = state.yaw + sway + wiggle;
    // Nâng thân đúng phần mũi/hông bị nghiêng xuống để không lún vào đất
    const lift = Math.abs(pitch) * halfLen + Math.abs(roll) * halfWid;
    body.position.y = yOffset + y + jumpY + lift;
    body.rotation.set(pitch, 0, roll);
    const sxz = scale * sq * (2 - sy) ** 0.5;
    body.scale.set(sxz, (scale / sq) * sy, sxz);
  });

  // Vùng chạm trong suốt: đi theo con vật nhưng không xoay; con đi ngang dài hơn nên vùng rộng hơn
  const hbW = Math.max(1.5, (lane ? halfLen * 2 : halfWid * 2) + 0.4);
  const hbH = Math.max(1.6, (height ?? TARGET_HEIGHT) + 0.4);

  return (
    <group ref={rootRef} position={[pos[0], 0, pos[2]]}>
      <group ref={yawRef} rotation={[0, state.yaw, 0]}>
        <group ref={bodyRef} position={[0, yOffset, 0]} scale={scale}>
          {/* Model gốc đã nhìn về +z (về camera) khi yaw = 0 */}
          <primitive object={clonedScene} />
        </group>
      </group>
      <mesh
        position={[0, hbH / 2, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          onTap();
        }}
      >
        <boxGeometry args={[hbW, hbH, 1.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export type WanderSnapshot = Record<string, { x: number; z: number; yaw: number; mode: string; sx: number; sy: number }>;

/**
 * Chỉ dùng cho e2e (?e2e=1): `window.__behocWander()` trả vị trí, hướng, mode của từng con và toạ độ
 * trên canvas (px trong khung Stage) của giữa thân, để test chạm thật vào con đang đi.
 */
export function WanderProbe({ registry }: { registry: WanderRegistry }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!IS_E2E) return;
    window.__behocWander = () => {
      const out: WanderSnapshot = {};
      const v = new Vector3();
      for (const [id, s] of registry) {
        v.set(s.x, 0.6, s.z).project(camera);
        out[id] = {
          x: s.x,
          z: s.z,
          yaw: s.yaw,
          mode: s.mode,
          sx: ((v.x + 1) / 2) * size.width,
          sy: ((1 - v.y) / 2) * size.height,
        };
      }
      return out;
    };
    return () => {
      delete window.__behocWander;
    };
  }, [registry, camera, size]);
  return null;
}
