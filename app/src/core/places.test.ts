import { describe, it, expect } from 'vitest';
import { PLACES, placeOrder, placeByKey } from './places';
import { contentByKey } from './content';
import { ALL_GAMES } from './games';

describe('places', () => {
  it('đúng 7 khu theo thứ tự, mỗi khu có icon và màu', () => {
    expect(PLACES.map((p) => p.key)).toEqual([
      'place.zoo',
      'place.house',
      'place.orchard',
      'place.pond',
      'place.puzzle',
      'place.music',
      'place.farm',
    ]);
    expect(PLACES.map((p) => p.icon)).toEqual(['🦁', '🏠', '🍎', '🦆', '🧩', '🎵', '🐮']);
    expect(PLACES.map((p) => p.color)).toEqual(['peach', 'butter', 'leaf', 'mint', 'mint', 'lilac', 'leaf']);
  });

  it('placeOrder trả chỉ số, khu lạ xếp cuối', () => {
    expect(placeOrder('place.zoo')).toBe(0);
    expect(placeOrder('place.pond')).toBe(3);
    expect(placeOrder('place.music')).toBe(5);
    expect(placeOrder('place.farm')).toBe(6);
    expect(placeOrder('place.lake')).toBe(7);
  });

  it('placeByKey tìm được khu', () => {
    expect(placeByKey('place.puzzle')?.icon).toBe('🧩');
    expect(placeByKey('place.pond')?.icon).toBe('🦆');
    expect(placeByKey('place.farm')?.icon).toBe('🐮');
    expect(placeByKey('place.lake')).toBeUndefined();
  });

  it('mỗi khu có tên vi và ja trong content', () => {
    const content = contentByKey();
    for (const p of PLACES) {
      expect(content.get(p.key)?.vi, p.key).toBeTruthy();
      expect(content.get(p.key)?.ja, p.key).toBeTruthy();
    }
  });

  it('mọi trò nằm trong một trong 7 khu, đúng thứ tự trong khu', () => {
    const byId = new Map(ALL_GAMES.map((g) => [g.id, g]));
    for (const g of ALL_GAMES) expect(placeOrder(g.place), g.id).toBeLessThan(PLACES.length);
    const expected: [string, string, number][] = [
      ['world', 'place.zoo', -1],
      ['animals', 'place.zoo', 0],
      ['zoo3d', 'place.zoo', 1],
      ['shadow', 'place.zoo', 2],
      ['hide', 'place.house', 0],
      ['bakery', 'place.house', 2],
      ['words', 'place.house', 3],
      ['cook', 'place.house', 4],
      ['counting', 'place.orchard', 0],
      ['shapes', 'place.orchard', 2],
      ['pattern', 'place.orchard', 3],
      ['shop', 'place.orchard', 4],
      ['bath', 'place.pond', 0],
      ['peekaboo', 'place.pond', 1],
      ['sound-quiz', 'place.pond', 2],
      ['memory', 'place.puzzle', 0],
      ['puzzle', 'place.puzzle', 1],
      ['path', 'place.puzzle', 2],
      ['dots', 'place.puzzle', 3],
      ['music', 'place.music', 0],
      ['band', 'place.music', 1],
      ['coloring', 'place.music', 2],
      ['story', 'place.music', 3],
      ['mama', 'place.farm', 0],
      ['feed', 'place.farm', 1],
      ['rescue', 'place.farm', 2],
      ['sort', 'place.farm', 3],
    ];
    for (const [id, place, order] of expected) {
      const g = byId.get(id);
      expect(g, id).toBeDefined();
      expect(g?.place, id).toBe(place);
      expect(g?.order ?? 0, id).toBe(order);
    }
    // bảng trên phủ hết mọi trò; mỗi khu tối đa 4 trò để đoàn tàu hiện trọn trong khung
    expect(new Set(expected.map(([id]) => id))).toEqual(new Set(ALL_GAMES.map((g) => g.id)));
    for (const p of PLACES) expect(ALL_GAMES.filter((g) => g.place === p.key).length, p.key).toBeLessThanOrEqual(4);
  });
});
