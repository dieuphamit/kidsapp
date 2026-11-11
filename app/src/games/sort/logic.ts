/**
 * Logic cho game xếp quả theo màu.
 *
 * Màu đỏ: apple, cherries, strawberry
 * Màu vàng: banana, lemon, pineapple
 * Màu xanh lá: pear, watermelon
 */

export type FruitColor = 'red' | 'yellow' | 'green';

export interface Fruit {
  id: string;
  color: FruitColor;
}

export interface Basket {
  color: FruitColor;
}

export interface State {
  baskets: Basket[];
  fruits: Fruit[];
  remaining: number[]; // indices of fruits still needing placement
  done: boolean;
}

const FRUITS_BY_COLOR: Record<FruitColor, string[]> = {
  red: ['apple', 'cherries', 'strawberry'],
  yellow: ['banana', 'lemon', 'pineapple'],
  green: ['pear', 'watermelon'],
};

/** Seeded random number generator (xorshift32). */
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

/**
 * Tạo ván mới.
 * @param basketCount 2 nếu bé < 36 tháng, 3 nếu >= 36.
 * @param seed random seed cho reproducibility trong test.
 */
export function newRound(basketCount: 2 | 3, seed: number = Date.now()): State {
  const rng = mulberry32(seed);

  // Chọn màu cho giỏ
  const colors: FruitColor[] = basketCount === 2 ? ['red', 'yellow'] : ['red', 'yellow', 'green'];
  const baskets = colors.map((color) => ({ color }));

  // Sinh quả: mỗi giỏ >= 2 quả, tổng 4-6 quả
  // Với 2 giỏ: 4-6 quả, mỗi giỏ >= 2
  // Với 3 giỏ: 6 quả, mỗi giỏ = 2
  const totalFruits = basketCount === 2 ? 4 + Math.floor(rng() * 3) : 6; // 4-6 hoặc 6

  // Đảm bảo mỗi giỏ ít nhất 2 quả
  const fruitsPerColor: Record<FruitColor, number> = { red: 0, yellow: 0, green: 0 };
  for (const c of colors) {
    fruitsPerColor[c] = 2;
  }

  // Phân phối quả còn lại ngẫu nhiên
  let remaining = totalFruits - basketCount * 2;
  while (remaining > 0) {
    const c = colors[Math.floor(rng() * colors.length)];
    fruitsPerColor[c]++;
    remaining--;
  }

  // Tạo danh sách quả
  const fruits: Fruit[] = [];
  for (const color of colors) {
    const available = [...FRUITS_BY_COLOR[color]];
    shuffle(available, rng);
    const count = fruitsPerColor[color];
    for (let i = 0; i < count; i++) {
      // Lặp lại nếu cần
      fruits.push({ id: available[i % available.length], color });
    }
  }

  // Xáo trộn thứ tự quả
  shuffle(fruits, rng);

  return {
    baskets,
    fruits,
    remaining: fruits.map((_, i) => i),
    done: false,
  };
}

/**
 * Thả quả vào giỏ.
 * @returns 'ok' nếu đúng màu, 'wrong' nếu sai.
 */
export function drop(state: State, fruitIdx: number, basketColor: FruitColor): 'ok' | 'wrong' {
  const fruit = state.fruits[fruitIdx];
  if (!fruit) return 'wrong';

  if (fruit.color !== basketColor) {
    return 'wrong';
  }

  // Xóa quả khỏi remaining
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
