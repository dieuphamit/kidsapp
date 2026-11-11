import { describe, it, expect } from 'vitest';
import { newRound, drop, isDone } from './logic';
import { contentByKey } from '../../core/content';

describe('sort/logic', () => {
  describe('newRound', () => {
    it('với 2 giỏ tạo 4-6 quả, màu đỏ và vàng', () => {
      const state = newRound(2, 12345);
      expect(state.baskets.length).toBe(2);
      expect(state.baskets.map((b) => b.color).sort()).toEqual(['red', 'yellow']);
      expect(state.fruits.length).toBeGreaterThanOrEqual(4);
      expect(state.fruits.length).toBeLessThanOrEqual(6);
      for (const f of state.fruits) {
        expect(['red', 'yellow']).toContain(f.color);
      }
    });

    it('với 3 giỏ tạo 6 quả, màu đỏ, vàng, xanh lá', () => {
      const state = newRound(3, 12345);
      expect(state.baskets.length).toBe(3);
      expect(state.baskets.map((b) => b.color).sort()).toEqual(['green', 'red', 'yellow']);
      expect(state.fruits.length).toBe(6);
      for (const f of state.fruits) {
        expect(['red', 'yellow', 'green']).toContain(f.color);
      }
    });

    it('mỗi giỏ có ít nhất 2 quả cùng màu', () => {
      // Test với nhiều seed
      for (const seed of [111, 222, 333, 444, 555]) {
        const state2 = newRound(2, seed);
        const redCount2 = state2.fruits.filter((f) => f.color === 'red').length;
        const yellowCount2 = state2.fruits.filter((f) => f.color === 'yellow').length;
        expect(redCount2).toBeGreaterThanOrEqual(2);
        expect(yellowCount2).toBeGreaterThanOrEqual(2);

        const state3 = newRound(3, seed);
        const redCount3 = state3.fruits.filter((f) => f.color === 'red').length;
        const yellowCount3 = state3.fruits.filter((f) => f.color === 'yellow').length;
        const greenCount3 = state3.fruits.filter((f) => f.color === 'green').length;
        expect(redCount3).toBeGreaterThanOrEqual(2);
        expect(yellowCount3).toBeGreaterThanOrEqual(2);
        expect(greenCount3).toBeGreaterThanOrEqual(2);
      }
    });

    it('quả là các id hợp lệ', () => {
      const state = newRound(3, 999);
      const validRed = ['apple', 'cherries', 'strawberry'];
      const validYellow = ['banana', 'lemon', 'pineapple'];
      const validGreen = ['pear', 'watermelon'];
      for (const f of state.fruits) {
        if (f.color === 'red') expect(validRed).toContain(f.id);
        else if (f.color === 'yellow') expect(validYellow).toContain(f.id);
        else if (f.color === 'green') expect(validGreen).toContain(f.id);
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
      // Tìm quả đỏ
      const redIdx = state.fruits.findIndex((f) => f.color === 'red');
      const result = drop(state, redIdx, 'yellow');
      expect(result).toBe('wrong');
      expect(state.remaining).toContain(redIdx);
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

  it('fruit.<id> and fruit.<id>-color exist for all fruits used', () => {
    const content = contentByKey();
    const fruitIds = ['apple', 'cherries', 'strawberry', 'banana', 'lemon', 'pineapple', 'pear', 'watermelon'];
    for (const id of fruitIds) {
      expect(content.has(`fruit.${id}`), `missing fruit.${id}`).toBe(true);
      expect(content.has(`fruit.${id}-color`), `missing fruit.${id}-color`).toBe(true);
    }
  });
});
