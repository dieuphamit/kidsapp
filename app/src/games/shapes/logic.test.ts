import { describe, it, expect } from 'vitest';
import {
  SHAPES, ALL_SHAPES, SIMILAR_PAIRS, dealColors, markTapped, allTapped, SLOTS, dropResult, markPlaced, allPlaced,
  newShapesRound, type ShapesState,
} from './logic';
import { LEARN_COLORS } from '../../core/tokens';
import { contentByKey } from '../../core/content';

describe('shapes logic', () => {
  describe('dealColors', () => {
    it('returns 4 different colors from LEARN_COLORS', () => {
      // Deterministic random sequence: produces indices 0,1,2,3,4,5,... of remaining colors
      let call = 0;
      const rand = () => {
        const vals = [0.1, 0.2, 0.3, 0.4];
        return vals[call++ % vals.length];
      };

      const result = dealColors(rand);

      // Check all shapes have colors
      expect(Object.keys(result).sort()).toEqual([...SHAPES].sort());

      // Check all colors are from LEARN_COLORS
      const colors = Object.values(result);
      for (const c of colors) {
        expect(LEARN_COLORS).toContain(c);
      }

      // Check all 4 colors are different
      const uniqueColors = new Set(colors);
      expect(uniqueColors.size).toBe(4);
    });

    it('with same random seed produces same result', () => {
      const makeRand = () => {
        let i = 0;
        return () => [0.1, 0.4, 0.7, 0.2][i++ % 4];
      };
      const r1 = dealColors(makeRand());
      const r2 = dealColors(makeRand());
      expect(r1).toEqual(r2);
    });
  });

  describe('markTapped and allTapped', () => {
    it('3 shapes tapped -> allTapped false; 4th shape -> true', () => {
      const colors = dealColors();
      let state: ShapesState = { colors, tapped: new Set(), placed: new Set() };

      state = markTapped(state, 'circle');
      expect(allTapped(state)).toBe(false);

      state = markTapped(state, 'square');
      expect(allTapped(state)).toBe(false);

      state = markTapped(state, 'triangle');
      expect(allTapped(state)).toBe(false);

      state = markTapped(state, 'star');
      expect(allTapped(state)).toBe(true);
    });

    it('tapping same shape again does not break state', () => {
      const colors = dealColors();
      let state: ShapesState = { colors, tapped: new Set(), placed: new Set() };

      state = markTapped(state, 'circle');
      state = markTapped(state, 'circle');
      expect(state.tapped.size).toBe(1);
      expect(allTapped(state)).toBe(false);

      state = markTapped(state, 'square');
      state = markTapped(state, 'triangle');
      state = markTapped(state, 'star');
      expect(allTapped(state)).toBe(true);

      // Tap again after all tapped
      state = markTapped(state, 'circle');
      expect(allTapped(state)).toBe(true);
      expect(state.tapped.size).toBe(4);
    });
  });

  describe('SLOTS', () => {
    it('has positions for all 4 shapes', () => {
      expect(Object.keys(SLOTS).sort()).toEqual([...SHAPES].sort());
    });

    it('slot order is different from SHAPES order', () => {
      // SHAPES order: circle, square, triangle, star
      // SLOTS x-positions from left to right should NOT be in same order
      const slotsInXOrder = [...SHAPES].sort((a, b) => SLOTS[a][0] - SLOTS[b][0]);
      expect(slotsInXOrder).not.toEqual([...SHAPES]);
    });
  });

  describe('dropResult', () => {
    it('returns snap when dropped exactly on correct slot', () => {
      const circleSlot = SLOTS['circle'];
      const result = dropResult('circle', circleSlot, SLOTS);
      expect(result).toBe('snap');
    });

    it('returns snap when dropped near correct slot (within radius)', () => {
      const circleSlot = SLOTS['circle'];
      const nearPoint: [number, number, number] = [circleSlot[0] + 0.5, 0.4, circleSlot[2] + 0.3];
      const result = dropResult('circle', nearPoint, SLOTS);
      expect(result).toBe('snap');
    });

    it('returns wrong when dropped on different shape slot', () => {
      const squareSlot = SLOTS['square'];
      const result = dropResult('circle', squareSlot, SLOTS);
      expect(result).toBe('wrong');
    });

    it('returns none when dropped far from any slot', () => {
      const farPoint: [number, number, number] = [0, 0.4, 0]; // middle of pond
      const result = dropResult('circle', farPoint, SLOTS);
      expect(result).toBe('none');
    });

    it('respects custom radius', () => {
      const circleSlot = SLOTS['circle'];
      // Point 0.5 away from slot
      const nearPoint: [number, number, number] = [circleSlot[0] + 0.5, 0, circleSlot[2]];

      // With small radius (0.4), should be none
      expect(dropResult('circle', nearPoint, SLOTS, 0.4)).toBe('none');

      // With larger radius (0.6), should be snap
      expect(dropResult('circle', nearPoint, SLOTS, 0.6)).toBe('snap');
    });
  });

  describe('markPlaced and allPlaced', () => {
    it('placing 4 shapes results in allPlaced true', () => {
      const colors = dealColors();
      let state: ShapesState = { colors, tapped: new Set(), placed: new Set() };

      state = markPlaced(state, 'circle');
      expect(allPlaced(state)).toBe(false);

      state = markPlaced(state, 'square');
      expect(allPlaced(state)).toBe(false);

      state = markPlaced(state, 'triangle');
      expect(allPlaced(state)).toBe(false);

      state = markPlaced(state, 'star');
      expect(allPlaced(state)).toBe(true);
    });

    it('placing same shape twice does not duplicate', () => {
      const colors = dealColors();
      let state: ShapesState = { colors, tapped: new Set(), placed: new Set() };

      state = markPlaced(state, 'circle');
      state = markPlaced(state, 'circle');
      expect(state.placed.size).toBe(1);
    });
  });

  describe('content keys exist', () => {
    const content = contentByKey();

    it('each shape has shape.<id> key in content', () => {
      for (const shape of SHAPES) {
        const key = `shape.${shape}`;
        expect(content.has(key), `Missing content key: ${key}`).toBe(true);
        const item = content.get(key)!;
        expect(item.vi).toBeTruthy();
        expect(item.ja).toBeTruthy();
      }
    });

    it('each learn color has color.<id> key in content', () => {
      for (const color of LEARN_COLORS) {
        const key = `color.${color}`;
        expect(content.has(key), `Missing content key: ${key}`).toBe(true);
        const item = content.get(key)!;
        expect(item.vi).toBeTruthy();
        expect(item.ja).toBeTruthy();
      }
    });
  });
});

describe('shapes: độ khó', () => {
  it('dễ 2 hình cơ bản, ô to; vừa 4 hình; khó 5 hình, ô nhỏ', () => {
    for (let i = 0; i < 20; i++) {
      const e = newShapesRound('easy');
      expect(e.shapes).toHaveLength(2);
      e.shapes.forEach((s) => expect(SHAPES).toContain(s));
      const m = newShapesRound('medium');
      expect(m.shapes).toHaveLength(4);
      const h = newShapesRound('hard');
      expect(h.shapes).toHaveLength(5);
      expect(e.radius).toBeGreaterThan(m.radius);
      expect(m.radius).toBeGreaterThan(h.radius);
      for (const r of [e, m, h]) expect(new Set(r.shapes).size).toBe(r.shapes.length);
    }
  });

  it('khó luôn có một cặp hình giống nhau, cùng màu', () => {
    for (let i = 0; i < 30; i++) {
      const h = newShapesRound('hard');
      const pair = SIMILAR_PAIRS.find(([a, b]) => h.shapes.includes(a) && h.shapes.includes(b) && h.colors[a] === h.colors[b]);
      expect(pair, h.shapes.join(',')).toBeDefined();
    }
  });

  it('mỗi hình có vị trí, ô bóng ở bờ; thứ tự ô khác thứ tự hình', () => {
    for (const level of ['easy', 'medium', 'hard'] as const) {
      for (let i = 0; i < 10; i++) {
        const r = newShapesRound(level);
        const byX = (rec: typeof r.slots) => [...r.shapes].sort((a, b) => rec[a]![0] - rec[b]![0]);
        expect(byX(r.slots)).not.toEqual(byX(r.positions));
        for (const s of r.shapes) {
          expect(r.slots[s]![2]).toBe(3.5);
          expect(Math.abs(r.positions[s]![0])).toBeLessThanOrEqual(3);
          // thả đúng tâm ô thì hút
          expect(dropResult(s, r.slots[s]!, r.slots, r.radius)).toBe('snap');
        }
      }
    }
  });

  it('lượt sau ưu tiên hình chưa chơi', () => {
    const first = newShapesRound('easy');
    const next = newShapesRound('easy', first.shapes);
    expect(next.shapes.some((s) => first.shapes.includes(s))).toBe(false);
  });

  it('allPlaced theo số hình của lượt', () => {
    const r = newShapesRound('easy');
    let st: ShapesState = { colors: r.colors, tapped: new Set(), placed: new Set(), shapes: r.shapes };
    st = markPlaced(st, r.shapes[0]);
    expect(allPlaced(st)).toBe(false);
    st = markPlaced(st, r.shapes[1]);
    expect(allPlaced(st)).toBe(true);
  });

  it('mọi hình có câu đọc vi/ja/en', () => {
    const content = contentByKey();
    for (const s of ALL_SHAPES) {
      const c = content.get(`shape.${s}`);
      expect(c?.vi && c.ja && c.en, s).toBeTruthy();
    }
  });
});
