import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, BufferGeometry, DoubleSide, Euler, Float32BufferAttribute, LoopRepeat, Matrix4, Mesh, Vector3, type BufferAttribute, type Group, type Material, type Object3D } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { reactJump, startReact, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';

/**
 * Phương án C "3D chân thực có texture": model có texture (scan / game-ready, CC0 hoặc CC BY) trong
 * public/demo-realism/models/. Có khung xương + clip (cá voi, cá heo, cáo) thì phát clip; model tĩnh thì
 * "nướng" hình về hệ toạ độ chuẩn (đầu nhìn +z, chân ở y = 0) rồi uốn đỉnh trên CPU mỗi khung hình:
 * cá vẫy đuôi sang ngang, cá đuối vỗ cánh, thú bốn chân đung đưa chân trước/sau ngược pha.
 */

type Deform = 'swim' | 'wings' | 'walk' | 'none';
type Cfg = {
  file: string;
  /** chiều cao hiển thị (thú đi) hoặc chiều dài thân (con bơi), đơn vị 3D */
  size: number;
  /** xoay về chuẩn: đầu nhìn +z, lưng lên +y */
  rot: [number, number, number];
  deform: Deform;
  /** clip: khi đi / khi đứng */
  move?: string;
  idle?: string;
  /** nhịp clip (timeScale) */
  clipSpeed?: number;
  /** bỏ mesh có vật liệu tên này (khối thước đo kèm bản scan) */
  skip?: string;
};

export const REAL: Record<string, Cfg> = {
  whale: { file: 'whale', size: 2.4, rot: [-0.6, 0, 0], deform: 'none', move: 'Take 001', clipSpeed: 0.8 },
  dolphin: { file: 'dolphin', size: 1.5, rot: [0, 0, 0], deform: 'none', move: 'Take 001' },
  clownfish: { file: 'clownfish', size: 0.62, rot: [0, 0, 0], deform: 'swim' },
  puffer: { file: 'puffer', size: 0.75, rot: [0, Math.PI / 2, 0], deform: 'swim', skip: 'Material.001' },
  manta: { file: 'ray', size: 1.7, rot: [0, Math.PI / 2, 0], deform: 'wings', skip: 'Material.001' },
  horse: { file: 'horse', size: 1.15, rot: [0, 0, 0], deform: 'walk' },
  cow: { file: 'cow', size: 0.95, rot: [0, 0, 0], deform: 'walk' },
  zebra: { file: 'zebra', size: 1.1, rot: [0, 0, 0], deform: 'walk' },
  deer: { file: 'deer', size: 1.05, rot: [0, 0, 0], deform: 'walk' },
  fox: { file: 'fox', size: 0.55, rot: [0, 0, 0], deform: 'none', move: 'Walk', idle: 'Survey' },
};

const url = (f: string) => `${import.meta.env.BASE_URL}demo-realism/models/${f}.glb`;
const MIN_HIT = 1.3;

type Baked = { parts: { geo: BufferGeometry; base: Float32Array; mat: Material | Material[] }[]; box: Box3 };

/** Gộp mọi mesh tĩnh về hệ toạ độ của gốc model, xoay về chuẩn */
function bake(scene: Object3D, rot: Matrix4, skip?: string): Baked {
  scene.updateMatrixWorld(true);
  const inv = new Matrix4().copy(scene.matrixWorld).invert();
  const parts: Baked['parts'] = [];
  const box = new Box3();
  scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh || !m.visible || (skip && (m.material as Material).name === skip)) return;
    const g = m.geometry.clone();
    // meshopt lượng tử hoá đỉnh (Int16 chuẩn hoá): đổi sang Float32 trước khi nhân ma trận, nếu không toạ độ
    // mới bị kẹp vào [-1, 1] của kiểu số nguyên và con vật biến thành một khối hộp
    for (const name of ['position', 'normal'] as const) {
      const at = g.getAttribute(name);
      if (!at || at.array instanceof Float32Array) continue;
      const f = new Float32Array(at.count * 3);
      for (let i = 0; i < at.count; i++) {
        f[i * 3] = at.getX(i);
        f[i * 3 + 1] = at.getY(i);
        f[i * 3 + 2] = at.getZ(i);
      }
      g.setAttribute(name, new Float32BufferAttribute(f, 3));
    }
    g.applyMatrix4(new Matrix4().multiplyMatrices(rot, new Matrix4().multiplyMatrices(inv, m.matrixWorld)));
    g.computeBoundingBox();
    box.union(g.boundingBox!);
    // bản scan giảm tam giác có lỗ thủng nhỏ: vẽ cả hai mặt, đục (không trong suốt) cho đỡ lốm đốm
    const mat = (Array.isArray(m.material) ? m.material[0] : m.material).clone();
    mat.side = DoubleSide;
    mat.transparent = false;
    mat.alphaTest = 0;
    parts.push({ geo: g, base: Float32Array.from(g.attributes.position.array), mat });
  });
  return { parts, box };
}

export function RealAnimal({ def, agent, phase = 0, onTap }: { def: WorldAnimal; agent: Agent; phase?: number; onTap?: (id: string, agent: Agent) => void }) {
  const cfg = REAL[def.id];
  const gltf = useGLTF(url(cfg.file));
  const animated = gltf.animations.length > 0;
  const rotM = useMemo(() => new Matrix4().makeRotationFromEuler(new Euler(...cfg.rot)), [cfg.rot]);
  const swimmer = def.motion !== 'walk' && def.motion !== 'hop';

  // Model có clip: clone có xương riêng; model tĩnh: nướng hình để uốn đỉnh
  const skinned = useMemo(() => {
    if (!animated) return null;
    const c = cloneSkinned(gltf.scene) as Group;
    c.rotation.set(...cfg.rot);
    c.updateMatrixWorld(true);
    const box = new Box3().setFromObject(c, true);
    return { obj: c, box };
  }, [animated, gltf.scene, cfg.rot]);
  const baked = useMemo(() => (animated ? null : bake(gltf.scene, rotM, cfg.skip)), [animated, gltf.scene, rotM, cfg.skip]);
  useEffect(() => () => baked?.parts.forEach((p) => p.geo.dispose()), [baked]);

  const box = (skinned?.box ?? baked?.box)!;
  const sz = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  // con bơi: `size` là chiều dài thân (trục z); thú đi: chiều cao
  const scale = swimmer ? cfg.size / Math.max(sz.z, sz.x) : cfg.size / sz.y;
  const offset: [number, number, number] = swimmer ? [-center.x, -center.y, -center.z] : [-center.x, -box.min.y, -center.z];

  const { actions } = useAnimations(gltf.animations, skinned?.obj);
  useEffect(() => {
    if (!skinned) return;
    for (const name of [cfg.move, cfg.idle]) {
      const act = name ? actions[name] : undefined;
      if (!act) continue;
      act.reset().setLoop(LoopRepeat, Infinity).play();
      act.setEffectiveWeight(name === cfg.move ? 1 : 0);
      act.time = phase % act.getClip().duration;
      act.timeScale = cfg.clipSpeed ?? 1;
    }
  }, [actions, skinned, cfg, phase]);

  const root = useRef<Group>(null);
  const yawG = useRef<Group>(null);
  const body = useRef<Group>(null);
  const stride = useRef(phase * 2);
  const w = useRef(1);

  useFrame((frame, rawDt) => {
    const r = root.current;
    const yg = yawG.current;
    const b = body.current;
    if (!r || !yg || !b) return;
    const dt = Math.min(rawDt, 0.1);
    const a = agent;
    const time = frame.clock.elapsedTime + phase;
    const m = a.moving;
    stride.current += a.speed * dt * (swimmer ? 6 : 10);
    const st = stride.current;

    if (skinned && cfg.idle && cfg.move) {
      w.current += (m - w.current) * Math.min(1, dt * 4);
      actions[cfg.move]?.setEffectiveWeight(w.current);
      actions[cfg.idle]?.setEffectiveWeight(1 - w.current);
      const mv = actions[cfg.move];
      if (mv) mv.timeScale = 0.5 + a.speed * 2.2;
    }

    if (baked && cfg.deform !== 'none') {
      const L = Math.max(baked.box.max.z - baked.box.min.z, 1e-6);
      const Hh = Math.max(baked.box.max.y - baked.box.min.y, 1e-6);
      const Wd = Math.max(baked.box.max.x - baked.box.min.x, 1e-6);
      for (const p of baked.parts) {
        const pos = p.geo.attributes.position as BufferAttribute;
        const arr = pos.array as Float32Array;
        const base = p.base;
        for (let i = 0; i < arr.length; i += 3) {
          const x0 = base[i];
          const y0 = base[i + 1];
          const z0 = base[i + 2];
          let x = x0;
          let y = y0;
          let z = z0;
          if (cfg.deform === 'swim') {
            // t: 0 ở mũi (+z), 1 ở đuôi
            const t = (baked.box.max.z - z0) / L;
            const k = Math.max(0, t - 0.3) / 0.7;
            x += Math.sin(time * 8 - t * 4) * L * 0.12 * k * k;
          } else if (cfg.deform === 'wings') {
            const d = Math.abs(x0 - (baked.box.min.x + Wd / 2)) / (Wd / 2);
            y += Math.sin(time * 2.1 - d * 1.4) * Wd * 0.12 * d * d;
          } else if (cfg.deform === 'walk') {
            const v = (y0 - baked.box.min.y) / Hh;
            const LEG = 0.45;
            if (v < LEG) {
              const k = (LEG - v) / LEG;
              const front = z0 > baked.box.min.z + L / 2 ? 0 : Math.PI;
              const side = x0 > baked.box.min.x + Wd / 2 ? Math.PI : 0;
              z += Math.sin(st + front + side) * L * 0.07 * k * m;
            }
          }
          arr[i] = x;
          arr[i + 1] = y;
          arr[i + 2] = z;
        }
        pos.needsUpdate = true;
      }
    }

    const jp = reactJump(a);
    const jump = jp >= 0 ? Math.sin(jp * Math.PI) * (swimmer ? 0.25 : 0.5) : 0;
    const bob = swimmer ? Math.sin(time * 1.3) * 0.04 : Math.abs(Math.sin(st)) * 0.03 * m;
    r.position.set(a.x, a.y + (swimmer ? a.halfH : 0), a.z);
    yg.rotation.y = a.yaw;
    b.position.y = bob + jump;
    b.rotation.set(-a.pitch, 0, a.roll + (swimmer ? 0 : Math.sin(st) * 0.02 * m));
  });

  const hitW = Math.max(MIN_HIT, swimmer ? cfg.size : cfg.size * 1.4);
  const hitH = Math.max(MIN_HIT, swimmer ? cfg.size * 0.5 : cfg.size);
  return (
    <group ref={root} position={[agent.x, agent.y, agent.z]}>
      <group ref={yawG}>
        <group ref={body}>
          <group scale={scale}>
            <group position={offset}>
              {skinned ? <primitive object={skinned.obj} /> : baked?.parts.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} />)}
            </group>
          </group>
        </group>
      </group>
      <mesh
        position={[0, swimmer ? 0 : cfg.size / 2, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          startReact(agent);
          onTap?.(def.id, agent);
        }}
      >
        <boxGeometry args={[hitW, hitH, 0.8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export function preloadReal() {
  for (const c of Object.values(REAL)) useGLTF.preload(url(c.file));
}
