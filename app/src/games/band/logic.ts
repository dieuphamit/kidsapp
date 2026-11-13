/** Logic thuần của Ban nhạc thú: các ô nhịp (mặc định 4), mỗi ô một con vật hoặc nghỉ. */
import { pickManyFresh, shuffle, type Level } from '../../core/variety';

export type Slots = (string | null)[];
export type Tempo = 'slow' | 'normal' | 'fast';

export const SLOT_COUNT = 4;

/** Con vật có tiếng kêu ghi âm thật (public/audio/sfx/animal-<id>.mp3). */
export const BAND_ANIMALS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep'] as const;

export function emptySlots(count = SLOT_COUNT): Slots {
  return Array.from({ length: count }, () => null);
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
export function nextBeat(beat: number, count = SLOT_COUNT): number {
  return (beat + 1) % count;
}

const BEAT_MS: Record<Tempo, number> = { slow: 900, normal: 650, fast: 450 };

export function beatMs(tempo: Tempo): number {
  return BEAT_MS[tempo];
}

/** Mọi con vật có tiếng kêu ghi âm thật và thẻ hình. */
export const SOUND_ANIMALS = [
  'cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit',
  'elephant', 'giraffe', 'lion', 'tiger', 'monkey', 'panda', 'penguin', 'koala', 'fox', 'bear', 'parrot', 'fish',
] as const;
/** Khách mời (ngoài 6 bạn nông trại), mức khó mỗi lần vào có 2 bạn khác nhau. */
export const GUEST_ANIMALS: readonly string[] = SOUND_ANIMALS.filter((a) => !(BAND_ANIMALS as readonly string[]).includes(a));

/** Con vật đứng sẵn ở ô 1 để vòng lặp kêu ngay. */
export const STARTER = 'dog';

export interface BandLevel {
  /** số ô nhịp = độ dài đoạn nhạc lặp lại */
  slots: number;
  /** số bạn trong khay */
  tray: number;
}

export const BAND_LEVELS: Record<Level, BandLevel> = {
  easy: { slots: 3, tray: 4 },
  medium: { slots: 4, tray: 6 },
  hard: { slots: 6, tray: 7 },
};

/**
 * Khay theo mức (luôn có chó đứng sẵn):
 * dễ: chó + 3 bạn nông trại; vừa: 6 bạn nông trại xáo thứ tự;
 * khó: chó + 4 bạn nông trại + 2 khách mời, ưu tiên khách chưa gặp lần trước (`recent`).
 */
export function trayFor(level: Level, recent: readonly string[] = [], rand: () => number = Math.random): string[] {
  const others = BAND_ANIMALS.filter((a) => a !== STARTER);
  if (level === 'easy') return shuffle([STARTER, ...pickManyFresh(others, 3, recent, rand)], rand);
  if (level === 'medium') return shuffle([...BAND_ANIMALS], rand);
  const guests = pickManyFresh(GUEST_ANIMALS, 2, recent, rand);
  return shuffle([STARTER, ...pickManyFresh(others, 4, recent, rand), ...guests], rand);
}
