import { describe, it, expect } from 'vitest';
import { chainLayout, choiceCenter, BEAD, CHOICE, STAGE_W, STAGE_H } from './layout';

describe('chainLayout', () => {
  for (const count of [6, 7]) {
    it(`${count} hạt nằm gọn trong khung, không chồng nhau, không đè nút Về nhà`, () => {
      const { beads } = chainLayout(count);
      expect(beads.length).toBe(count);
      for (const b of beads) {
        expect(b.x - BEAD / 2).toBeGreaterThanOrEqual(24);
        expect(b.x + BEAD / 2).toBeLessThanOrEqual(STAGE_W - 24);
        // dưới nút Về nhà (24 + 120)
        expect(b.y - BEAD / 2).toBeGreaterThanOrEqual(144);
      }
      for (let i = 1; i < count; i++) expect(beads[i].x - beads[i - 1].x).toBeGreaterThanOrEqual(BEAD);
    });
  }

  it('dây võng xuống ở giữa', () => {
    const { beads } = chainLayout(7);
    expect(beads[3].y).toBeGreaterThan(beads[0].y);
    expect(beads[0].y).toBeCloseTo(beads[6].y);
  });
});

describe('choiceCenter', () => {
  it('3 nút cách nhau ≥24px, nằm dưới chuỗi hạt', () => {
    const c = [0, 1, 2].map((k) => choiceCenter(k));
    expect(c[1].x - c[0].x - CHOICE).toBeGreaterThanOrEqual(24);
    const lowest = Math.max(...chainLayout(7).beads.map((b) => b.y + BEAD / 2));
    expect(c[0].y - CHOICE / 2).toBeGreaterThan(lowest + 24);
    expect(c[0].y + CHOICE / 2).toBeLessThanOrEqual(STAGE_H - 24);
  });
});
