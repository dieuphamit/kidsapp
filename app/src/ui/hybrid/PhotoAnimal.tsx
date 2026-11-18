import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { DoubleSide, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferAttribute, type Group } from 'three';
import { reactJump, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';
import { photoUrl, type PhotoLook } from './look';
import { HitBox } from './HitBox';
import photoMeta from './photoMeta.json';

/**
 * Thú "ảnh thật 2.5D": ảnh chụp thật đã tách nền dán lên một tấm phẳng chia lưới, đứng trong cảnh 3D.
 * Chuyển động bằng biến dạng đỉnh trên CPU mỗi khung hình (vài trăm đỉnh), kiểu theo `look.style`
 * (xem PhotoStyle trong look.ts). Đổi hướng đi: tấm ảnh lật (scale.x qua 0) mượt trong ~0.3s.
 */

type Meta = { w: number; h: number; face: 'left' | 'right' };
export const PHOTO_META = photoMeta as Record<string, Meta>;

const SEG_X = 24;
const SEG_Y = 10;
/** cho thân to hơn khung thân của WORLD_ANIMALS một chút: ảnh thật không có phần thừa như model đồ chơi */
const FIT = 1.1;
/** quay đầu: thời gian (giây) và mức co ảnh ở giữa chừng (không bao giờ dẹt theo chiều ngang) */
export const FLIP_TIME = 0.3;
export const FLIP_SHRINK = 0.35;

/** Cỡ ảnh (cả ngang lẫn dọc) ở tiến độ quay đầu t (0..1): co nhẹ rồi nở lại, không bao giờ dưới 1 - FLIP_SHRINK */
export function turnScale(t: number): number {
  return 1 - FLIP_SHRINK * Math.sin(Math.min(1, Math.max(0, t)) * Math.PI);
}

/** Cỡ tấm ảnh (rộng, cao) vừa trong khung thân của con vật */
export function photoSize(def: WorldAnimal, look: PhotoLook, meta: Meta): [number, number] {
  const aspect = meta.w / meta.h;
  if (look.w) return [look.w, look.w / aspect];
  const k = FIT * (look.scale ?? 1);
  const maxW = def.len * def.height * k;
  const maxH = def.height * k;
  const H = Math.min(maxH, maxW / aspect);
  return [H * aspect, H];
}

type Props = {
  def: WorldAnimal;
  look: PhotoLook;
  agent: Agent;
  active: boolean;
  phase: number;
  onTap?: (id: string, agent: Agent) => void;
  onLoaded?: () => void;
};

export function PhotoAnimal({ def, look, agent, active, phase, onTap, onLoaded }: Props) {
  const meta = PHOTO_META[def.id];
  const tex = useTexture(photoUrl(def.id));
  const [W, H] = photoSize(def, look, meta);
  // con bơi/bay: tâm ảnh ở giữa thân; con đi/nhảy: chân chạm đất (y = 0)
  const grounded = look.style === 'walk' || look.style === 'hop';
  const headLeft = meta.face === 'left';

  const { geo, base, mat } = useMemo(() => {
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    const g = new PlaneGeometry(W, H, SEG_X, SEG_Y);
    g.translate(0, grounded ? H / 2 : 0, 0);
    const m = new MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: DoubleSide });
    return { geo: g, base: Float32Array.from(g.attributes.position.array), mat: m };
  }, [W, H, grounded, tex]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );
  useEffect(() => {
    onLoaded?.();
  }, [geo, onLoaded]);

  const root = useRef<Group>(null);
  const flipG = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  // +1: quay mặt sang phải (x tăng); giữ hướng cũ khi đứng yên hoặc đi về phía camera
  const facing = useRef(Math.sin(agent.heading) >= 0 ? 1 : -1);
  // hướng đang vẽ (±1) và tiến độ quay đầu (1 = xong). Quay đầu = soi gương ảnh: co cả ảnh lại rồi đổi dấu ở giữa
  // chừng, không bóp dẹt theo chiều ngang, nên không bao giờ thấy ảnh mỏng như lát cắt
  const shown = useRef(Math.sin(agent.heading) >= 0 ? 1 : -1);
  const turnT = useRef(1);
  const stride = useRef(phase * 2);

  useFrame((frame, rawDt) => {
    if (!active) return;
    const r = root.current;
    const f = flipG.current;
    const tg = tilt.current;
    if (!r || !f || !tg) return;
    const dt = Math.min(rawDt, 0.1);
    const a = agent;
    const time = frame.clock.elapsedTime + phase;
    const s = Math.sin(a.heading);
    if ((a.moving > 0.2 || a.motion === 'fly') && Math.abs(s) > 0.25) facing.current = s > 0 ? 1 : -1;
    // chạm: quay mặt về phía bé (giữ hướng hiện tại)
    if (facing.current !== shown.current && turnT.current >= 1) turnT.current = 0;
    let k = 1;
    if (turnT.current < 1) {
      turnT.current = Math.min(1, turnT.current + dt / FLIP_TIME);
      if (turnT.current >= 0.5) shown.current = facing.current;
      k = turnScale(turnT.current);
    }
    f.scale.set(shown.current * (headLeft ? -1 : 1) * k, k, k);

    const m = a.moving;
    stride.current += a.speed * dt * (grounded ? 9 : 6);
    const st = stride.current;
    const jp = reactJump(a);
    const jump = jp >= 0 ? Math.sin(jp * Math.PI) * (grounded ? 0.45 : 0.25) : 0;
    let sq = jp >= 0 ? 1 + Math.sin(jp * Math.PI * 2) * 0.08 : 1;

    const pos = geo.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    const style = look.style;
    for (let i = 0; i < arr.length; i += 3) {
      const x0 = base[i];
      const y0 = base[i + 1];
      const u = x0 / W + 0.5; // 0 = mép trái ảnh
      const t = headLeft ? u : 1 - u; // 0 ở đầu, 1 ở đuôi
      const v = grounded ? y0 / H : y0 / H + 0.5; // 0 = mép dưới
      let x = x0;
      let y = y0;
      let z = 0;
      switch (style) {
        case 'cetacean': {
          const w = t * t;
          y += Math.sin(time * 2.6 - t * 3.2) * H * 0.12 * w;
          z += Math.sin(time * 2.6 - t * 3.2 + 1) * W * 0.03 * w;
          break;
        }
        case 'fish': {
          const w = Math.max(0, t - 0.35) / 0.65;
          const wave = Math.sin(time * 9 - t * 4);
          z += wave * W * 0.18 * w * w;
          x += -Math.abs(wave) * W * 0.05 * w * w * (headLeft ? -1 : 1);
          y += wave * H * 0.04 * w;
          break;
        }
        case 'puffer': {
          const w = Math.max(0, t - 0.6) / 0.4;
          z += Math.sin(time * 7) * W * 0.12 * w * w;
          const k = 1 + Math.sin(time * 1.3) * 0.035;
          x *= k;
          y *= k;
          break;
        }
        case 'manta':
        case 'wings': {
          const d = Math.abs(u - 0.5) * 2;
          const fast = style === 'wings';
          const wave = Math.sin(time * (fast ? 9 : 2.1) - d * 1.4);
          z += wave * W * (fast ? 0.16 : 0.2) * d * d;
          y += wave * H * (fast ? 0.18 : 0.08) * d * d;
          break;
        }
        case 'buzz': {
          // cánh ong ở nửa trên ảnh: rung rất nhanh theo pháp tuyến, thân gần như yên
          const w = Math.max(0, v - 0.5) / 0.5;
          z += Math.sin(time * 47) * W * 0.16 * w * w;
          y += Math.sin(time * 47 + 1.2) * H * 0.04 * w;
          break;
        }
        case 'float': {
          // dập dềnh: phần dưới nước gần như yên, thân lắc nhẹ trước sau
          y += Math.sin(time * 1.6 + t * 2) * H * 0.02;
          break;
        }
        case 'hop': {
          // ếch: chân (nửa dưới) duỗi ra khi đang bay lên
          if (a.hop >= 0 && v < 0.5) y -= Math.sin(a.hop * Math.PI) * H * 0.18 * (0.5 - v) * 2;
          break;
        }
        case 'walk': {
          const LEG = 0.42;
          if (v < LEG) {
            const w = (LEG - v) / LEG;
            const front = t < 0.5 ? 0 : Math.PI;
            x += Math.sin(st + front) * W * 0.035 * w * m;
          }
          // gặm cỏ: đầu cúi xuống; đứng yên: thở
          if (t < 0.3 && v > 0.45 && a.mode === 'eat') y -= Math.max(0, Math.sin(time * 1.4)) ** 4 * H * 0.06 * ((0.3 - t) / 0.3);
          y *= 1 + Math.sin(time * 1.7) * 0.012 * (1 - m);
          break;
        }
      }
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;

    let bob: number;
    if (style === 'walk') bob = Math.abs(Math.sin(st)) * 0.035 * m;
    else if (style === 'hop') bob = a.hop >= 0 ? Math.sin(a.hop * Math.PI) * 0.25 : 0;
    else if (style === 'wings') bob = Math.sin(time * 9) * 0.03;
    // ong: bay lượn lắc lư (lên xuống chậm + rung nhẹ theo nhịp cánh)
    else if (style === 'buzz') bob = Math.sin(time * 3.2) * 0.1 + Math.sin(time * 23) * 0.015;
    else bob = Math.sin(time * 1.3) * 0.04;
    if (style === 'hop' && a.hop < 0) sq *= 1 - Math.max(0, Math.sin(time * 2)) * 0.03;

    r.position.set(a.x, a.y + (grounded ? 0 : a.halfH), a.z);
    tg.position.y = bob + jump;
    tg.scale.set(1 / Math.sqrt(sq), sq, 1);
    tg.rotation.x = style === 'manta' ? -0.55 : 0;
    tg.rotation.z =
      style === 'walk'
        ? Math.sin(st * 2) * 0.012 * m
        : style === 'float'
          ? Math.sin(time * 1.2) * 0.04
          : style === 'buzz'
            ? Math.sin(time * 2.7) * 0.2
            : a.pitch * facing.current * 0.25;
  });

  return (
    <group ref={root} position={[agent.x, agent.y, agent.z]}>
      <group ref={tilt}>
        <group ref={flipG}>
          <mesh geometry={geo} material={mat} />
        </group>
      </group>
      <HitBox def={def} agent={agent} w={W} h={H} centerY={grounded ? H / 2 : 0} onTap={onTap} />
    </group>
  );
}
