import { describe, it, expect } from 'vitest';
import { FILL_IDS } from './paint';
import {
  ART,
  BTN,
  CURRENT,
  GAP,
  PALETTE_SETS,
  PAPER,
  STAGE,
  SWAP_SLOT,
  SWATCH_SLOTS,
  gapBetween,
  inGateZone,
  paintButtons,
  setOf,
  type Rect,
} from './layout';

const box = (s: { left: number; top: number }): Rect => ({ ...s, width: BTN, height: BTN });

describe('bố cục màn tô', () => {
  it('mọi màu/công cụ nằm đúng một bộ, mỗi bộ vừa đủ ô (không cuộn)', () => {
    const all = PALETTE_SETS.flat();
    expect([...all].sort()).toEqual([...FILL_IDS].sort());
    expect(new Set(all).size).toBe(all.length);
    for (const s of PALETTE_SETS) expect(s.length).toBeLessThanOrEqual(SWATCH_SLOTS.length);
    expect(setOf('red')).toBe(0);
    expect(setOf('sparkle')).toBe(PALETTE_SETS.length - 1);
  });

  it('nút ≥120px, cách nhau ≥24px, nằm trọn trong khung', () => {
    const btns = paintButtons();
    for (const b of btns) {
      expect(b.width).toBeGreaterThanOrEqual(120);
      expect(b.left).toBeGreaterThanOrEqual(0);
      expect(b.top).toBeGreaterThanOrEqual(0);
      expect(b.left + b.width).toBeLessThanOrEqual(STAGE.w);
      expect(b.top + b.height).toBeLessThanOrEqual(STAGE.h);
    }
    for (let i = 0; i < btns.length; i++)
      for (let j = i + 1; j < btns.length; j++) expect(gapBetween(btns[i], btns[j]), `${i}/${j}`).toBeGreaterThanOrEqual(GAP);
  });

  it('không nút hay giấy nào trong dải 144px sát mép phải ở nửa trên (cổng bố mẹ)', () => {
    for (const b of paintButtons()) expect(inGateZone(b), JSON.stringify(b)).toBe(false);
    expect(inGateZone(PAPER)).toBe(false);
    expect(inGateZone({ left: 894, top: 12, width: 144, height: STAGE.h - 12 })).toBe(false); // khay gỗ cột trong
  });

  it('giấy và tranh không bị nút đè, tranh vẫn to và nằm trọn trong giấy', () => {
    for (const b of paintButtons()) expect(gapBetween(PAPER, b)).toBeGreaterThanOrEqual(GAP);
    expect(gapBetween(PAPER, CURRENT)).toBeGreaterThanOrEqual(GAP);
    expect(ART.size).toBeGreaterThanOrEqual(680);
    expect(ART.left).toBeGreaterThanOrEqual(PAPER.left);
    expect(ART.top).toBeGreaterThanOrEqual(PAPER.top);
    expect(ART.left + ART.size).toBeLessThanOrEqual(PAPER.left + PAPER.width);
    expect(ART.top + ART.size).toBeLessThanOrEqual(PAPER.top + PAPER.height);
  });

  it('nút đổi bộ màu ở góc dưới-phải, cạnh các ô màu', () => {
    expect(SWAP_SLOT.top).toBeGreaterThanOrEqual(STAGE.h / 2);
    expect(Math.min(...SWATCH_SLOTS.map((s) => gapBetween(box(s), box(SWAP_SLOT))))).toBe(GAP);
  });
});
