import { describe, it, expect } from 'vitest';
import { PLACES, placeOrder, placeByKey } from './places';
import { contentByKey } from './content';
import { ALL_GAMES } from './games';

describe('places', () => {
  it('đúng 5 khu theo thứ tự, mỗi khu có icon và màu', () => {
    expect(PLACES.map((p) => p.key)).toEqual([
      'place.zoo',
      'place.house',
      'place.orchard',
      'place.puzzle',
      'place.music',
    ]);
    expect(PLACES.map((p) => p.icon)).toEqual(['🦁', '🏠', '🍎', '🧩', '🎵']);
    expect(PLACES.map((p) => p.color)).toEqual(['peach', 'butter', 'leaf', 'mint', 'lilac']);
  });

  it('placeOrder trả chỉ số, khu lạ xếp cuối', () => {
    expect(placeOrder('place.zoo')).toBe(0);
    expect(placeOrder('place.music')).toBe(4);
    expect(placeOrder('place.farm')).toBe(5);
  });

  it('placeByKey tìm được khu', () => {
    expect(placeByKey('place.puzzle')?.icon).toBe('🧩');
    expect(placeByKey('place.pond')).toBeUndefined();
  });

  it('mỗi khu có tên vi và ja trong content', () => {
    const content = contentByKey();
    for (const p of PLACES) {
      expect(content.get(p.key)?.vi, p.key).toBeTruthy();
      expect(content.get(p.key)?.ja, p.key).toBeTruthy();
    }
  });

  it('mọi trò nằm trong một trong 5 khu, đúng thứ tự trong khu', () => {
    const byId = new Map(ALL_GAMES.map((g) => [g.id, g]));
    for (const g of ALL_GAMES) expect(placeOrder(g.place), g.id).toBeLessThan(5);
    const expected: [string, string, number][] = [
      ['animals', 'place.zoo', 0],
      ['zoo3d', 'place.zoo', 1],
      ['sound-quiz', 'place.zoo', 2],
      ['shadow', 'place.zoo', 3],
      ['peekaboo', 'place.zoo', 4],
      ['counting', 'place.orchard', 0],
      ['sort', 'place.orchard', 1],
      ['shapes', 'place.orchard', 2],
      ['memory', 'place.puzzle', 0],
      ['puzzle', 'place.puzzle', 1],
      ['music', 'place.music', 0],
    ];
    for (const [id, place, order] of expected) {
      const g = byId.get(id);
      expect(g, id).toBeDefined();
      expect(g?.place, id).toBe(place);
      expect(g?.order ?? 0, id).toBe(order);
    }
  });
});
