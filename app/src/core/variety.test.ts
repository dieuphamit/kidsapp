import { describe, it, expect, afterEach } from 'vitest';
import { levelFor, playSetup, pickFresh, pickManyFresh, shuffle } from './variety';

/** Dãy số giả ngẫu nhiên lặp lại được. */
function seq(...vals: number[]) {
  let i = 0;
  return () => vals[i++ % vals.length];
}

describe('levelFor', () => {
  it('auto theo tuổi: <36 dễ, 36–47 vừa, ≥48 khó', () => {
    expect(levelFor(24)).toBe('easy');
    expect(levelFor(35)).toBe('easy');
    expect(levelFor(36)).toBe('medium');
    expect(levelFor(47)).toBe('medium');
    expect(levelFor(48)).toBe('hard');
    expect(levelFor(72)).toBe('hard');
  });
  it('bố mẹ chọn mức thì bỏ qua tuổi', () => {
    expect(levelFor(24, 'hard')).toBe('hard');
    expect(levelFor(70, 'easy')).toBe('easy');
    expect(levelFor(30, 'medium')).toBe('medium');
  });
});

describe('playSetup', () => {
  afterEach(() => window.history.pushState({}, '', '/'));

  it('mặc định: auto/mix', () => {
    expect(playSetup(28)).toEqual({ level: 'easy', topic: 'mix' });
    expect(playSetup(50, { difficulty: 'auto', topic: 'fruits' })).toEqual({ level: 'hard', topic: 'fruits' });
  });
  it('chỉ e2e mới ép được mức và chủ đề qua URL', () => {
    window.history.pushState({}, '', '/?level=hard&topic=animals');
    expect(playSetup(28)).toEqual({ level: 'easy', topic: 'mix' });
    window.history.pushState({}, '', '/?e2e=1&level=hard&topic=animals');
    expect(playSetup(28)).toEqual({ level: 'hard', topic: 'animals' });
    window.history.pushState({}, '', '/?e2e=1&level=bogus&topic=nope');
    expect(playSetup(28)).toEqual({ level: 'easy', topic: 'mix' });
  });
});

describe('chọn nội dung không lặp', () => {
  it('shuffle giữ đủ phần tử, không sửa mảng gốc', () => {
    const a = [1, 2, 3, 4, 5];
    const b = shuffle(a, seq(0.9, 0.1, 0.5, 0.3));
    expect([...b].sort()).toEqual(a);
    expect(a).toEqual([1, 2, 3, 4, 5]);
  });
  it('pickFresh không trả lại phần tử vừa dùng', () => {
    for (const r of [0, 0.25, 0.5, 0.999]) {
      expect(pickFresh(['a', 'b', 'c'], 'b', () => r)).not.toBe('b');
    }
    expect(pickFresh(['only'], 'only')).toBe('only');
  });
  it('pickManyFresh ưu tiên phần tử chưa dùng, thiếu thì bù phần tử cũ', () => {
    const pool = ['a', 'b', 'c', 'd', 'e'];
    const got = pickManyFresh(pool, 3, ['a', 'b'], seq(0.3, 0.7, 0.1));
    expect(got).toHaveLength(3);
    expect(new Set(got)).toEqual(new Set(['c', 'd', 'e']));
    const more = pickManyFresh(pool, 4, ['a', 'b'], seq(0.3, 0.7, 0.1));
    expect(more.slice(0, 3).every((x) => !['a', 'b'].includes(x))).toBe(true);
    expect(new Set(more).size).toBe(4);
    expect(pickManyFresh(pool, 9)).toHaveLength(5);
  });
});
