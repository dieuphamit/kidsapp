import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  BAND_ANIMALS, SLOT_COUNT, beatMs, emptySlots, hasAnimals, nextBeat, place, remove,
  BAND_LEVELS, GUEST_ANIMALS, SOUND_ANIMALS, STARTER, trayFor,
} from './logic';

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

  it('độ dài vòng lặp theo mức: dễ 3, vừa 4, khó 6 ô', () => {
    expect(BAND_LEVELS.easy.slots).toBe(3);
    expect(BAND_LEVELS.medium.slots).toBe(4);
    expect(BAND_LEVELS.hard.slots).toBe(6);
    expect(emptySlots(6)).toHaveLength(6);
    expect(nextBeat(5, 6)).toBe(0);
    expect(nextBeat(2, 3)).toBe(0);
    expect(nextBeat(2, 6)).toBe(3);
  });

  it('khay theo mức: dễ 4 bạn, vừa đủ 6 bạn nông trại, khó 7 bạn có 2 khách mời; luôn có chó', () => {
    for (let i = 0; i < 20; i++) {
      const e = trayFor('easy');
      expect(e).toHaveLength(4);
      e.forEach((a) => expect(BAND_ANIMALS).toContain(a));
      expect(new Set(trayFor('medium'))).toEqual(new Set(BAND_ANIMALS));
      const h = trayFor('hard');
      expect(h).toHaveLength(7);
      expect(h.filter((a) => GUEST_ANIMALS.includes(a))).toHaveLength(2);
      for (const t of [e, h]) {
        expect(t).toContain(STARTER);
        expect(new Set(t).size).toBe(t.length);
      }
    }
  });

  it('khách mời lần sau khác lần trước', () => {
    const first = trayFor('hard');
    const next = trayFor('hard', first);
    const guests = (t: string[]) => t.filter((a) => GUEST_ANIMALS.includes(a));
    expect(guests(next).some((g) => guests(first).includes(g))).toBe(false);
  });

  it('mọi con vật có tiếng kêu ghi âm và thẻ hình', () => {
    const pub = join(import.meta.dirname, '../../../public');
    for (const a of SOUND_ANIMALS) {
      expect(existsSync(join(pub, 'audio/sfx', `animal-${a}.mp3`)), a).toBe(true);
      expect(existsSync(join(pub, 'cards', `${a}.png`)), a).toBe(true);
    }
  });
});
