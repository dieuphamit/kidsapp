import { describe, it, expect } from 'vitest';
import { BUDDY_STORIES, STORIES, canDrop, isPhoto, newRound, pagesOf, stepsForAge, storiesForAge } from './logic';
import { SCENES } from './scenes';
import { contentByKey } from '../../core/content';

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

  it('≥ 36 tháng: 3 ô (tranh 1, 2, tranh cuối), khay có tranh 2 và tranh cuối không theo thứ tự', () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = newRound(seed, null, 36);
      const last = pagesOf(r.story);
      expect(r.steps).toEqual([1, 2, last]);
      expect(r.tray).toEqual([last, 2]);
    }
    // chuyện ảnh 3 tranh: đúng như cũ
    const plant = newRound(3, null, 36, 'plant');
    expect(plant.steps).toEqual([1, 2, 3]);
    expect(plant.tray).toEqual([3, 2]);
  });

  it('< 36 tháng: chỉ 2 tranh (đầu và cuối), khay chỉ còn tranh cuối', () => {
    const r = newRound(7, null, 30, 'chick');
    expect(r.steps).toEqual([1, 3]);
    expect(r.tray).toEqual([3]);
    for (let seed = 1; seed < 30; seed++) {
      const x = newRound(seed, null, 30);
      expect(x.steps).toEqual([1, pagesOf(x.story)]);
      expect(x.tray).toEqual([pagesOf(x.story)]);
    }
  });

  it('≥ 54 tháng ("Khó"): chuyện 4 tranh, xếp đủ 4, khay 3 tranh không theo thứ tự', () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = newRound(seed, null, 54);
      expect(pagesOf(r.story)).toBe(4);
      expect(r.steps).toEqual([1, 2, 3, 4]);
      expect([...r.tray].sort()).toEqual([2, 3, 4]);
      expect(r.tray).not.toEqual([2, 3, 4]);
    }
  });

  it('ép chuyện đầu (e2e) nhưng vẫn theo số tranh của tuổi', () => {
    expect(newRound(1, null, 54, 'party').steps).toEqual([1, 2, 3, 4]);
    expect(newRound(1, null, 40, 'party').steps).toEqual([1, 2, 4]);
  });
});

describe('stepsForAge', () => {
  it('ranh giới 36 tháng', () => {
    expect(stepsForAge(35)).toEqual([1, 3]);
    expect(stepsForAge(36)).toEqual([1, 2, 3]);
  });
});

describe('kho chuyện', () => {
  it('có ít nhất 12 chuyện, 6 chuyện có bạn đồng hành', () => {
    expect(STORIES.length).toBeGreaterThanOrEqual(12);
    expect(BUDDY_STORIES.length).toBeGreaterThanOrEqual(6);
  });

  it('chuyện có bạn đồng hành: đủ tranh ghép, mỗi tranh có bạn đồng hành hoặc bạn thú', () => {
    for (const s of BUDDY_STORIES) {
      expect(isPhoto(s)).toBe(false);
      const scenes = SCENES[s]!;
      expect(scenes, s).toHaveLength(pagesOf(s));
      for (const sc of scenes) {
        expect(sc.sprites.some((p) => 'buddy' in p || 'card' in p), s).toBe(true);
      }
    }
  });

  it('mỗi tranh có câu đọc vi/ja/en; bạn đồng hành xuất hiện trong câu bằng {name}', () => {
    const content = contentByKey();
    for (const s of STORIES) {
      for (let n = 1; n <= pagesOf(s); n++) {
        const item = content.get(`story.${s}-${n}`);
        expect(item?.vi, `story.${s}-${n}`).toBeTruthy();
        expect(item?.ja, `story.${s}-${n}`).toBeTruthy();
        expect(item?.en, `story.${s}-${n}`).toBeTruthy();
      }
    }
    for (const s of BUDDY_STORIES) {
      const named = Array.from({ length: pagesOf(s) }, (_, i) => content.get(`story.${s}-${i + 1}`)!.vi).some((t) =>
        t.includes('{name}'),
      );
      expect(named, s).toBe(true);
    }
  });

  it('khó: chỉ chuyện 4 tranh, đủ nhiều để không lặp', () => {
    const long = storiesForAge(54);
    expect(long.length).toBeGreaterThanOrEqual(4);
    for (const s of long) expect(pagesOf(s)).toBe(4);
    expect(storiesForAge(48)).toEqual([...STORIES]);
  });

  it('không lặp chuyện vừa chơi ở mọi độ tuổi', () => {
    for (const age of [30, 40, 54]) {
      let last = newRound(1, null, age).story;
      for (let seed = 2; seed < 60; seed++) {
        const r = newRound(seed, last, age);
        expect(r.story).not.toBe(last);
        last = r.story;
      }
    }
  });
});
