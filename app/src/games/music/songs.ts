/**
 * Giai điệu thiếu nhi thuộc phạm vi công cộng (dân ca/nhạc cổ điển, tác giả mất trên 70 năm),
 * viết ở đô trưởng trong 8 phím C4–C5: 0=C 1=D 2=E 3=F 4=G 5=A 6=B 7=C5.
 * Mỗi nốt là [phím, phách]; bài chia câu (phrase) để mức dễ chỉ chơi câu đầu.
 */
import { pickFresh, type Level } from '../../core/variety';
import type { DrumKind } from '../../core/synth';

export type Note = readonly [key: number, beats: number];
export interface Song {
  id: string;
  phrases: readonly (readonly Note[])[];
}

const n = (keys: string): Note[] =>
  keys.split(' ').map((t) => {
    const [k, b] = t.split(':');
    return [Number(k), b ? Number(b) : 1] as const;
  });

export const SONGS: readonly Song[] = [
  // Twinkle Twinkle Little Star (dân ca Pháp "Ah! vous dirai-je, maman")
  { id: 'twinkle', phrases: [n('0 0 4 4 5 5 4:2'), n('3 3 2 2 1 1 0:2'), n('4 4 3 3 2 2 1:2'), n('4 4 3 3 2 2 1:2'), n('0 0 4 4 5 5 4:2'), n('3 3 2 2 1 1 0:2')] },
  // Mary Had a Little Lamb (Mỹ, thế kỷ 19)
  { id: 'mary', phrases: [n('2 1 0 1 2 2 2:2'), n('1 1 1:2 2 4 4:2'), n('2 1 0 1 2 2 2 2'), n('1 1 2 1 0:4')] },
  // Hot Cross Buns (dân ca Anh)
  { id: 'hotcross', phrases: [n('2 1 0:2'), n('2 1 0:2'), n('0 0 0 0 1 1 1 1'), n('2 1 0:2')] },
  // Ode to Joy (Beethoven, 1824)
  { id: 'ode', phrases: [n('2 2 3 4 4 3 2 1'), n('0 0 1 2 2:1.5 1:0.5 1:2'), n('2 2 3 4 4 3 2 1'), n('0 0 1 2 1:1.5 0:0.5 0:2')] },
  // Frère Jacques (dân ca Pháp) — bỏ câu cuối vì xuống dưới C4
  { id: 'frere', phrases: [n('0 1 2 0'), n('0 1 2 0'), n('2 3 4:2'), n('2 3 4:2'), n('4:0.5 5:0.5 4:0.5 3:0.5 2 0'), n('4:0.5 5:0.5 4:0.5 3:0.5 2 0')] },
  // Row, Row, Row Your Boat (Mỹ, thế kỷ 19)
  { id: 'row', phrases: [n('0:1.5 0:1.5 0 1:0.5 2:1.5'), n('2 1:0.5 2 3:0.5 4:3'), n('7:0.5 7:0.5 7:0.5 4:0.5 4:0.5 4:0.5 2:0.5 2:0.5 2:0.5 0:0.5 0:0.5 0:0.5'), n('4 3:0.5 2 1:0.5 0:3')] },
  // Jingle Bells (James Lord Pierpont, 1857)
  { id: 'jingle', phrases: [n('2 2 2:2'), n('2 2 2:2'), n('2 4 0:1.5 1:0.5 2:4'), n('3 3 3:1.5 3:0.5 3 2 2 2:0.5 2:0.5'), n('2 1 1 2 1:2 4:2')] },
  // Kaeru no uta (dân ca Đức)
  { id: 'kaeru', phrases: [n('0 1 2 3 2 1 0:2'), n('2 3 4 5 4 3 2:2'), n('0:2 0:2 0:2 0:2'), n('0:0.5 0:0.5 1:0.5 1:0.5 2:0.5 2:0.5 3:0.5 3:0.5 2 1 0:2')] },
  // London Bridge Is Falling Down (dân ca Anh)
  { id: 'london', phrases: [n('4:1.5 5:0.5 4 3 2 3 4:2'), n('1 2 3:2 2 3 4:2'), n('4:1.5 5:0.5 4 3 2 3 4:2'), n('1:2 4:2 2 0:3')] },
  // Chōchō / Hänschen klein (dân ca Đức)
  { id: 'chocho', phrases: [n('4 2 2:2'), n('3 1 1:2'), n('0 1 2 3 4 4 4:2'), n('4 2 2:2 3 1 1:2'), n('0 2 4 4 2 2 2:2')] },
];

export interface MusicLevel {
  /** số phím đàn hiện (từ C4 lên) */
  keys: number;
  drums: readonly DrumKind[];
  /** số câu của bài được chơi (Infinity = cả bài) */
  phrases: number;
}

export const MUSIC_LEVELS: Record<Level, MusicLevel> = {
  easy: { keys: 5, drums: ['boom', 'bell'], phrases: 1 },
  medium: { keys: 8, drums: ['boom', 'tap', 'shaker', 'bell'], phrases: 2 },
  hard: { keys: 8, drums: ['boom', 'tap', 'shaker', 'bell'], phrases: Infinity },
};

/** Các nốt bé sẽ chơi theo mức: bài cắt theo số câu. */
export function melodyFor(song: Song, level: Level): Note[] {
  return song.phrases.slice(0, MUSIC_LEVELS[level].phrases).flat();
}

/** Bài hợp mức: mọi nốt phải nằm trong số phím đang hiện. */
export function songsFor(level: Level): Song[] {
  const keys = MUSIC_LEVELS[level].keys;
  return SONGS.filter((s) => melodyFor(s, level).every(([k]) => k < keys));
}

/** Bài kế tiếp, khác bài vừa chơi. */
export function nextSong(level: Level, lastId: string | null, rand: () => number = Math.random): Song {
  const pool = songsFor(level);
  const last = pool.find((s) => s.id === lastId) ?? null;
  return pickFresh(pool, last, rand);
}

/** Bé chạm phím `key` khi đang chờ nốt thứ `pos`: đúng phím sáng thì tiến lên, sai không sao (vẫn kêu, đứng chờ). */
export function follow(melody: readonly Note[], pos: number, key: number): { pos: number; done: boolean } {
  if (pos >= melody.length) return { pos, done: true };
  const next = melody[pos][0] === key ? pos + 1 : pos;
  return { pos: next, done: next >= melody.length };
}
