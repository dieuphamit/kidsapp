import { describe, it, expect } from 'vitest';
import { gamesForAge, gamesByPlace, visibleGames, type GameManifest } from './games';

const g = (id: string, minAge: number, maxAge: number, place?: string, order?: number) =>
  ({
    id,
    minAge,
    maxAge,
    title: { vi: id, ja: id, en: id },
    place: place ?? `place.${id}`,
    icon: '⭐',
    color: 'peach',
    order,
    Component: null as never,
  }) as GameManifest;

describe('gamesForAge', () => {
  it('lọc theo tháng tuổi, giữ thứ tự', () => {
    const list = [g('a', 24, 72), g('b', 36, 72), g('c', 18, 30)];
    expect(gamesForAge(list, 28).map((x) => x.id)).toEqual(['a', 'c']);
    expect(gamesForAge(list, 40).map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('gamesByPlace', () => {
  it('gom game theo địa điểm', () => {
    const list = [
      g('farm1', 24, 72, 'place.farm'),
      g('pond1', 24, 72, 'place.pond'),
      g('farm2', 24, 72, 'place.farm'),
    ];
    const map = gamesByPlace(list);
    expect(map.size).toBe(2);
    expect(map.get('place.farm')?.map((x) => x.id)).toEqual(['farm1', 'farm2']);
    expect(map.get('place.pond')?.map((x) => x.id)).toEqual(['pond1']);
  });

  it('sắp theo order rồi id', () => {
    const list = [
      g('zoo3', 24, 72, 'place.zoo', 2),
      g('zoo1', 24, 72, 'place.zoo', 0),
      g('zoo2', 24, 72, 'place.zoo', 1),
      g('abc', 24, 72, 'place.zoo', 1), // cùng order 1 với zoo2, sắp theo id
    ];
    const map = gamesByPlace(list);
    expect(map.get('place.zoo')?.map((x) => x.id)).toEqual(['zoo1', 'abc', 'zoo2', 'zoo3']);
  });

  it('order mặc định là 0', () => {
    const list = [
      g('b', 24, 72, 'place.farm', 1),
      g('a', 24, 72, 'place.farm'), // order undefined → 0
      g('c', 24, 72, 'place.farm', 0),
    ];
    const map = gamesByPlace(list);
    expect(map.get('place.farm')?.map((x) => x.id)).toEqual(['a', 'c', 'b']);
  });
});

describe('visibleGames', () => {
  const list = [g('a', 24, 72, 'place.x'), g('b', 24, 72, 'place.y'), g('c', 36, 72, 'place.y')];
  const off = { enabled: false, difficulty: 'auto', topic: 'mix' } as const;

  it('không có tùy chọn thì như gamesForAge', () => {
    expect(visibleGames(list, 28, undefined).map((x) => x.id)).toEqual(['a', 'b']);
  });
  it('ẩn trò bị tắt; khu không còn trò thì gamesByPlace không có khu đó', () => {
    const shown = visibleGames(list, 28, { b: off });
    expect(shown.map((x) => x.id)).toEqual(['a']);
    expect(gamesByPlace(shown).has('place.y')).toBe(false);
  });
  it('tắt hết trò hợp tuổi thì vẫn hiện trò hợp tuổi, không để menu trống', () => {
    expect(visibleGames(list, 28, { a: off, b: off }).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
