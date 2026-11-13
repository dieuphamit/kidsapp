import { describe, it, expect } from 'vitest';
import {
  newRound,
  drop,
  isDone,
  modeForRound,
  roundSize,
  itemsForBin,
  HELLO_KEY,
  COLOR_BINS,
  FRUITS_BY_COLOR,
  SORT_MODES,
  type BinId,
} from './logic';
import { pictureSayKey } from '../../content/pictures';
import { contentByKey } from '../../core/content';

describe('sort/logic', () => {
  describe('newRound', () => {
    it('với 2 giỏ tạo 4-6 quả, 2 màu khác nhau, quả đúng màu giỏ', () => {
      const state = newRound(2, 12345);
      const colors = state.baskets.map((b) => b.color);
      expect(colors.length).toBe(2);
      expect(new Set(colors).size).toBe(2);
      for (const c of colors) expect(COLOR_BINS).toContain(c);
      expect(state.fruits.length).toBeGreaterThanOrEqual(4);
      expect(state.fruits.length).toBeLessThanOrEqual(6);
      for (const f of state.fruits) {
        expect(colors).toContain(f.color);
      }
    });

    it('với 3 giỏ tạo 6 quả, 3 màu khác nhau', () => {
      const state = newRound(3, 12345);
      const colors = state.baskets.map((b) => b.color);
      expect(new Set(colors).size).toBe(3);
      expect(state.fruits.length).toBe(6);
      for (const f of state.fruits) {
        expect(colors).toContain(f.color);
      }
    });

    it('màu giỏ đổi giữa các ván (có trên 2 bộ màu khác nhau)', () => {
      const sets = new Set<string>();
      for (let seed = 1; seed < 40; seed++) {
        sets.add(newRound(2, seed).baskets.map((b) => b.color).sort().join(','));
      }
      expect(sets.size).toBeGreaterThan(2);
    });

    it('mỗi giỏ có ít nhất 2 quả cùng màu', () => {
      // Test với nhiều seed
      for (const seed of [111, 222, 333, 444, 555]) {
        for (const n of [2, 3] as const) {
          for (const mode of SORT_MODES) {
            const state = newRound(n, seed, mode);
            for (const b of state.baskets) {
              const count = state.fruits.filter((f) => f.color === b.color).length;
              expect(count, `${mode} ${b.color}`).toBeGreaterThanOrEqual(2);
            }
          }
        }
      }
    });

    it('quả là các id hợp lệ', () => {
      for (const seed of [999, 1000, 1001]) {
        const state = newRound(3, seed);
        for (const f of state.fruits) {
          expect(FRUITS_BY_COLOR[f.color as keyof typeof FRUITS_BY_COLOR]).toContain(f.id);
        }
      }
    });

    it('remaining chứa tất cả indices ban đầu', () => {
      const state = newRound(2, 42);
      expect(state.remaining.length).toBe(state.fruits.length);
      expect(state.remaining.sort((a, b) => a - b)).toEqual(
        Array.from({ length: state.fruits.length }, (_, i) => i)
      );
    });

    it('ban đầu chưa done', () => {
      const state = newRound(2, 1);
      expect(state.done).toBe(false);
      expect(isDone(state)).toBe(false);
    });
  });

  describe('kiểu phân loại', () => {
    it('kinds: giỏ con vật và giỏ trái cây, hình đúng loại', () => {
      const state = newRound(2, 5, 'kinds', { itemCount: 8 });
      expect(state.baskets.map((b) => b.color)).toEqual(['animal', 'fruit']);
      expect(state.fruits).toHaveLength(8);
      for (const f of state.fruits) expect(itemsForBin(f.color)).toContain(f.id);
    });

    it('sizes: giỏ to và giỏ nhỏ, con vật to/nhỏ rõ ràng', () => {
      const state = newRound(2, 6, 'sizes', { itemCount: 6 });
      expect(state.baskets.map((b) => b.color)).toEqual(['big', 'small']);
      for (const f of state.fruits) expect(itemsForBin(f.color)).toContain(f.id);
      expect(itemsForBin('big').some((id) => itemsForBin('small').includes(id))).toBe(false);
    });

    it('ưu tiên không lặp hình của ván trước', () => {
      const first = newRound(2, 7, 'kinds', { itemCount: 6 });
      const avoid = first.fruits.map((f) => f.id);
      const second = newRound(2, 8, 'kinds', { itemCount: 6, avoid });
      for (const f of second.fruits) expect(avoid).not.toContain(f.id);
    });

    it('chủ đề cố định giữ kiểu; trộn thì đổi kiểu, không lặp kiểu ván trước', () => {
      expect(modeForRound('colors', 54, 'colors')).toBe('colors');
      expect(modeForRound('sizes', 24)).toBe('sizes');
      for (let i = 0; i < 30; i++) {
        const m = modeForRound('mix', 54, 'kinds');
        expect(m).not.toBe('kinds');
      }
      const young = new Set<string>();
      for (let i = 0; i < 40; i++) young.add(modeForRound('mix', 24));
      expect(young.has('sizes')).toBe(false);
      expect(young.size).toBe(2);
    });

    it('độ khó: số giỏ/số hình tăng theo tuổi', () => {
      expect(roundSize('colors', 24)).toEqual({ basketCount: 2 });
      expect(roundSize('colors', 36)).toEqual({ basketCount: 3 });
      expect(roundSize('colors', 54)).toEqual({ basketCount: 3, itemCount: 8 });
      expect(roundSize('kinds', 24).itemCount).toBe(4);
      expect(roundSize('sizes', 54).itemCount).toBe(8);
    });
  });

  describe('drop', () => {
    it('drop đúng màu trả về ok và xóa khỏi remaining', () => {
      const state = newRound(2, 100);
      const fruitIdx = 0;
      const fruit = state.fruits[fruitIdx];
      const result = drop(state, fruitIdx, fruit.color);
      expect(result).toBe('ok');
      expect(state.remaining).not.toContain(fruitIdx);
    });

    it('drop sai màu trả về wrong và không xóa', () => {
      const state = newRound(2, 200);
      const fruit = state.fruits[0];
      const other = state.baskets.find((b) => b.color !== fruit.color)!.color;
      const result = drop(state, 0, other);
      expect(result).toBe('wrong');
      expect(state.remaining).toContain(0);
    });

    it('drop index không hợp lệ trả về wrong', () => {
      const state = newRound(2, 300);
      expect(drop(state, 999, 'red')).toBe('wrong');
    });
  });

  describe('isDone', () => {
    it('sau khi thả hết quả đúng thì isDone = true', () => {
      const state = newRound(2, 400);
      expect(isDone(state)).toBe(false);

      // Thả tất cả quả vào đúng giỏ
      for (const idx of [...state.remaining]) {
        const fruit = state.fruits[idx];
        drop(state, idx, fruit.color);
      }

      expect(isDone(state)).toBe(true);
      expect(state.done).toBe(true);
    });
  });
});

describe('sort content keys exist', () => {
  it('sort.hello, sort.done exist in content', () => {
    const content = contentByKey();
    expect(content.has('sort.hello')).toBe(true);
    expect(content.has('sort.done')).toBe(true);
  });

  it('câu chào từng kiểu và sort.big/sort.small có đủ vi/ja/en', () => {
    const content = contentByKey();
    for (const key of [...Object.values(HELLO_KEY), 'sort.big', 'sort.small']) {
      const item = content.get(key);
      expect(item, key).toBeTruthy();
      expect(item!.vi && item!.ja && item!.en, key).toBeTruthy();
    }
  });

  it('mọi hình trong mọi giỏ có câu đọc tên', () => {
    const content = contentByKey();
    const bins: BinId[] = [...COLOR_BINS, 'animal', 'fruit', 'big', 'small'];
    for (const b of bins) {
      for (const id of itemsForBin(b)) expect(content.has(pictureSayKey(id)), id).toBe(true);
    }
  });

  it('fruit.<id> and fruit.<id>-color exist for all fruits used', () => {
    const content = contentByKey();
    const fruitIds = Object.values(FRUITS_BY_COLOR).flat();
    for (const id of fruitIds) {
      expect(content.has(`fruit.${id}`), `missing fruit.${id}`).toBe(true);
      expect(content.has(`fruit.${id}-color`), `missing fruit.${id}-color`).toBe(true);
    }
  });
});
