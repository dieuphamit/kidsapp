import { describe, it, expect } from 'vitest';
import { BAND_ANIMALS, SLOT_COUNT, beatMs, emptySlots, hasAnimals, nextBeat, place, remove } from './logic';

describe('band logic', () => {
  it('sân khấu trống có 4 ô null', () => {
    expect(emptySlots()).toEqual([null, null, null, null]);
    expect(SLOT_COUNT).toBe(4);
  });

  it('place đặt con vật vào ô, không sửa mảng cũ', () => {
    const s = emptySlots();
    const s2 = place(s, 2, 'cow');
    expect(s2).toEqual([null, null, 'cow', null]);
    expect(s).toEqual([null, null, null, null]);
  });

  it('place vào ô đã có con vật thì thay', () => {
    const s = place(place(emptySlots(), 1, 'dog'), 1, 'pig');
    expect(s).toEqual([null, 'pig', null, null]);
  });

  it('place ngoài khoảng thì giữ nguyên', () => {
    const s = place(emptySlots(), 1, 'dog');
    expect(place(s, 4, 'cow')).toEqual(s);
    expect(place(s, -1, 'cow')).toEqual(s);
  });

  it('remove làm trống ô', () => {
    const s = place(place(emptySlots(), 0, 'dog'), 3, 'duck');
    const s2 = remove(s, 0);
    expect(s2).toEqual([null, null, null, 'duck']);
    expect(s).toEqual(['dog', null, null, 'duck']);
  });

  it('beatMs theo tempo', () => {
    expect(beatMs('slow')).toBe(900);
    expect(beatMs('normal')).toBe(650);
    expect(beatMs('fast')).toBe(450);
  });

  it('hasAnimals và nextBeat', () => {
    expect(hasAnimals(emptySlots())).toBe(false);
    expect(hasAnimals(place(emptySlots(), 3, 'cow'))).toBe(true);
    expect(nextBeat(-1)).toBe(0);
    expect(nextBeat(0)).toBe(1);
    expect(nextBeat(3)).toBe(0);
  });

  it('6 con vật có tiếng kêu ghi âm', () => {
    expect(BAND_ANIMALS).toEqual(['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep']);
  });
});
