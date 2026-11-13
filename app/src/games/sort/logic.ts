/**
 * Logic cho trò Xếp vào giỏ: kéo hình vào đúng giỏ.
 * Ba kiểu phân loại (bố mẹ chọn trong cài đặt, 'mix' thì đổi kiểu mỗi ván):
 * - colors: quả theo màu (đỏ, vàng, xanh lá, cam; mỗi ván bốc 2–3 màu);
 * - kinds: con vật một giỏ, trái cây một giỏ;
 * - sizes: con vật to một giỏ, con vật nhỏ một giỏ.
 */
import {
  ANIMAL_IDS,
  BIG_ANIMALS,
  FRUIT_COLOR,
  FRUIT_IDS,
  SMALL_ANIMALS,
  type FruitId,
} from '../../content/pictures';
import { pickFresh, type Topic } from '../../core/gameOptions';

export type SortMode = 'colors' | 'kinds' | 'sizes';
export const SORT_MODES: readonly SortMode[] = ['colors', 'kinds', 'sizes'];

export type ColorBin = 'red' | 'yellow' | 'green' | 'orange';
/** Giỏ: màu (kiểu colors), animal/fruit (kinds), big/small (sizes). */
export type BinId = ColorBin | 'animal' | 'fruit' | 'big' | 'small';
/** Tên cũ, giữ cho e2e/test: "màu" của một quả là giỏ đúng của nó. */
export type FruitColor = BinId;

export const COLOR_BINS: readonly ColorBin[] = ['red', 'yellow', 'green', 'orange'];

export interface Fruit {
  id: string;
  /** Giỏ đúng của hình này. */
  color: BinId;
}

export interface Basket {
  color: BinId;
  /** Hình mẫu trên thẻ treo trước giỏ. */
  hint: string;
}

export interface State {
  mode: SortMode;
  baskets: Basket[];
  fruits: Fruit[];
  remaining: number[]; // indices of fruits still needing placement
  done: boolean;
}

/** Quả theo màu (lấy từ FRUIT_COLOR). */
export const FRUITS_BY_COLOR: Record<ColorBin, FruitId[]> = {
  red: [],
  yellow: [],
  green: [],
  orange: [],
};
for (const id of FRUIT_IDS) {
  const c = FRUIT_COLOR[id];
  if (c) FRUITS_BY_COLOR[c].push(id);
}

/** Hình trong từng giỏ. */
export function itemsForBin(bin: BinId): readonly string[] {
  switch (bin) {
    case 'animal':
      return ANIMAL_IDS;
    case 'fruit':
      return FRUIT_IDS;
    case 'big':
      return BIG_ANIMALS;
    case 'small':
      return SMALL_ANIMALS;
    default:
      return FRUITS_BY_COLOR[bin];
  }
}

const HINT: Record<BinId, string> = {
  red: 'apple',
  yellow: 'banana',
  green: 'pear',
  orange: 'orange',
  animal: 'dog',
  fruit: 'apple',
  big: 'elephant',
  small: 'chicken',
};

/** Seeded random number generator (mulberry32). */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle array in place with seeded rng. */
function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface RoundOptions {
  /** Tổng số hình; mặc định 4–6 với 2 giỏ, 6 với 3 giỏ. */
  itemCount?: number;
  /** Hình của ván trước, ưu tiên không lặp lại. */
  avoid?: readonly string[];
}

/**
 * Tạo ván mới.
 * @param basketCount số giỏ (chỉ kiểu colors mới có 3 giỏ; kinds/sizes luôn 2 giỏ).
 * @param seed random seed cho reproducibility trong test.
 * @param mode kiểu phân loại.
 */
export function newRound(
  basketCount: 2 | 3,
  seed: number = Date.now(),
  mode: SortMode = 'colors',
  opts: RoundOptions = {},
): State {
  const rng = mulberry32(seed);

  // Chọn giỏ
  let bins: BinId[];
  if (mode === 'kinds') bins = ['animal', 'fruit'];
  else if (mode === 'sizes') bins = ['big', 'small'];
  else bins = pickFresh(COLOR_BINS, basketCount, [], rng);
  const baskets = bins.map((color) => ({ color, hint: HINT[color] }));

  // Tổng số hình: mỗi giỏ >= 2
  const defaultTotal = bins.length === 2 ? 4 + Math.floor(rng() * 3) : 6;
  const total = Math.max(bins.length * 2, opts.itemCount ?? defaultTotal);
  const perBin = new Map<BinId, number>(bins.map((b) => [b, 2]));
  for (let left = total - bins.length * 2; left > 0; left--) {
    const b = bins[Math.floor(rng() * bins.length)];
    perBin.set(b, perBin.get(b)! + 1);
  }

  // Bốc hình cho từng giỏ, ưu tiên hình khác nhau và khác ván trước
  const fruits: Fruit[] = [];
  for (const bin of bins) {
    const count = perBin.get(bin)!;
    const pool = itemsForBin(bin);
    const ids = pickFresh(pool, Math.min(count, pool.length), opts.avoid ?? [], rng);
    for (let i = 0; i < count; i++) {
      // Giỏ ít hình (cam có 2 quả) thì lặp lại
      fruits.push({ id: ids[i % ids.length], color: bin });
    }
  }

  // Xáo trộn thứ tự
  shuffle(fruits, rng);

  return {
    mode,
    baskets,
    fruits,
    remaining: fruits.map((_, i) => i),
    done: false,
  };
}

/**
 * Kiểu phân loại cho ván tới.
 * Chủ đề colors/kinds/sizes thì cố định; 'mix' (và chủ đề khác) thì đổi kiểu mỗi ván,
 * không lặp kiểu ván trước; bé dưới 36 tháng chưa chơi to/nhỏ khi trộn.
 */
export function modeForRound(
  topic: Topic,
  ageMonths: number,
  prev?: SortMode,
  rand: () => number = Math.random,
): SortMode {
  if (topic === 'colors' || topic === 'kinds' || topic === 'sizes') return topic;
  const modes = ageMonths < 36 ? SORT_MODES.filter((m) => m !== 'sizes') : SORT_MODES;
  const choices = modes.filter((m) => m !== prev);
  return choices[Math.floor(rand() * choices.length)];
}

/** Số giỏ và số hình theo tuổi đã quy độ khó. */
export function roundSize(mode: SortMode, ageMonths: number): { basketCount: 2 | 3; itemCount?: number } {
  if (mode === 'colors') {
    if (ageMonths < 36) return { basketCount: 2 };
    return ageMonths < 48 ? { basketCount: 3 } : { basketCount: 3, itemCount: 8 };
  }
  if (ageMonths < 36) return { basketCount: 2, itemCount: 4 };
  return { basketCount: 2, itemCount: ageMonths < 48 ? 6 : 8 };
}

/** Câu chào giải thích cách xếp của từng kiểu. */
export const HELLO_KEY: Record<SortMode, string> = {
  colors: 'sort.hello',
  kinds: 'sort.hello-kinds',
  sizes: 'sort.hello-sizes',
};

/**
 * Thả hình vào giỏ.
 * @returns 'ok' nếu đúng giỏ, 'wrong' nếu sai.
 */
export function drop(state: State, fruitIdx: number, basketColor: BinId): 'ok' | 'wrong' {
  const fruit = state.fruits[fruitIdx];
  if (!fruit) return 'wrong';

  if (fruit.color !== basketColor) {
    return 'wrong';
  }

  // Xóa khỏi remaining
  const idx = state.remaining.indexOf(fruitIdx);
  if (idx !== -1) {
    state.remaining.splice(idx, 1);
  }

  // Kiểm tra done
  state.done = state.remaining.length === 0;

  return 'ok';
}

/** Kiểm tra đã xếp hết chưa. */
export function isDone(state: State): boolean {
  return state.done;
}
