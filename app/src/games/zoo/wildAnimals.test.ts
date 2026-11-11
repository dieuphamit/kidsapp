import { describe, it, expect } from 'vitest';
import { pickSixAnimals, WILD_ANIMALS } from './wildAnimals';

describe('pickSixAnimals', () => {
  it('luôn trả về đúng 6 con', () => {
    for (let i = 0; i < 10; i++) {
      const result = pickSixAnimals();
      expect(result).toHaveLength(6);
    }
  });

  it('6 con luôn khác nhau (không trùng lặp)', () => {
    for (let i = 0; i < 10; i++) {
      const result = pickSixAnimals();
      const ids = result.map((a) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(6);
    }
  });

  it('tất cả 6 con đều nằm trong danh sách 12 con hoang', () => {
    const allIds = new Set(WILD_ANIMALS.map((a) => a.id));
    for (let i = 0; i < 10; i++) {
      const result = pickSixAnimals();
      for (const animal of result) {
        expect(allIds.has(animal.id)).toBe(true);
      }
    }
  });

  it('cùng seed cho cùng kết quả', () => {
    const seed = 42;
    const result1 = pickSixAnimals(seed);
    const result2 = pickSixAnimals(seed);
    expect(result1.map((a) => a.id)).toEqual(result2.map((a) => a.id));
  });

  it('seed khác cho kết quả khác (với xác suất cao)', () => {
    const result1 = pickSixAnimals(1);
    const result2 = pickSixAnimals(2);
    const ids1 = result1.map((a) => a.id).join(',');
    const ids2 = result2.map((a) => a.id).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('WILD_ANIMALS có đúng 12 con', () => {
    expect(WILD_ANIMALS).toHaveLength(12);
  });

  it('mỗi con trong WILD_ANIMALS có id và model', () => {
    for (const animal of WILD_ANIMALS) {
      expect(animal.id).toBeDefined();
      expect(animal.id.length).toBeGreaterThan(0);
      expect(animal.model).toBeDefined();
      expect(animal.model).toMatch(/\.glb$/);
    }
  });
});
