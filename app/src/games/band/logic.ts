/** Logic thuần của Ban nhạc thú: 4 ô nhịp, mỗi ô một con vật hoặc nghỉ. */

export type Slots = (string | null)[];
export type Tempo = 'slow' | 'normal' | 'fast';

export const SLOT_COUNT = 4;

/** Con vật có tiếng kêu ghi âm thật (public/audio/sfx/animal-<id>.mp3). */
export const BAND_ANIMALS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep'] as const;

export function emptySlots(): Slots {
  return Array.from({ length: SLOT_COUNT }, () => null);
}

/** Đặt con vật vào ô i; ô đã có con vật thì thay. */
export function place(slots: Slots, i: number, id: string): Slots {
  if (i < 0 || i >= slots.length) return slots;
  return slots.map((s, k) => (k === i ? id : s));
}

/** Làm trống ô i. */
export function remove(slots: Slots, i: number): Slots {
  if (i < 0 || i >= slots.length) return slots;
  return slots.map((s, k) => (k === i ? null : s));
}

export function hasAnimals(slots: Slots): boolean {
  return slots.some((s) => s !== null);
}

/** Nhịp kế tiếp (−1 nghĩa là chưa phát nhịp nào). */
export function nextBeat(beat: number): number {
  return (beat + 1) % SLOT_COUNT;
}

const BEAT_MS: Record<Tempo, number> = { slow: 900, normal: 650, fast: 450 };

export function beatMs(tempo: Tempo): number {
  return BEAT_MS[tempo];
}
