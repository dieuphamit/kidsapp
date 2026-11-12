/** Chuỗi hạt quy luật: logic thuần (không React). */

export type Level = 'AB' | 'AAB' | 'ABB' | 'ABC';

export const LEVELS: Level[] = ['AB', 'AAB', 'ABB', 'ABC'];

/** Thẻ trái cây khác màu rõ (ảnh `cards/<id>.png`, câu `fruit.<id>`). */
export const FRUITS = ['apple', 'banana', 'grapes', 'orange', 'pear', 'strawberry', 'watermelon'];

/** Số ván đúng liên tiếp để lên mức. */
export const STREAK_TO_LEVEL_UP = 3;

export interface Round {
  shown: string[];
  answer: string;
  choices: string[];
}

/** Một chu kỳ của quy luật, theo chỉ số quả (0 = A, 1 = B, 2 = C). */
const UNIT: Record<Level, number[]> = {
  AB: [0, 1],
  AAB: [0, 0, 1],
  ABB: [0, 1, 1],
  ABC: [0, 1, 2],
};

/** PRNG nhỏ, có seed (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function newRound(level: Level, seed: number): Round {
  const rand = rng(seed);
  const unit = UNIT[level];
  const kinds = new Set(unit).size;
  const pool = shuffle(FRUITS, rand);
  const used = pool.slice(0, kinds);
  const outside = pool[kinds];

  const length = level === 'ABC' ? 6 : 5;
  const shown = Array.from({ length }, (_, i) => used[unit[i % unit.length]]);
  const answer = used[unit[length % unit.length]];

  // Một quả khác trong chuỗi + một quả chưa có trong chuỗi
  const inChain = shuffle(
    used.filter((f) => f !== answer),
    rand,
  )[0];
  const choices = shuffle([answer, inChain, outside], rand);
  return { shown, answer, choices };
}

/** Các mức bé được chơi: < 36 tháng chỉ AB và AAB. */
export function levelsForAge(ageMonths: number): Level[] {
  return ageMonths < 36 ? LEVELS.slice(0, 2) : [...LEVELS];
}

/** Đúng `STREAK_TO_LEVEL_UP` ván liên tiếp thì lên mức kế (không vượt mức cao nhất theo tuổi). */
export function nextLevel(level: Level, streak: number, ageMonths = 72): Level {
  if (streak < STREAK_TO_LEVEL_UP) return level;
  const allowed = levelsForAge(ageMonths);
  const idx = allowed.indexOf(level);
  if (idx < 0) return allowed[allowed.length - 1];
  return allowed[Math.min(idx + 1, allowed.length - 1)];
}
