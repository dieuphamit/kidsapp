import { describe, it, expect } from 'vitest';
import { SHAPES, dealColors, markTapped, allTapped, SLOTS, dropResult, markPlaced, allPlaced, type ShapesState } from './logic';
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
