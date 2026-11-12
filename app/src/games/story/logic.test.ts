import { describe, it, expect } from 'vitest';
import { STORIES, canDrop, newRound, stepsForAge } from './logic';

describe('canDrop', () => {
  it('đúng khi cardStep === slotIndex + 1 và các ô trước đã đầy', () => {
    expect(canDrop(1, 2, [true, false, false])).toBe(true);
    expect(canDrop(2, 3, [true, true, false])).toBe(true);
  });

  it('sai bước → không thả được', () => {
    expect(canDrop(1, 3, [true, false, false])).toBe(false);
    expect(canDrop(2, 2, [true, true, false])).toBe(false);
  });

  it('ô trước còn trống → không thả được, kể cả đúng bước', () => {
    expect(canDrop(2, 3, [true, false, false])).toBe(false);
  });

  it('ô đã có tranh → không thả được', () => {
    expect(canDrop(0, 1, [true, false, false])).toBe(false);
  });

  it('ô ngoài phạm vi → không thả được', () => {
    expect(canDrop(3, 4, [true, true, true])).toBe(false);
    expect(canDrop(-1, 0, [false, false, false])).toBe(false);
  });

  it('bản 2 tranh: ô 2 nhận bước 3', () => {
    expect(canDrop(1, 3, [true, false], [1, 3])).toBe(true);
    expect(canDrop(1, 2, [true, false], [1, 3])).toBe(false);
  });
});

describe('newRound', () => {
  it('chọn chuyện trong STORIES', () => {
    for (let seed = 1; seed < 30; seed++) {
      expect(STORIES).toContain(newRound(seed, null, 48).story);
    }
  });

  it('không lặp chuyện lần trước', () => {
    for (const last of STORIES) {
      for (let seed = 1; seed < 50; seed++) {
        expect(newRound(seed, last, 48).story).not.toBe(last);
      }
    }
  });

  it('ra nhiều chuyện khác nhau theo seed', () => {
    const seen = new Set(Array.from({ length: 60 }, (_, s) => newRound(s + 1, null, 48).story));
    expect(seen.size).toBeGreaterThanOrEqual(4);
  });

  it('≥ 36 tháng: 3 ô, khay có tranh 2 và 3 không theo thứ tự', () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = newRound(seed, null, 36);
      expect(r.steps).toEqual([1, 2, 3]);
      expect(r.tray).toEqual([3, 2]);
    }
  });

  it('< 36 tháng: chỉ 2 tranh (bước 1 và 3), khay chỉ còn tranh 3', () => {
    const r = newRound(7, null, 30);
    expect(r.steps).toEqual([1, 3]);
    expect(r.tray).toEqual([3]);
  });
});

describe('stepsForAge', () => {
  it('ranh giới 36 tháng', () => {
    expect(stepsForAge(35)).toEqual([1, 3]);
    expect(stepsForAge(36)).toEqual([1, 2, 3]);
  });
});
