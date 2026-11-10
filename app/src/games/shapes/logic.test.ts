import { describe, it, expect } from 'vitest';
import { SHAPES, dealColors, markTapped, allTapped, type Shape, type ShapesState } from './logic';
import { LEARN_COLORS, type LearnColor } from '../../core/tokens';
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
      let state: ShapesState = { colors, tapped: new Set() };

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
      let state: ShapesState = { colors, tapped: new Set() };

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
