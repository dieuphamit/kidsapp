import { describe, it, expect } from 'vitest';
import { BUDDY_LOOKS, buddyParts, estimateTriangles, partColors, type BuddyLook, type Part } from './buddyModel';
import { BUDDY_CHARACTERS, BUDDY_CHEEK, BUDDY_HEX, BUDDY_INK } from '../core/tokens';

const byTag = (parts: Part[], tag: string) =>
  parts.filter((p): p is Extract<Part, { kind: 'group' }> => p.kind === 'group' && p.tag === tag);

describe('buddyModel', () => {
  it('mỗi nhân vật khác nhau ở tai, đuôi, mõm và màu lông', () => {
    const looks = BUDDY_CHARACTERS.map((c) => BUDDY_LOOKS[c]);
    for (const k of ['ears', 'tail', 'muzzle'] as const) expect(new Set(looks.map((l) => l[k])).size, k).toBe(4);
    expect(new Set(looks.map((l) => l.palette.fur)).size).toBe(4);
  });

  it('khung chung: đầu, thân, 2 mắt, 2 tai, đuôi, mõm, tay vẫy được', () => {
    for (const c of BUDDY_CHARACTERS) {
      const parts = buddyParts(BUDDY_LOOKS[c]);
      expect(byTag(parts, 'eye'), c).toHaveLength(2);
      expect(byTag(parts, 'ear'), c).toHaveLength(2);
      expect(byTag(parts, 'tail'), c).toHaveLength(1);
      expect(byTag(parts, 'muzzle'), c).toHaveLength(1);
      expect(byTag(parts, 'arm')[0]?.role, c).toBe('wave');
      // đầu to chibi màu lông của con đó
      expect(parts.some((p) => p.kind === 'ball' && p.r === 0.88 && p.color === BUDDY_HEX[c].fur), c).toBe(true);
    }
  });

  it('nhận tham số: đổi kiểu tai/màu lông thì hình khối đổi theo', () => {
    const custom: BuddyLook = { ...BUDDY_LOOKS.cat, ears: 'long', palette: BUDDY_HEX.bear };
    const parts = buddyParts(custom);
    const ear = byTag(parts, 'ear')[0];
    expect(ear.children.every((p) => p.kind === 'ball')).toBe(true); // tai thỏ là khối cầu dài, không phải nón
    expect(parts.some((p) => p.kind === 'ball' && p.color === BUDDY_HEX.bear.fur)).toBe(true);
    expect(partColors(parts).has(BUDDY_HEX.cat.fur)).toBe(false);
    // tai mèo là nón, cún có đuôi ngoe nguẩy
    expect(byTag(buddyParts(BUDDY_LOOKS.cat), 'ear')[0].children[0].kind).toBe('cone');
    expect(byTag(buddyParts(BUDDY_LOOKS.dog), 'tail')[0].role).toBe('wag');
  });

  it('chỉ dùng màu token (luật 7) và ≤ 50k tam giác', () => {
    for (const c of BUDDY_CHARACTERS) {
      const parts = buddyParts(BUDDY_LOOKS[c]);
      const allowed = new Set([...Object.values(BUDDY_HEX[c]), BUDDY_INK, BUDDY_CHEEK]);
      for (const color of partColors(parts)) expect(allowed.has(color), `${c}: ${color}`).toBe(true);
      expect(estimateTriangles(parts), c).toBeLessThanOrEqual(50_000);
    }
  });
});
