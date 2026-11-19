import { describe, it, expect } from 'vitest';
import {
  SHEETS, sheetById, starPoints, heartPoints, perimeter, samplePerimeter, withMidpoints, numberDots,
  pathFromPoints, wavePath, zigzagPath, transformPath, circlePath, type Pt,
} from './printables';

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y);
const SQUARE: Pt[] = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];

describe('hình học bản in', () => {
  it('starPoints: 10 đỉnh xen kẽ bán kính ngoài/trong, đỉnh đầu ở trên cùng', () => {
    const pts = starPoints(100, 100, 80, 30);
    expect(pts).toHaveLength(10);
    expect(pts[0].x).toBeCloseTo(100);
    expect(pts[0].y).toBeCloseTo(20);
    pts.forEach((p, i) => expect(dist(p, { x: 100, y: 100 })).toBeCloseTo(i % 2 === 0 ? 80 : 30));
  });

  it('heartPoints: n điểm, đối xứng trái phải quanh tâm', () => {
    const pts = heartPoints(14, 100, 100, 84);
    expect(pts).toHaveLength(14);
    expect(pts[0].x).toBeCloseTo(100); // chỗ lõm trên giữa
    for (let i = 1; i < 7; i++) {
      expect(pts[i].x - 100).toBeCloseTo(100 - pts[14 - i].x);
      expect(pts[i].y).toBeCloseTo(pts[14 - i].y);
    }
  });

  it('perimeter và samplePerimeter: điểm cách đều theo chu vi', () => {
    expect(perimeter(SQUARE)).toBe(400);
    const pts = samplePerimeter(SQUARE, 8);
    expect(pts).toHaveLength(8);
    expect(pts[0]).toEqual({ x: 0, y: 0 });
    expect(pts[1]).toEqual({ x: 50, y: 0 });
    expect(pts[2]).toEqual({ x: 100, y: 0 });
    expect(pts[5]).toEqual({ x: 50, y: 100 });
    expect(pts[7]).toEqual({ x: 0, y: 50 });
  });

  it('withMidpoints: gấp đôi số điểm, giữ đỉnh', () => {
    const pts = withMidpoints(SQUARE);
    expect(pts).toHaveLength(8);
    expect(pts[0]).toEqual(SQUARE[0]);
    expect(pts[1]).toEqual({ x: 50, y: 0 });
    expect(pts[7]).toEqual({ x: 0, y: 50 });
  });

  it('numberDots: số 1..n, nhãn đặt ra ngoài hình', () => {
    const dots = numberDots(SQUARE, 10);
    expect(dots.map((d) => d.n)).toEqual([1, 2, 3, 4]);
    for (const d of dots) {
      expect(dist(d.label, { x: 50, y: 50 })).toBeGreaterThan(dist(d, { x: 50, y: 50 }));
      expect(dist(d.label, d)).toBeCloseTo(10, 0);
    }
  });

  it('path: đa giác, sóng, răng cưa, co giãn, vòng tròn', () => {
    expect(pathFromPoints(SQUARE)).toBe('M0 0 L100 0 L100 100 L0 100 Z');
    expect(pathFromPoints(SQUARE, false)).not.toMatch(/Z$/);
    expect(pathFromPoints([])).toBe('');
    const wave = wavePath(0, 50, 100, 10, 2);
    expect(wave.startsWith('M0 50')).toBe(true);
    expect(wave.endsWith('100 50')).toBe(true);
    expect(wave.match(/Q/g)).toHaveLength(4);
    const zz = zigzagPath(0, 50, 60, 20, 3);
    expect(zz).toBe('M0 60 L10 40 L20 60 L30 40 L40 60 L50 40 L60 60');
    expect(transformPath('M10 20 C0 0 10 10 20 20 Z', 0.5, 100, 200)).toBe('M105 210 C100 200 105 205 110 210 Z');
    expect(circlePath(50, 50, 10)).toBe('M40 50 A10 10 0 1 0 60 50 A10 10 0 1 0 40 50 Z');
  });
});

describe('bộ bản in', () => {
  it('có 6–12 tờ, id không trùng, đủ ba loại', () => {
    expect(SHEETS.length).toBeGreaterThanOrEqual(6);
    expect(SHEETS.length).toBeLessThanOrEqual(12);
    expect(new Set(SHEETS.map((s) => s.id)).size).toBe(SHEETS.length);
    for (const kind of ['color', 'dots', 'trace'] as const) expect(SHEETS.some((s) => s.kind === kind)).toBe(true);
    expect(sheetById('color-star')?.kind).toBe('color');
    expect(sheetById('nope')).toBeUndefined();
  });

  it('mọi nét và chấm nằm trong khung tờ (có lề cho số)', () => {
    for (const s of SHEETS) {
      expect(s.strokes.length, s.id).toBeGreaterThan(0);
      for (const st of s.strokes) {
        expect(st.d, s.id).toMatch(/^M/);
        expect(st.d, s.id).not.toMatch(/NaN|undefined/);
      }
      const nums = s.strokes.flatMap((st) => st.d.replace(/A[^A-Z]*?(?=[A-Z]|$)/g, '').match(/-?\d+(\.\d+)?/g) ?? []).map(Number);
      for (const n of nums) {
        expect(n, s.id).toBeGreaterThanOrEqual(0);
        expect(n, s.id).toBeLessThanOrEqual(Math.max(s.viewBox.w, s.viewBox.h));
      }
      for (const d of s.dots ?? []) {
        for (const p of [d, d.label]) {
          expect(p.x, s.id).toBeGreaterThanOrEqual(2);
          expect(p.x, s.id).toBeLessThanOrEqual(s.viewBox.w - 2);
          expect(p.y, s.id).toBeGreaterThanOrEqual(2);
          expect(p.y, s.id).toBeLessThanOrEqual(s.viewBox.h - 2);
        }
      }
    }
  });

  it('tờ nối số có 10–20 chấm đánh số liên tục, các chấm không chồng nhau', () => {
    for (const s of SHEETS.filter((x) => x.kind === 'dots')) {
      const dots = s.dots!;
      expect(dots.length, s.id).toBeGreaterThanOrEqual(10);
      expect(dots.length, s.id).toBeLessThanOrEqual(20);
      expect(dots.map((d) => d.n)).toEqual(dots.map((_, i) => i + 1));
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) expect(dist(dots[i], dots[j]), `${s.id} ${i}-${j}`).toBeGreaterThan(12);
      }
    }
  });

  it('tờ tô nét chỉ dùng nét đứt cho phần cần tô', () => {
    for (const s of SHEETS.filter((x) => x.kind === 'trace')) {
      expect(s.strokes.some((st) => st.dashed), s.id).toBe(true);
    }
    for (const s of SHEETS.filter((x) => x.kind !== 'trace')) {
      expect(s.strokes.some((st) => st.dashed), s.id).toBe(false);
    }
  });
});
