import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, Group, BufferGeometry, Euler, Float32BufferAttribute, LoopRepeat, Matrix4, Vector3, type BufferAttribute, type Material, type Mesh, type Object3D, type SkinnedMesh } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { reactJump, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';
import { modelUrl, type ModelLook } from './look';
import { HitBox } from './HitBox';

/**
 * Thú "3D có texture" (model scan / game-ready, CC0 hoặc CC BY) trong public/models/world/real/.
 * Có khung xương + clip (cá voi, cá heo, cáo) thì phát clip, trộn đi/đứng theo agent; model tĩnh thì "nướng" hình
 * về hệ toạ độ chuẩn (đầu nhìn +z, lưng lên +y) rồi uốn đỉnh trên CPU mỗi khung hình: cá vẫy đuôi sang ngang,
 * thú bốn chân đung đưa chân trước/sau, trái/phải ngược pha.
 */

/** to hơn khung thân WORLD_ANIMALS một chút (model thật không có phần thừa như model đồ chơi) */
const FIT = 1.1;
/** con `side`: lệch tối đa khỏi hướng nghiêng (rad) */
const SIDE_MAX = 0.6;

type Part = { geo: BufferGeometry; base: Float32Array; mat: Material };
type Baked = { parts: Part[]; box: Box3 };

/** Gộp mọi mesh tĩnh về hệ toạ độ của gốc model, xoay về chuẩn */
function bake(scene: Object3D, rot: Matrix4, skip?: string): Baked {
  scene.updateMatrixWorld(true);
  const inv = new Matrix4().copy(scene.matrixWorld).invert();
  const parts: Part[] = [];
  const box = new Box3();
  scene.traverse((o) => {
    const m = o as Mesh;
    const mat = Array.isArray(m.material) ? m.material[0] : m.material;
    if (!m.isMesh || !m.visible || (skip && (mat.name === skip || m.name.startsWith(skip)))) return;
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
    // Mesh có xương: lấy dáng đang đứng (áp xương ở tư thế gốc), không phải toạ độ bind thô
    const sk = m as Mesh & Partial<SkinnedMesh>;
    if (sk.isSkinnedMesh && sk.applyBoneTransform) {
      const pos = g.getAttribute('position');
      const v = new Vector3();
      for (let i = 0; i < pos.count; i++) {
        sk.applyBoneTransform(i, v.fromBufferAttribute(pos, i));
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      g.deleteAttribute('skinIndex');
      g.deleteAttribute('skinWeight');
    }
    g.applyMatrix4(new Matrix4().multiplyMatrices(rot, new Matrix4().multiplyMatrices(inv, m.matrixWorld)));
    g.computeBoundingBox();
    box.union(g.boundingBox!);
    parts.push({ geo: g, base: Float32Array.from(g.attributes.position.array), mat });
  });
  return { parts, box };
}

type Props = {
  def: WorldAnimal;
  look: ModelLook;
  agent: Agent;
  active: boolean;
  phase: number;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

export function RealAnimal({ def, look, agent, active, phase, onTap, onLoaded }: Props) {
  const gltf = useGLTF(modelUrl(look.file));
  const animated = gltf.animations.length > 0 && !look.bake;
  const [rx, ry, rz] = look.rot;
  const turn = look.turn ?? 0;
  const pitch = look.pitch ?? 0;
  const grounded = def.motion === 'walk' || def.motion === 'hop';

  // Model có clip: clone có xương riêng; model tĩnh: nướng hình để uốn đỉnh
  const { skinned, baked, box } = useMemo(() => {
    if (animated) {
      const c = cloneSkinned(gltf.scene) as Group;
      c.rotation.set(rx, ry, rz);
      // quay thêm quanh trục đứng sau khi dựng thẳng (turn), bọc ngoài để không lẫn thứ tự Euler
      const holder = new Group();
      const tilt = new Group();
      holder.rotation.y = turn;
      tilt.rotation.x = pitch;
      // quay đầu trước (holder), ngóc/chúc sau (tilt, bọc ngoài) để pitch luôn quanh trục ngang của thân
      holder.add(c);
      tilt.add(holder);
      tilt.updateMatrixWorld(true);
      return { skinned: tilt, baked: null, box: new Box3().setFromObject(tilt, true) };
    }
    const b = bake(gltf.scene, new Matrix4().makeRotationX(pitch).multiply(new Matrix4().makeRotationY(turn)).multiply(new Matrix4().makeRotationFromEuler(new Euler(rx, ry, rz))), look.skip);
    return { skinned: null, baked: b, box: b.box };
  }, [animated, gltf.scene, rx, ry, rz, turn, pitch, look.skip]);
  useEffect(() => () => baked?.parts.forEach((p) => p.geo.dispose()), [baked]);

  const { scale, offset, size } = useMemo(() => {
    const sz = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    const k = FIT * (look.scale ?? 1);
    const s = Math.min((def.height * k) / sz.y, (def.len * def.height * k) / Math.max(sz.x, sz.z));
    const off: [number, number, number] = grounded ? [-c.x, -box.min.y, -c.z] : [-c.x, -c.y, -c.z];
    return { scale: s, offset: off, size: [Math.max(sz.x, sz.z) * s, sz.y * s] as const };
  }, [box, def.height, def.len, look.scale, grounded]);

  const { actions, mixer } = useAnimations(gltf.animations, skinned ?? undefined);
  useEffect(() => {
    if (!skinned) return;
    for (const name of [look.move, look.idle]) {
      const act = name ? actions[name] : undefined;
      if (!act) continue;
      act.reset().setLoop(LoopRepeat, Infinity).play();
      act.setEffectiveWeight(name === look.move ? 1 : 0);
      act.time = phase % act.getClip().duration;
      act.timeScale = look.clipSpeed ?? 1;
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer, skinned, look, phase]);
  // Khu ẩn: dừng mixer (tiết kiệm pin iPad)
  useEffect(() => {
    mixer.timeScale = active ? 1 : 0;
  }, [mixer, active]);
  useEffect(() => {
    onLoaded?.();
  }, [box, onLoaded]);

  const root = useRef<Group>(null);
  const yawG = useRef<Group>(null);
  const body = useRef<Group>(null);
  const stride = useRef(phase * 2);
  const walkW = useRef(1);
  const sideSign = useRef(Math.sin(agent.yaw) >= 0 ? 1 : -1);
  const shownYaw = useRef(agent.yaw);

  useFrame((frame, rawDt) => {
    if (!active) return;
    const r = root.current;
    const yg = yawG.current;
    const b = body.current;
    if (!r || !yg || !b) return;
    const dt = Math.min(rawDt, 0.1);
    const a = agent;
    const time = frame.clock.elapsedTime + phase;
    const m = a.moving;
    stride.current += a.speed * dt * (grounded ? 10 : 6);
    const st = stride.current;

    if (skinned && look.idle && look.move) {
      walkW.current += (m - walkW.current) * Math.min(1, dt * 4);
      actions[look.move]?.setEffectiveWeight(walkW.current);
      actions[look.idle]?.setEffectiveWeight(1 - walkW.current);
      const mv = actions[look.move];
      if (mv) mv.timeScale = 0.5 + a.speed * 2.2;
    }

    if (baked && look.deform !== 'none') {
      const { min, max } = baked.box;
      const L = Math.max(max.z - min.z, 1e-6);
      const Hh = Math.max(max.y - min.y, 1e-6);
      const midX = (min.x + max.x) / 2;
      const Wd = max.x - min.x;
      const stepAmp = look.stepAmp ?? 0.07;
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
          if (look.deform === 'fluke') {
            // cá voi/cá heo: thân uốn sóng lên xuống, mạnh dần về đuôi (không lắc ngang như cá)
            const t = (max.z - z0) / L;
            const k = Math.max(0, t - 0.25) / 0.75;
            y += Math.sin(time * 2.2 - t * 3) * L * 0.07 * k * k;
          } else if (look.deform === 'swim') {
            const t = (max.z - z0) / L; // 0 ở mũi (+z), 1 ở đuôi
            const k = Math.max(0, t - 0.3) / 0.7;
            x += Math.sin(time * 8 - t * 4) * L * 0.12 * k * k;
          } else {
            const v = (y0 - min.y) / Hh;
            const LEG = 0.45;
            if (v < LEG) {
              const k = (LEG - v) / LEG;
              const front = z0 > min.z + L / 2 ? 0 : Math.PI;
              const side = x0 > midX ? Math.PI : 0;
              z += Math.sin(st + front + side) * L * stepAmp * k * m;
              // nhấc chân lên ở nửa nhịp bước về phía trước
              y += Math.max(0, Math.cos(st + front + side)) * Hh * stepAmp * 0.5 * k * k * m;
            }
            const head = (z0 - (max.z - L * 0.4)) / (L * 0.4); // 0..1 trong 40% phía đầu
            if (look.trunk && head > 0.55 && v < 0.75) {
              // vòi đung đưa: càng xa đầu (thấp, phía trước) càng lắc nhiều
              const k = (head - 0.55) / 0.45;
              x += Math.sin(time * 1.4 + (0.75 - v) * 4) * L * 0.07 * k * (0.75 - v);
            }
            if (look.ears && head > 0 && v > 0.4) {
              // tai vẫy: phần nằm ngoài bề ngang thân đập ra trước/sau quanh gốc tai
              const out = Math.abs(x0 - midX) - Wd * 0.22;
              if (out > 0) z += Math.sin(time * 2.2 + (x0 > midX ? 0 : 0.6)) * out * 0.55;
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
    const jump = jp >= 0 ? Math.sin(jp * Math.PI) * (grounded ? 0.5 : 0.25) : 0;
    const bob = grounded ? Math.abs(Math.sin(st)) * 0.03 * m : Math.sin(time * 1.3) * 0.04;
    // Con đứng yên một góc: lắc lư nhẹ quanh hướng nhìn camera
    const sway = a.fixed && a.mode === 'idle' ? Math.sin(time * 0.6) * 0.15 : 0;
    r.position.set(a.x, a.y + (grounded ? 0 : a.halfH), a.z);
    let yaw = a.yaw + sway;
    if (look.side) {
      // con dài (cá voi): luôn cho bé thấy thân nghiêng, không quay thẳng mặt về camera (trông như một cục tròn)
      const sn = Math.sin(yaw);
      if (Math.abs(sn) > 0.3) sideSign.current = sn > 0 ? 1 : -1;
      const base = (sideSign.current * Math.PI) / 2;
      const off = Math.atan2(Math.sin(yaw - base), Math.cos(yaw - base));
      const target = base + Math.max(-SIDE_MAX, Math.min(SIDE_MAX, off));
      const d = Math.atan2(Math.sin(target - shownYaw.current), Math.cos(target - shownYaw.current));
      shownYaw.current += d * Math.min(1, dt * 3);
      yaw = shownYaw.current;
    }
    yg.rotation.y = yaw;
    b.position.y = bob + jump;
    b.rotation.set(-a.pitch, 0, a.roll + (grounded ? Math.sin(st) * 0.02 * m : 0));
  });

  return (
    <group ref={root} position={[agent.x, agent.y, agent.z]}>
      <group ref={yawG}>
        <group ref={body}>
          <group scale={scale}>
            <group position={offset}>
              {skinned ? <primitive object={skinned} /> : baked?.parts.map((p, i) => <mesh key={i} geometry={p.geo} material={p.mat} />)}
            </group>
          </group>
        </group>
      </group>
      <HitBox def={def} agent={agent} w={size[0]} h={size[1]} centerY={grounded ? size[1] / 2 : 0} onTap={onTap} />
    </group>
  );
}
