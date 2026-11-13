import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useAnimations, useGLTF } from '@react-three/drei';
import { Box3, LoopRepeat, Vector3, type AnimationAction, type Group } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { reactJump, startReact, stepAgents, type Agent } from '../core/steer';
import { blendWeight, createMix } from '../core/animalClips';
import { mixFor } from '../core/animalClips';
import { CLIP_NAMES, type ClipName, type WorldAnimal } from '../core/worldAnimals';
import type { Herd } from '../core/herd';

/**
 * Con thú 3D cử động giống thật, dùng cho "thế giới thú" và Sở thú.
 *
 * - Model có clip (Quaternius): `useGLTF` + `SkeletonUtils.clone` (mỗi con một bộ xương riêng) + `useAnimations`.
 *   Trạng thái chuyển động (`agent`, xem core/steer.ts) → trọng số clip (core/animalClips.ts), crossfade ~0.28s,
 *   timeScale = tốc độ thật / tốc độ neo để chân không trượt.
 * - Model tĩnh (Poly): dáng giả bằng code (nhún theo bước, lắc thân, nhảy lò cò, vẫy giả khi bay, gật đầu ăn).
 * - Chạm (onPointerDown): con vật dừng, ngoảnh về bé, làm động tác vui ngay trong khung hình kế tiếp (<100ms),
 *   rồi gọi `onTap(def.id)` để game phát tiếng kêu/tên (xem `animalVoiceKeys`).
 * - `active = false`: dừng mixer và useFrame (khu không hiển thị), tiết kiệm pin iPad.
 *
 * Component KHÔNG tự bước `agent`; `AnimalHerd` (hoặc game) gọi `stepAgents` một lần mỗi frame cho cả nhóm,
 * vì đẩy nhau/đàn cá cần biết vị trí các con khác.
 */

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');
/** Vùng chạm tối thiểu (đơn vị 3D): camera z=10, fov 45 → ~100px/đơn vị, nên 1.3 ≈ 130px (luật 1) */
const MIN_HIT = 1.3;

type FakeParams = { strideRate: number; bob: number; roll: number; pitch: number; hop: number };
const FAKE: Record<string, FakeParams> = {
  walk: { strideRate: (Math.PI * 2) / 0.55, bob: 0.045, roll: 0.035, pitch: 0.02, hop: 0 },
  waddle: { strideRate: (Math.PI * 2) / 0.42, bob: 0.03, roll: 0.13, pitch: 0, hop: 0 },
  hop: { strideRate: (Math.PI * 2) / 0.5, bob: 0, roll: 0, pitch: 0.08, hop: 0.2 },
  swim: { strideRate: (Math.PI * 2) / 0.8, bob: 0.03, roll: 0.06, pitch: 0, hop: 0 },
  flap: { strideRate: (Math.PI * 2) / 0.35, bob: 0.08, roll: 0.05, pitch: 0.06, hop: 0 },
};

export type AnimatedAnimalProps = {
  def: WorldAnimal;
  agent: Agent;
  /** false: dừng mixer và useFrame (khu đang ẩn) */
  active?: boolean;
  /** chiều cao hiển thị (mặc định def.height) */
  height?: number;
  /** lệch pha nhịp thở/lắc cho các con cùng loại không đồng bộ */
  phase?: number;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

export function AnimatedAnimal({ def, agent, active = true, height, phase = 0, onTap, onLoaded }: AnimatedAnimalProps) {
  const h = height ?? def.height;
  const rootRef = useRef<Group>(null);
  const yawRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);
  const gltf = useGLTF(import.meta.env.BASE_URL + 'models/' + def.model);

  const { model, scale, yOffset, size } = useMemo(() => {
    // SkeletonUtils.clone: mỗi con một bộ xương riêng (clone() thường dùng chung xương → các con cử động giống hệt)
    const cloned = cloneSkinned(gltf.scene) as Group;
    cloned.position.set(0, 0, 0);
    cloned.rotation.set(0, 0, 0);
    cloned.scale.set(1, 1, 1);
    cloned.updateMatrixWorld(true);
    const box = new Box3().setFromObject(cloned, true);
    const sz = new Vector3();
    box.getSize(sz);
    const s = sz.y > 0 ? h / sz.y : 1;
    const center = new Vector3();
    box.getCenter(center);
    cloned.position.set(-center.x, 0, -center.z);
    return { model: cloned, scale: s, yOffset: -box.min.y * s, size: [sz.x * s, sz.y * s, sz.z * s] as const };
  }, [gltf.scene, h]);

  const { actions, mixer } = useAnimations(gltf.animations, model);
  const mix = useMemo(() => createMix(), []);
  const weights = useMemo(() => {
    const w = {} as Record<ClipName, number>;
    for (const c of CLIP_NAMES) w[c] = 0;
    return w;
  }, []);
  const stride = useRef(phase * 3);
  const lastMode = useRef(agent.mode);

  // Bật mọi clip một lần (trọng số 0), useFrame chỉ đổi trọng số/timeScale
  useEffect(() => {
    for (const c of CLIP_NAMES) {
      const act = actions[c] as AnimationAction | undefined;
      if (!act) continue;
      act.reset();
      act.setLoop(LoopRepeat, Infinity);
      act.setEffectiveWeight(0);
      act.play();
      act.time = (phase * 0.37) % Math.max(0.01, act.getClip().duration);
    }
    return () => {
      mixer.stopAllAction();
    };
  }, [actions, mixer, phase]);

  // Khu ẩn: tắt hẳn các action (mixer.update bỏ qua action không enabled)
  useEffect(() => {
    for (const c of CLIP_NAMES) {
      const act = actions[c] as AnimationAction | undefined;
      if (act) act.enabled = active;
    }
  }, [actions, active]);

  useEffect(() => {
    onLoaded?.();
  }, [model, onLoaded]);

  const fake = def.clips.length === 0 ? FAKE[def.fake ?? 'walk'] : null;
  const halfLen = Math.max(size[0], size[2]) / 2;
  const halfWid = Math.min(size[0], size[2]) / 2;
  const yawOffset = def.yawOffset ?? 0;

  useFrame((frame, rawDt) => {
    if (!active) return;
    const root = rootRef.current;
    const yawG = yawRef.current;
    const body = bodyRef.current;
    if (!root || !yawG || !body) return;
    const dt = rawDt > 0.25 ? 0.25 : rawDt;
    const a = agent;
    const time = frame.clock.elapsedTime + phase;

    // Clip: trọng số đích theo trạng thái, trộn dần (crossfade)
    if (!fake) {
      mixFor(a, def, mix, h);
      const startedReact = a.mode === 'react' && lastMode.current !== 'react';
      for (const c of def.clips) {
        const act = actions[c];
        if (!act) continue;
        // Động tác vui bắt đầu lại từ đầu mỗi lần được chạm
        if (startedReact && mix.weight[c] > 0 && (c === 'Happy' || c === 'Jump')) act.time = 0;
        weights[c] = startedReact && mix.weight[c] > 0 ? Math.max(weights[c], 0.5) : blendWeight(weights[c], mix.weight[c], dt);
        act.setEffectiveWeight(weights[c]);
        if (mix.scrub === c) {
          act.timeScale = 0;
          act.time = mix.scrubP * act.getClip().duration;
        } else act.timeScale = mix.scale[c];
      }
    }
    lastMode.current = a.mode;

    // Dáng giả cho model tĩnh
    let y = 0;
    let roll = 0;
    let pitch = 0;
    let sy = 1;
    if (fake) {
      stride.current += a.speed * dt * fake.strideRate;
      const st = stride.current;
      const m = a.moving;
      if (a.motion === 'hop' && a.hop >= 0) {
        y = Math.sin(a.hop * Math.PI) * 0.25;
      } else if (fake.hop > 0) {
        const s = Math.sin(st);
        y = s > 0 ? s * fake.hop * m : 0;
        sy = s > 0 ? 1 + 0.05 * s * m : 1 + 0.08 * s * m;
        pitch = Math.cos(st) * fake.pitch * m;
      } else if (def.fake === 'flap') {
        // bay: nhấp nhô theo nhịp vỗ cánh
        y = Math.sin(time * 9) * fake.bob;
        pitch = Math.sin(time * 9 + 1) * fake.pitch;
      } else {
        y = Math.abs(Math.sin(st)) * fake.bob * m;
        roll = Math.sin(st) * fake.roll * m;
        pitch = Math.sin(st * 2) * fake.pitch * m;
      }
      const still = 1 - m;
      // đứng: thở, thỉnh thoảng cúi đầu gặm cỏ (ăn thì cúi nhiều hơn)
      sy *= 1 + Math.sin(time * 1.7) * 0.018 * still;
      const nod = Math.max(0, Math.sin(time * (a.mode === 'eat' ? 1.4 : 0.45)));
      pitch += nod ** 6 * (a.mode === 'eat' ? 0.25 : 0.12) * still;
      if (def.fake === 'swim') roll += Math.sin(time * 2) * 0.05;
    } else if (a.mode === 'idle' && a.motion !== 'fly') {
      sy = 1 + Math.sin(time * 1.7) * 0.012;
    }

    // Con đứng yên một góc: lắc lư nhẹ quanh hướng nhìn camera
    const sway = a.fixed && a.mode === 'idle' ? Math.sin(time * 0.6) * 0.15 : 0;

    // Được chạm (model tĩnh hoặc con không có clip vui): nhảy lên + nén/giãn
    let jumpY = 0;
    let sq = 1;
    const jp = reactJump(a);
    if (jp >= 0 && (fake || !(def.clips.includes('Happy') || def.clips.includes('Jump')))) {
      jumpY = Math.sin(jp * Math.PI) * (a.motion === 'walk' || a.motion === 'hop' ? 0.6 : 0.25);
      sq = 1 + Math.sin(jp * Math.PI * 2) * 0.08;
    }

    root.position.set(a.x, a.y, a.z);
    yawG.rotation.y = a.yaw + sway + yawOffset;
    // Nâng thân đúng phần mũi/hông bị nghiêng xuống để không lún đất (chỉ trên mặt đất)
    const onGround = a.motion === 'walk' || a.motion === 'hop';
    const lift = onGround ? Math.abs(pitch) * halfLen + Math.abs(roll) * halfWid : 0;
    body.position.y = yOffset + y + jumpY + lift;
    body.rotation.set(pitch - a.pitch, 0, roll + a.roll);
    const sxz = scale * sq * (2 - sy) ** 0.5;
    body.scale.set(sxz, (scale / sq) * sy, sxz);
  });

  // Vùng chạm trong suốt, đi theo con vật nhưng không xoay; ≥ MIN_HIT cho ngón tay bé
  const hbW = Math.max(MIN_HIT, halfLen * 2 + 0.3);
  const hbH = Math.max(MIN_HIT, h + 0.3);

  return (
    <group ref={rootRef} position={[agent.x, agent.y, agent.z]}>
      <group ref={yawRef} rotation={[0, agent.yaw + yawOffset, 0]}>
        <group ref={bodyRef} position={[0, yOffset, 0]} scale={scale}>
          {/* Model gốc nhìn về +z (về camera) khi yaw = 0 */}
          <primitive object={model} />
        </group>
      </group>
      <mesh
        position={[0, h / 2, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          startReact(agent);
          onTap?.(def.id, agent);
        }}
      >
        <boxGeometry args={[hbW, hbH, Math.max(MIN_HIT, halfWid * 2 + 0.3)]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

type HerdProps = {
  herd: Herd;
  active?: boolean;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

/** Cả đàn thú của một khu: bước chuyển động một lần mỗi frame cho cả nhóm rồi vẽ từng con. */
export function AnimalHerd({ herd, active = true, onTap, onLoaded }: HerdProps) {
  useFrame((_, dt) => {
    if (active) stepAgents(herd.agents, dt);
  });
  return (
    <>
      {herd.members.map((m, i) => (
        <AnimatedAnimal key={m.key} def={m.def} agent={m.agent} active={active} phase={i * 0.8} onTap={onTap} onLoaded={onLoaded} />
      ))}
    </>
  );
}

export type AgentSnapshot = Record<string, { x: number; y: number; z: number; yaw: number; mode: string; sx: number; sy: number }>;

/**
 * Chỉ dùng cho e2e (?e2e=1): `window.__behocWander()` trả vị trí, hướng, mode từng con và toạ độ giữa thân
 * trên canvas (px trong khung Stage) để test chạm thật.
 */
export function AgentProbe({ agents, bodyY = 0.6 }: { agents: readonly Agent[]; bodyY?: number }) {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  useEffect(() => {
    if (!IS_E2E) return;
    window.__behocWander = () => {
      const out: AgentSnapshot = {};
      const v = new Vector3();
      for (const a of agents) {
        v.set(a.x, a.y + bodyY, a.z).project(camera);
        out[a.id] = { x: a.x, y: a.y, z: a.z, yaw: a.yaw, mode: a.mode, sx: ((v.x + 1) / 2) * size.width, sy: ((1 - v.y) / 2) * size.height };
      }
      return out;
    };
    return () => {
      delete window.__behocWander;
    };
  }, [agents, bodyY, camera, size]);
  return null;
}
