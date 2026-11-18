import { describe, it, expect } from 'vitest';
import { layoutMamas, nestBox, snuggleBox, mamaSize, BABY_SIZE, STAGE_W } from './layout';

const STAGE_H = 834;

describe('mama layout', () => {
  it('thú mẹ to hơn thú con rõ rệt, vùng chạm ≥120px', () => {
    for (const n of [2, 3, 4]) expect(mamaSize(n)).toBeGreaterThanOrEqual(BABY_SIZE * 1.3);
    expect(BABY_SIZE).toBeGreaterThanOrEqual(120);
  });

  it('các ô thú mẹ nằm trọn khung, cách nhau ≥24px, không chạm ổ của con', () => {
    const nest = nestBox();
    for (const n of [2, 3, 4]) {
      const slots = layoutMamas(n);
      expect(slots).toHaveLength(n);
      for (const s of slots) {
        expect(s.x).toBeGreaterThanOrEqual(0);
        expect(s.x + s.size).toBeLessThanOrEqual(STAGE_W);
        expect(s.y + s.size).toBeLessThanOrEqual(STAGE_H);
        // ổ con ở phía trên hàng mẹ
        expect(nest.y + nest.size + 24).toBeLessThanOrEqual(s.y + s.size * 0.25);
      }
      for (let i = 1; i < n; i++) {
        expect(slots[i].x - (slots[i - 1].x + slots[i - 1].size)).toBeGreaterThanOrEqual(24);
      }
    }
  });

  it('con rúc vào mẹ ở phía mẹ nhìn, nhỏ hơn mẹ, vẫn trong khung', () => {
    for (const n of [2, 3, 4]) {
      for (const s of layoutMamas(n)) {
        const left = snuggleBox(s, -1);
        const right = snuggleBox(s, 1);
        expect(left.size).toBeLessThan(s.size);
        expect(left.x + left.size / 2).toBeLessThan(s.x + s.size / 2);
        expect(right.x + right.size / 2).toBeGreaterThan(s.x + s.size / 2);
        for (const b of [left, right]) {
          expect(b.x).toBeGreaterThanOrEqual(0);
          expect(b.x + b.size).toBeLessThanOrEqual(STAGE_W);
          expect(b.y + b.size).toBeLessThanOrEqual(s.y + s.size);
        }
      }
    }
  });
});
