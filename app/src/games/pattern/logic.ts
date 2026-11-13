/** Chuỗi hạt quy luật: logic thuần (không React). */

export type Level = 'AB' | 'AAB' | 'ABB' | 'ABC';

export const LEVELS: Level[] = ['AB', 'AAB', 'ABB', 'ABC'];

/** Thẻ trái cây khác màu rõ (ảnh `cards/<id>.png`, câu `fruit.<id>`). */
export const FRUITS = ['apple', 'banana', 'grapes', 'orange', 'pear', 'strawberry', 'watermelon'];

/**
 * Loại hạt: quả, con vật (đọc tên), tiếng kêu (đọc bằng tiếng kêu thật), màu, hình.
 * Mỗi loại có kho riêng; id chỉ duy nhất trong một loại ('orange' là quả cam và cũng là màu cam).
 */
export type Kind = 'fruit' | 'animal' | 'sound' | 'color' | 'shape';
export const KINDS: Kind[] = ['fruit', 'animal', 'sound', 'color', 'shape'];

/** Thú có thẻ ảnh và tiếng kêu thật rõ, dễ phân biệt. */
export const ANIMALS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'lion', 'elephant'];
export const COLORS = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'];
export const SHAPES = ['circle', 'square', 'triangle', 'star'];

export const ITEMS: Record<Kind, string[]> = {
  fruit: FRUITS,
  animal: ANIMALS,
  sound: ANIMALS,
  color: COLORS,
  shape: SHAPES,
};

/** Câu đọc một hạt. */
export function sayKey(kind: Kind, id: string): string {
  switch (kind) {
    case 'fruit':
      return `fruit.${id}`;
    case 'animal':
      return `animal.${id}`;
    case 'sound':
      return `animal.${id}-sound`;
    case 'color':
      return `color.${id}`;
    case 'shape':
      return `shape.${id}`;
  }
}

/** Câu hỏi "tiếp theo là … gì?" theo loại. */
export function nextKey(kind: Kind): string {
  if (kind === 'fruit') return 'pattern.next';
  if (kind === 'animal' || kind === 'sound') return 'pattern.next-animal';
  return `pattern.next-${kind}`;
}

/** Loại hạt theo chủ đề bố mẹ chọn ('mix' = mọi loại). */
export function kindsForTopic(topic: string): Kind[] {
  if (topic === 'fruits') return ['fruit'];
  if (topic === 'animals') return ['animal', 'sound'];
  if (topic === 'shapes') return ['color', 'shape'];
  return [...KINDS];
}

/** Loại cho ván kế: khác loại ván trước (nếu còn loại khác). */
export function pickKind(kinds: Kind[], last: Kind | null, seed: number): Kind {
  const pool = kinds.length > 1 && last ? kinds.filter((k) => k !== last) : kinds;
  return pool[Math.floor(rng(seed)() * pool.length)];
}

/** Số lựa chọn theo tuổi: < 36 tháng 2 hạt, < 54 tháng 3 hạt, lớn hơn 4 hạt. */
export function choiceCountForAge(ageMonths: number): number {
  if (ageMonths < 36) return 2;
  return ageMonths < 54 ? 3 : 4;
}

/** Mức bắt đầu: bé lớn (≥ 54 tháng, "Khó") vào thẳng AAB. */
export function startLevel(ageMonths: number): Level {
  return ageMonths >= 54 ? 'AAB' : 'AB';
}

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

export interface RoundOptions {
  kind?: Kind;
  /** Số lựa chọn 2–4 (mặc định 3). */
  choices?: number;
}

export function newRound(level: Level, seed: number, opts: RoundOptions = {}): Round {
  const rand = rng(seed);
  const unit = UNIT[level];
  const kinds = new Set(unit).size;
  const count = Math.min(4, Math.max(2, opts.choices ?? 3));
  const pool = shuffle(ITEMS[opts.kind ?? 'fruit'], rand);
  const used = pool.slice(0, kinds);
  const outside = pool.slice(kinds);

  const length = level === 'ABC' ? 6 : 5;
  const shown = Array.from({ length }, (_, i) => used[unit[i % unit.length]]);
  const answer = used[unit[length % unit.length]];

  // Luôn có một quả khác trong chuỗi; rồi thêm quả chưa có trong chuỗi, thiếu thì lấy tiếp quả trong chuỗi
  const inChain = shuffle(
    used.filter((f) => f !== answer),
    rand,
  );
  const extra = [...outside, ...inChain.slice(1)].slice(0, count - 2);
  const choices = shuffle([answer, inChain[0], ...extra], rand);
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
