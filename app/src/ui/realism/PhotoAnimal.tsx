import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { DoubleSide, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace, type BufferAttribute, type Group } from 'three';
import { reactJump, startReact, type Agent } from '../../core/steer';
import type { WorldAnimal } from '../../core/worldAnimals';
import photoMeta from './photoMeta.json';

/**
 * Phương án B "ảnh thật 2.5D": ảnh chụp thật đã tách nền dán lên một tấm phẳng chia lưới, đứng trong cảnh 3D.
 * Chuyển động bằng biến dạng đỉnh trên CPU mỗi khung hình (vài trăm đỉnh):
 * - cá voi, cá heo: thân uốn sóng lên xuống mạnh dần về đuôi (đúng kiểu bơi của cá voi/cá heo);
 * - cá hề, cá nóc: đuôi vẫy nhanh, thân hơi uốn;
 * - cá đuối: hai cánh vỗ (đầu cánh lệch theo pháp tuyến tấm ảnh), tấm ảnh hơi ngả ra sau như đang lướt;
 * - thú bốn chân: chân trước/sau đung đưa ngược pha (cắt lớp đỉnh phần dưới), thân nhún theo bước.
 * Đổi hướng đi: tấm ảnh lật (scale.x qua 0) mượt trong ~0.3s.
 */

type Meta = { w: number; h: number; face: 'left' | 'right' };
const META = photoMeta as Record<string, Meta>;

type Style = 'cetacean' | 'fish' | 'puffer' | 'manta' | 'walk';
/** h: chiều cao tấm ảnh (đơn vị 3D); w: hoặc chiều ngang (cho con dài) */
const LOOK: Record<string, { style: Style; h?: number; w?: number }> = {
  whale: { style: 'cetacean', w: 2.3 },
  dolphin: { style: 'cetacean', w: 1.55 },
  clownfish: { style: 'fish', w: 0.75 },
  puffer: { style: 'puffer', w: 0.8 },
  manta: { style: 'manta', w: 1.35 },
  horse: { style: 'walk', h: 1.25 },
  cow: { style: 'walk', h: 1.05 },
  zebra: { style: 'walk', h: 1.2 },
  deer: { style: 'walk', h: 1.15 },
  fox: { style: 'walk', h: 0.6 },
};

const MIN_HIT = 1.3;
const SEG_X = 28;
const SEG_Y = 10;

export function PhotoAnimal({ def, agent, phase = 0, onTap }: { def: WorldAnimal; agent: Agent; phase?: number; onTap?: (id: string, agent: Agent) => void }) {
  const meta = META[def.id];
  const look = LOOK[def.id];
  const tex = useTexture(`${import.meta.env.BASE_URL}demo-realism/photos/${def.id}.png`);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  const aspect = meta.w / meta.h;
  const H = look.h ?? (look.w ?? 1) / aspect;
  const W = look.w ?? H * aspect;
  const swimmer = look.style !== 'walk';

  const { geo, base } = useMemo(() => {
    const g = new PlaneGeometry(W, H, SEG_X, SEG_Y);
    // thú đi: đáy ảnh (chân) chạm đất ở y = 0; con bơi: tâm ảnh ở giữa thân
    g.translate(0, swimmer ? 0 : H / 2, 0);
    return { geo: g, base: Float32Array.from(g.attributes.position.array) };
  }, [W, H, swimmer]);
  const mat = useMemo(() => new MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.04, side: DoubleSide, depthWrite: true }), [tex]);
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  const root = useRef<Group>(null);
  const flipG = useRef<Group>(null);
  const tilt = useRef<Group>(null);
  // +1: quay mặt sang phải (x tăng). Bắt đầu theo hướng ngẫu nhiên của agent
  const facing = useRef(Math.sin(agent.heading) >= 0 ? 1 : -1);
  const flip = useRef(Math.sin(agent.heading) >= 0 ? 1 : -1);
  const stride = useRef(phase * 2);

  useFrame((frame, rawDt) => {
    const r = root.current;
    const f = flipG.current;
    const tg = tilt.current;
    if (!r || !f || !tg) return;
    const dt = Math.min(rawDt, 0.1);
    const a = agent;
    const time = frame.clock.elapsedTime + phase;
    const s = Math.sin(a.heading);
    if (a.moving > 0.2 && Math.abs(s) > 0.25) facing.current = s > 0 ? 1 : -1;
    flip.current += (facing.current - flip.current) * Math.min(1, dt * 7);
    const imgSign = meta.face === 'right' ? 1 : -1;
    f.scale.x = flip.current * imgSign;

    const m = a.moving;
    stride.current += a.speed * dt * (swimmer ? 6 : 9);
    const st = stride.current;
    // phản ứng khi chạm: nhảy lên + nén/giãn
    const jp = reactJump(a);
    const jump = jp >= 0 ? Math.sin(jp * Math.PI) * (swimmer ? 0.25 : 0.45) : 0;
    const sq = jp >= 0 ? 1 + Math.sin(jp * Math.PI * 2) * 0.08 : 1;

    const pos = geo.attributes.position as BufferAttribute;
    const arr = pos.array as Float32Array;
    let bob = 0;
    for (let i = 0; i < arr.length; i += 3) {
      const x0 = base[i];
      const y0 = base[i + 1];
      const u = x0 / W + 0.5; // 0 = mép trái ảnh
      // t: 0 ở đầu, 1 ở đuôi (theo hướng đầu trong ảnh gốc)
      const t = meta.face === 'left' ? u : 1 - u;
      let x = x0;
      let y = y0;
      let z = 0;
      switch (look.style) {
        case 'cetacean': {
          const w = t * t;
          y += Math.sin(time * 2.6 - t * 3.2) * H * 0.12 * w;
          z += Math.sin(time * 2.6 - t * 3.2 + 1) * W * 0.03 * w;
          break;
        }
        case 'fish': {
          const w = Math.max(0, t - 0.35) / 0.65;
          z += Math.sin(time * 9 - t * 4) * W * 0.18 * w * w;
          x += -Math.abs(Math.sin(time * 9 - t * 4)) * W * 0.05 * w * w * (meta.face === 'left' ? -1 : 1);
          y += Math.sin(time * 9 - t * 4) * H * 0.04 * w;
          break;
        }
        case 'puffer': {
          const w = Math.max(0, t - 0.6) / 0.4;
          z += Math.sin(time * 7) * W * 0.12 * w * w;
          // phồng xẹp nhẹ (thở)
          const k = 1 + Math.sin(time * 1.3) * 0.035;
          x *= k;
          y *= k;
          break;
        }
        case 'manta': {
          const d = Math.abs(u - 0.5) * 2;
          const wave = Math.sin(time * 2.1 - d * 1.4);
          z += wave * W * 0.2 * d * d;
          y += wave * H * 0.08 * d * d;
          break;
        }
        case 'walk': {
          const v = y0 / H; // 0 = chân
          const LEG = 0.42;
          if (v < LEG) {
            const w = (LEG - v) / LEG;
            const front = t < 0.5 ? 0 : Math.PI;
            x += Math.sin(st + front) * W * 0.035 * w * m;
          }
          // đứng yên: thở; đầu hơi gật khi gặm cỏ
          if (t < 0.3 && v > 0.45 && a.mode === 'eat') y -= Math.max(0, Math.sin(time * 1.4)) ** 4 * H * 0.06 * (0.3 - t) / 0.3;
          y *= 1 + Math.sin(time * 1.7) * 0.012 * (1 - m);
          break;
        }
      }
      arr[i] = x;
      arr[i + 1] = y;
      arr[i + 2] = z;
    }
    pos.needsUpdate = true;
    if (look.style === 'walk') bob = Math.abs(Math.sin(st)) * 0.035 * m;
    else bob = Math.sin(time * 1.3) * 0.04;

    r.position.set(a.x, a.y + (swimmer ? a.halfH : 0), a.z);
    tg.position.y = bob + jump;
    tg.scale.set(1 / Math.sqrt(sq), sq, 1);
    // cá đuối ngả ra sau như đang lướt; thú đi lắc thân nhẹ theo bước
    tg.rotation.x = look.style === 'manta' ? -0.55 : 0;
    tg.rotation.z = look.style === 'walk' ? Math.sin(st * 2) * 0.012 * m : a.pitch * facing.current * 0.25;
  });

  const hitW = Math.max(MIN_HIT, W);
  const hitH = Math.max(MIN_HIT, H);
  return (
    <group ref={root} position={[agent.x, agent.y, agent.z]}>
      <group ref={tilt}>
        <group ref={flipG}>
          <mesh geometry={geo} material={mat} />
        </group>
      </group>
      <mesh
        position={[0, swimmer ? 0 : H / 2, 0]}
        onPointerDown={(e) => {
          e.stopPropagation();
          startReact(agent);
          onTap?.(def.id, agent);
        }}
      >
        <boxGeometry args={[hitW, hitH, 0.6]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
