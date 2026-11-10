import { describe, it, expect } from 'vitest';
import { gamesForAge, type GameManifest } from './games';

const g = (id: string, minAge: number, maxAge: number) =>
  ({ id, minAge, maxAge, title: { vi: id, ja: id }, place: `place.${id}`, icon: '⭐', color: 'peach', Component: null as never }) as GameManifest;

describe('gamesForAge', () => {
  it('lọc theo tháng tuổi, giữ thứ tự', () => {
    const list = [g('a', 24, 72), g('b', 36, 72), g('c', 18, 30)];
    expect(gamesForAge(list, 28).map((x) => x.id)).toEqual(['a', 'c']);
    expect(gamesForAge(list, 40).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
