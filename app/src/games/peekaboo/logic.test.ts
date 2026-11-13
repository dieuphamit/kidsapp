import { describe, it, expect } from 'vitest';
import {
  bushCountForAge,
  newRound,
  tap,
  ALL_ANIMALS,
  FARM_ANIMALS,
  WILD_ANIMALS,
  NEW_ANIMALS,
  COVERS,
  animalsFor,
  coverOf,
  hintRoundsForAge,
  wiggleMsForAge,
  type AnimalId,
} from './logic';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { contentByKey } from '../../core/content';

describe('bushCountForAge', () => {
  it('trả về 3 bụi cho bé < 36 tháng', () => {
    expect(bushCountForAge(24)).toBe(3);
    expect(bushCountForAge(30)).toBe(3);
    expect(bushCountForAge(35)).toBe(3);
  });

  it('trả về 4 bụi cho bé 36-47 tháng', () => {
    expect(bushCountForAge(36)).toBe(4);
    expect(bushCountForAge(40)).toBe(4);
    expect(bushCountForAge(47)).toBe(4);
  });

  it('trả về 5 bụi cho bé >= 48 tháng', () => {
    expect(bushCountForAge(48)).toBe(5);
    expect(bushCountForAge(60)).toBe(5);
    expect(bushCountForAge(72)).toBe(5);
  });
});

describe('newRound', () => {
  it('tạo state với số bụi đúng', () => {
    const state = newRound(3, 12345);
    expect(state.bushCount).toBe(3);
    expect(state.hidingBush).toBeGreaterThanOrEqual(0);
    expect(state.hidingBush).toBeLessThan(3);
    expect(state.found).toBe(false);
  });

  it('chọn thú từ danh sách ALL_ANIMALS', () => {
    const state = newRound(4, 67890);
    expect(ALL_ANIMALS).toContain(state.animalId);
  });

  it('không chọn trùng thú với ván trước', () => {
    // Test nhiều lần với seed khác nhau
    for (let seed = 1; seed <= 100; seed++) {
      const prevId: AnimalId = 'cow';
      const state = newRound(3, seed, prevId);
      expect(state.animalId).not.toBe(prevId);
    }
  });

  it('deterministic với cùng seed', () => {
    const state1 = newRound(4, 42);
    const state2 = newRound(4, 42);
    expect(state1.animalId).toBe(state2.animalId);
    expect(state1.hidingBush).toBe(state2.hidingBush);
  });

  it('khác nhau với seed khác', () => {
    // Với số lượng đủ nhiều seed, ít nhất có 1 cặp khác nhau
    const results = new Set<string>();
    for (let seed = 1; seed <= 20; seed++) {
      const state = newRound(5, seed);
      results.add(`${state.animalId}-${state.hidingBush}`);
    }
    expect(results.size).toBeGreaterThan(1);
  });

  it('hidingBush nằm trong phạm vi bushCount', () => {
    for (let bushCount = 3; bushCount <= 5; bushCount++) {
      for (let seed = 1; seed <= 10; seed++) {
        const state = newRound(bushCount, seed);
        expect(state.hidingBush).toBeGreaterThanOrEqual(0);
        expect(state.hidingBush).toBeLessThan(bushCount);
      }
    }
  });
});

describe('tap', () => {
  it("trả về 'found' khi chạm đúng bụi", () => {
    const state = newRound(3, 12345);
    const result = tap(state, state.hidingBush);
    expect(result).toBe('found');
  });

  it("trả về 'empty' khi chạm sai bụi", () => {
    const state = newRound(3, 12345);
    const wrongBush = (state.hidingBush + 1) % state.bushCount;
    const result = tap(state, wrongBush);
    expect(result).toBe('empty');
  });

  it("trả về 'found' khi đã tìm thấy trước đó", () => {
    const state = { ...newRound(3, 12345), found: true };
    const wrongBush = (state.hidingBush + 1) % state.bushCount;
    const result = tap(state, wrongBush);
    expect(result).toBe('found');
  });
});

describe('animal lists', () => {
  it('FARM_ANIMALS có 8 con', () => {
    expect(FARM_ANIMALS).toHaveLength(8);
  });

  it('WILD_ANIMALS có 12 con', () => {
    expect(WILD_ANIMALS).toHaveLength(12);
  });

  it('ALL_ANIMALS = FARM + WILD + NEW', () => {
    expect(ALL_ANIMALS).toHaveLength(FARM_ANIMALS.length + WILD_ANIMALS.length + NEW_ANIMALS.length);
    for (const animal of NEW_ANIMALS) {
      expect(ALL_ANIMALS).toContain(animal);
    }
    for (const animal of FARM_ANIMALS) {
      expect(ALL_ANIMALS).toContain(animal);
    }
    for (const animal of WILD_ANIMALS) {
      expect(ALL_ANIMALS).toContain(animal);
    }
  });

  it('không có id trùng trong ALL_ANIMALS', () => {
    const unique = new Set(ALL_ANIMALS);
    expect(unique.size).toBe(ALL_ANIMALS.length);
  });
});

describe('chỗ núp và thú mới', () => {
  it('mỗi chỗ núp (bụi, mây, sóng) có ít nhất 3 bạn thú', () => {
    for (const c of COVERS) expect(animalsFor(c).length, c).toBeGreaterThanOrEqual(3);
  });

  it('chim/ong núp sau mây, thú biển núp sau sóng', () => {
    expect(coverOf('parrot')).toBe('cloud');
    expect(coverOf('bee')).toBe('cloud');
    expect(coverOf('whale')).toBe('wave');
    expect(coverOf('dolphin')).toBe('wave');
    expect(coverOf('zebra')).toBe('bush');
  });

  it('ván mới: thú hợp chỗ núp của ván, đủ cả 3 chỗ núp qua nhiều ván', () => {
    const covers = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const s = newRound(4, seed);
      expect(coverOf(s.animalId)).toBe(s.cover);
      covers.add(s.cover);
    }
    expect(covers.size).toBe(3);
  });

  it('mọi thú có ảnh thẻ, tên vi/ja/en và tiếng kêu thật', () => {
    const content = contentByKey();
    const pub = join(import.meta.dirname, '../../../public');
    for (const id of ALL_ANIMALS) {
      expect(existsSync(join(pub, 'cards', `${id}.png`)), `cards/${id}.png`).toBe(true);
      expect(existsSync(join(pub, 'audio', 'sfx', `animal-${id}.mp3`)), `sfx ${id}`).toBe(true);
      const item = content.get(`animal.${id}`);
      expect(item?.vi && item.ja && item.en, id).toBeTruthy();
    }
  });

  it('không lặp thú vừa chơi, với mọi thú', () => {
    for (const prev of ALL_ANIMALS) {
      for (let seed = 1; seed <= 30; seed++) expect(newRound(3, seed, prev).animalId).not.toBe(prev);
    }
  });
});

describe('độ khó: gợi ý', () => {
  it('bé nhỏ được ló tai gợi ý nhiều ván hơn', () => {
    expect(hintRoundsForAge(24)).toBe(3);
    expect(hintRoundsForAge(40)).toBe(2);
    expect(hintRoundsForAge(54)).toBe(1);
  });
  it('bé lớn: bụi có thú rung thưa hơn', () => {
    expect(wiggleMsForAge(30)).toBe(3000);
    expect(wiggleMsForAge(54)).toBe(5000);
  });
});
