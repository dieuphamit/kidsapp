import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
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

  it('mỗi con có tiếng kêu thật sfx/animal-<id>.mp3 (say animal.<id>-sound phát file này)', () => {
    const sfxDir = join(import.meta.dirname, '../../../public/audio/sfx');
    for (const animal of WILD_ANIMALS) {
      expect(existsSync(join(sfxDir, `animal-${animal.id}.mp3`)), `Thiếu sfx/animal-${animal.id}.mp3`).toBe(true);
    }
  });
});

describe('placeZooAnimals', () => {
  it('3 con đi dạo ở 3 dải khác độ sâu (không chồng nhau), cá không đi dạo, con cao đi dải sau', async () => {
    const { placeZooAnimals } = await import('./wildAnimals');
    for (let seed = 1; seed < 60; seed++) {
      const placed = placeZooAnimals(pickSixAnimals(seed));
      expect(placed).toHaveLength(6);
      const walkers = placed.filter((p) => p.area);
      expect(walkers).toHaveLength(3);
      expect(new Set(walkers.map((p) => p.pos[2])).size).toBe(3);
      // dải sau nằm hẳn sau dải giữa, dải giữa nằm hẳn sau dải trước; vị trí đầu nằm trong dải của mình
      for (let i = 0; i < 3; i++) {
        const a = walkers[i].area!;
        expect(walkers[i].pos[2]).toBeGreaterThanOrEqual(a.zMin);
        expect(walkers[i].pos[2]).toBeLessThanOrEqual(a.zMax);
        if (i > 0) expect(a.zMin).toBeGreaterThan(walkers[i - 1].area!.zMax);
      }
      // con đứng yên không có vùng đi dạo
      expect(placed.filter((p) => !p.area)).toHaveLength(3);
      expect(walkers.some((p) => p.data.id === 'fish')).toBe(false);
      const h = walkers.map((p) => p.data.height ?? 1.2);
      expect(h[0]).toBeGreaterThanOrEqual(h[1]);
      expect(h[1]).toBeGreaterThanOrEqual(h[2]);
    }
  });
});

describe('zooDef', () => {
  it('cáo dùng model cử động thật (có clip), các con khác là model tĩnh với dáng giả', async () => {
    const { zooDef } = await import('./wildAnimals');
    for (const a of WILD_ANIMALS) {
      const d = zooDef(a);
      expect(d.id).toBe(a.id);
      expect(d.height).toBe(a.height ?? 1.2);
      if (a.id === 'fox') {
        expect(d.model).toBe('world/fox.glb');
        expect(d.clips).toContain('Walk');
      } else expect(d.clips).toHaveLength(0);
      expect(existsSync(join(import.meta.dirname, '../../../public/models', d.model)), d.model).toBe(true);
    }
  });
});
