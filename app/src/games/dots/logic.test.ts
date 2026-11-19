import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ANIMALS,
  AREA,
  MIN_SPACING,
  animalOrder,
  dotAt,
  dotCountsForAge,
  isDone,
  makePuzzle,
  minSpacing,
  newState,
  outlineOf,
  pickDots,
  placeOutline,
  tapDot,
  isKey,
  soundKey,
} from './logic';
import { perimeter, type Pt } from './outline';

const APP = join(import.meta.dirname, '..', '..', '..');

describe('dữ liệu con vật', () => {
  it('mỗi con có ảnh thẻ, tiếng kêu thật, đường viền và câu "Là con ..." đủ vi/ja/en', () => {
    const content = JSON.parse(readFileSync(join(APP, 'src', 'content', 'dots.json'), 'utf8')) as {
      key: string;
      vi: string;
      ja: string;
      en: string;
    }[];
    for (const id of ANIMALS) {
      expect(existsSync(join(APP, 'public', 'cards', `${id}.png`)), id).toBe(true);
      expect(existsSync(join(APP, 'public', 'audio', 'sfx', `${soundKey(id).replace('animal.', 'animal-').replace('-sound', '')}.mp3`)), id).toBe(true);
      expect(outlineOf(id).pts.length).toBeGreaterThan(40);
      const line = content.find((c) => c.key === isKey(id));
      expect(line?.vi && line.ja && line.en, id).toBeTruthy();
    }
  });

  it('danh sách trong scripts/dots-outlines.mjs khớp ANIMALS', () => {
    const script = readFileSync(join(APP, 'scripts', 'dots-outlines.mjs'), 'utf8');
    const ids = JSON.parse(/const IDS = (\[.*\]);/.exec(script)![1].replace(/'/g, '"'));
    expect(ids).toEqual([...ANIMALS]);
  });
});

describe('số chấm theo tuổi', () => {
  it('<36 tháng 4–5 chấm, 36–47 tháng 6–8, ≥48 tháng 8–10 (ưu tiên 10)', () => {
    expect(dotCountsForAge(30)).toEqual([5, 4]);
    expect(dotCountsForAge(36)).toEqual([8, 7, 6]);
    expect(dotCountsForAge(47)[0]).toBe(8);
    expect(dotCountsForAge(48)[0]).toBe(10);
    expect(dotCountsForAge(72)[0]).toBe(10);
  });
});

describe('đặt chấm trên đường viền', () => {
  // Hình vuông 400×400 trong khung: chu vi 1600
  const square: Pt[] = [];
  for (let i = 0; i < 40; i++) square.push([100 + i * 10, 100]);
  for (let i = 0; i < 40; i++) square.push([500, 100 + i * 10]);
  for (let i = 0; i < 40; i++) square.push([500 - i * 10, 500]);
  for (let i = 0; i < 40; i++) square.push([100, 500 - i * 10]);

  it('n chấm cách đều theo chu vi, chấm 1 cao nhất, đi chiều kim đồng hồ', () => {
    expect(perimeter(square)).toBeCloseTo(1600);
    const { dots } = pickDots(square, 4);
    expect(dots).toHaveLength(4);
    // 4 chấm trên hình vuông: cách nhau 400 theo chu vi → mỗi cạnh một chấm (hoặc 4 góc)
    expect(minSpacing(dots)).toBeGreaterThanOrEqual(200);
    expect(dots[0][1]).toBe(Math.min(...dots.map((d) => d[1])));
    // chiều kim đồng hồ trên màn hình (y xuống): chấm 2 nằm bên phải hoặc dưới chấm 1
    expect(dots[1][0] >= dots[0][0] || dots[1][1] > dots[0][1]).toBe(true);
  });

  it('chọn điểm xuất phát làm hai chấm gần nhau nhất xa nhất có thể', () => {
    const { spacing } = pickDots(square, 8);
    // 8 chấm cách 200 theo chu vi trên hình vuông cạnh 400: tốt nhất là 200 (chấm ở góc và giữa cạnh)
    expect(spacing).toBeGreaterThanOrEqual(199);
  });

  it('con vật phóng to hết cỡ, nằm gọn trong vùng vẽ', () => {
    for (const id of ANIMALS) {
      const p = placeOutline(outlineOf(id));
      for (const [x, y] of p.poly) {
        expect(x).toBeGreaterThanOrEqual(AREA.x0 - 1);
        expect(x).toBeLessThanOrEqual(AREA.x1 + 1);
        expect(y).toBeGreaterThanOrEqual(AREA.y0 - 1);
        expect(y).toBeLessThanOrEqual(AREA.y1 + 1);
      }
      const xs = p.poly.map((q) => q[0]);
      const ys = p.poly.map((q) => q[1]);
      // chạm ít nhất một cặp mép vùng vẽ
      const fillsW = Math.max(...xs) - Math.min(...xs) > (AREA.x1 - AREA.x0) * 0.9;
      const fillsH = Math.max(...ys) - Math.min(...ys) > (AREA.y1 - AREA.y0) * 0.9;
      expect(fillsW || fillsH, id).toBe(true);
    }
  });

  it('mọi con, mọi tuổi: đủ số chấm mong muốn, vùng chạm 120 hở nhau ≥24, nằm trong khung, tránh nút Về nhà và cổng bố mẹ', () => {
    for (const age of [30, 40, 60]) {
      for (const id of ANIMALS) {
        const pz = makePuzzle(id, age);
        expect(pz.dots.length, `${id} ${age}`).toBe(dotCountsForAge(age)[0]);
        expect(minSpacing(pz.dots), `${id} ${age}`).toBeGreaterThanOrEqual(MIN_SPACING);
        for (const [x, y] of pz.dots) {
          expect(x - 60).toBeGreaterThanOrEqual(24 + 120 + 24); // nút Về nhà 24..144
          expect(x + 60).toBeLessThanOrEqual(1194 - 144);
          expect(y - 60).toBeGreaterThanOrEqual(0);
          expect(y + 60).toBeLessThanOrEqual(834);
        }
      }
    }
  });
});

describe('chạm chấm', () => {
  const pz = makePuzzle('elephant', 30);

  it('chỉ chấm kế tiếp mới nối; chấm sai hay chấm đã nối thì giữ nguyên', () => {
    let s = newState(pz);
    expect(tapDot(s, 1).ok).toBe(false);
    let r = tapDot(s, 0);
    expect(r.ok).toBe(true);
    s = r.state;
    expect(s.next).toBe(1);
    expect(tapDot(s, 0).ok).toBe(false);
    expect(tapDot(s, 3).state).toBe(s);
    for (let i = 1; i < pz.dots.length; i++) {
      r = tapDot(s, i);
      expect(r.ok).toBe(true);
      s = r.state;
    }
    expect(isDone(s)).toBe(true);
    expect(tapDot(s, 0).ok).toBe(false);
  });

  it('dotAt: điểm trong ô chạm 120×120 quanh tâm chấm', () => {
    const [x, y] = pz.dots[2];
    expect(dotAt(pz.dots, { x, y })).toBe(2);
    expect(dotAt(pz.dots, { x: x + 58, y: y - 58 })).toBe(2);
    expect(dotAt(pz.dots, { x: 10, y: 10 })).toBe(-1);
  });
});

describe('thứ tự con vật', () => {
  it('đủ mọi con, con gặp gần đây xếp cuối', () => {
    const order = animalOrder(Math.random, ['fish', 'pig']);
    expect([...order].sort()).toEqual([...ANIMALS].sort());
    expect(order.slice(-2).sort()).toEqual(['fish', 'pig']);
  });
});
