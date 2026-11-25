import { describe, it, expect } from 'vitest';
import { FRAME_SIZE, PIECE_MIN_SIZE, STAGE_H, STAGE_W, initialTrayPositions, pieceDimensions } from './layout';

type R = { x: number; y: number; w: number; h: number };
const overlap = (a: R, b: R, gap = 0) => a.x < b.x + b.w + gap && b.x < a.x + a.w + gap && a.y < b.y + b.h + gap && b.y < a.y + a.h + gap;
const BACK: R = { x: 24, y: 24, w: 120, h: 120 };
const FRAME: R = { x: (STAGE_W - FRAME_SIZE) / 2, y: (STAGE_H - FRAME_SIZE) / 2, w: FRAME_SIZE, h: FRAME_SIZE };

describe('Ghép hình: chỗ mảnh lúc đầu', () => {
  it('2, 3, 4 mảnh: trong khung, không đè nút về nhà, không vào dải 144px mép phải, không chạm khung ghép, cách nhau ≥24px', () => {
    for (const n of [2, 3, 4] as const) {
      const d = pieceDimensions(n);
      const w = Math.max(d.w, PIECE_MIN_SIZE);
      const h = Math.max(d.h, PIECE_MIN_SIZE);
      const rects = initialTrayPositions(n).map((p) => ({ x: p.x - w / 2, y: p.y - h / 2, w, h }));
      expect(rects).toHaveLength(n);
      rects.forEach((r, i) => {
        expect(r.x, `${n}/${i}`).toBeGreaterThanOrEqual(0);
        expect(r.y).toBeGreaterThanOrEqual(0);
        expect(r.y + r.h).toBeLessThanOrEqual(STAGE_H);
        expect(r.x + r.w, `${n}/${i} mép phải`).toBeLessThanOrEqual(STAGE_W - 144);
        expect(overlap(r, BACK, 24), `${n}/${i} nút về nhà`).toBe(false);
        expect(overlap(r, FRAME, 24), `${n}/${i} khung ghép`).toBe(false);
        rects.slice(i + 1).forEach((o) => expect(overlap(r, o, 24)).toBe(false));
      });
    }
  });
});
