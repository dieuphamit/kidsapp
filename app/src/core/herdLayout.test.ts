import { describe, it, expect } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { bodyRadius, createHabitatHerd, type HerdMember } from './herd';
import { stepAgents } from './steer';
import { HABITAT_IDS, HABITATS, type Habitat } from './worldAnimals';

/**
 * Bố cục thật trên màn hình: dựng camera của từng khu (khung iPad 1194×834), mô phỏng đàn thú rồi chiếu khung bao
 * thân từng con lên khung hình. Con nào cũng phải nằm trọn trong khung, không nằm dưới nút, và không che con khác.
 */
const W = 1194;
const H = 834;
type Rect = { x0: number; y0: number; x1: number; y1: number };
/** nút mũi tên trái/phải, nút về nhà, cổng phụ huynh, hàng chấm (Game.tsx, world.module.css) */
const ARROWS: Rect[] = [
  { x0: 24, y0: 357, x1: 144, y1: 477 },
  { x0: W - 144, y0: 357, x1: W - 24, y1: 477 },
];
const CORNERS: Rect[] = [
  { x0: 24, y0: 24, x1: 144, y1: 144 },
  { x0: W - 120, y0: 0, x1: W, y1: 120 },
];

function camera(h: Habitat): PerspectiveCamera {
  const v = HABITATS[h].view;
  const cam = new PerspectiveCamera(v.fov, W / H, 0.1, 100);
  cam.position.set(...v.position);
  cam.lookAt(new Vector3(...v.target));
  cam.updateMatrixWorld(true);
  return cam;
}

/** Khung bao thân trên màn hình (px): bóng thân (chiều dài × chiều cao) ở độ sâu của con vật */
function screenRect(cam: PerspectiveCamera, m: HerdMember): Rect {
  const a = m.agent;
  const hx = m.def.len * m.def.height * 0.5;
  const r: Rect = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  const v = new Vector3();
  for (const sx of [-1, 1])
    for (const sy of [0, 1])
      {
        v.set(a.x + sx * hx, a.y + sy * m.def.height, a.z).project(cam);
        const px = ((v.x + 1) / 2) * W;
        const py = ((1 - v.y) / 2) * H;
        r.x0 = Math.min(r.x0, px);
        r.x1 = Math.max(r.x1, px);
        r.y0 = Math.min(r.y0, py);
        r.y1 = Math.max(r.y1, py);
      }
  return r;
}

const area = (r: Rect) => Math.max(0, r.x1 - r.x0) * Math.max(0, r.y1 - r.y0);
function inter(a: Rect, b: Rect): number {
  return area({ x0: Math.max(a.x0, b.x0), y0: Math.max(a.y0, b.y0), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
}
const inside = (x: number, y: number, r: Rect) => x > r.x0 && x < r.x1 && y > r.y0 && y < r.y1;
/**
 * Hai thân (elip nội tiếp khung bao trên màn hình) cách nhau bao xa: 1 = vừa chạm, < 1 là chồng lên nhau.
 * Khung bao là hộp thô gồm cả khoảng trống quanh đầu, đuôi, chân nên so elip mới đúng là thân che nhau.
 */
function gap(a: Rect, b: Rect): number {
  const dx = (a.x0 + a.x1 - b.x0 - b.x1) / 2;
  const dy = (a.y0 + a.y1 - b.y0 - b.y1) / 2;
  return Math.hypot(dx / ((a.x1 - a.x0 + b.x1 - b.x0) / 2), dy / ((a.y1 - a.y0 + b.y1 - b.y0) / 2));
}
/** chồng thân ít hơn mức này (đầu đuôi chạm nhẹ) vẫn coi là không che nhau */
const MIN_GAP = 0.85;

describe('bố cục 5 khu trên khung hình iPad', () => {
  for (const h of HABITAT_IDS) {
    it(`${h}: mọi con nằm trong khung, không dưới nút, không che nhau`, () => {
      const cam = camera(h);
      let worst = Infinity;
      let worstPair = '';
      let overlapSamples = 0;
      let samples = 0;
      for (const seed of [7, 20, 33, 46, 59]) {
        const herd = createHabitatHerd(h, seed);
        for (let t = 0; t <= 60 * 30; t++) {
          if (t > 0) stepAgents(herd.agents, 1 / 30);
          if (t % 15) continue;
          const rects = herd.members.map((m) => screenRect(cam, m));
          samples++;
          let bad = false;
          rects.forEach((r, i) => {
            const id = `${herd.members[i].key} @${seed}/${t}`;
            // trọn thân trong khung hình (cho phép lệch 6px do khung bao thô)
            expect(r.x0, id).toBeGreaterThan(-6);
            expect(r.x1, id).toBeLessThan(W + 6);
            expect(r.y0, id).toBeGreaterThan(-6);
            expect(r.y1, id).toBeLessThan(H + 6);
            const cx = (r.x0 + r.x1) / 2;
            const cy = (r.y0 + r.y1) / 2;
            for (const b of ARROWS) expect(inside(cx, cy, b), `${id} dưới nút mũi tên`).toBe(false);
            for (const b of CORNERS) expect(inter(r, b) / area(r), `${id} dưới nút góc`).toBeLessThan(0.15);
            for (let j = i + 1; j < rects.length; j++) {
              const g = gap(r, rects[j]);
              if (g < worst) {
                worst = g;
                worstPair = `${herd.members[i].key}/${herd.members[j].key} @${seed}/${t}`;
              }
              if (g < MIN_GAP) bad = true;
            }
          });
          if (bad) overlapSamples++;
        }
      }
      // cho phép thoáng qua (≤ 3% số lần chụp) lúc hai con vừa lướt qua nhau
      expect(overlapSamples / samples, `${h}: tệ nhất ${worst.toFixed(2)} ${worstPair}`).toBeLessThanOrEqual(0.03);
    });
  }

  it('bán kính đẩy nhau theo kích thước thân: con lớn bán kính lớn', () => {
    const sea = createHabitatHerd('sea', 1).members;
    const r = (id: string) => bodyRadius(sea.find((m) => m.def.id === id)!.def);
    expect(r('whale')).toBeGreaterThan(r('dolphin'));
    expect(r('dolphin')).toBeGreaterThan(r('clownfish'));
  });
});
