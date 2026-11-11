/** Dữ liệu 12 con thú hoang cho game Sở thú */

export type WildAnimalData = {
  id: string;
  model: string;
  /** chiều cao hiển thị (mặc định 1.2); hươu cao cổ cần cao hơn ~1.8 */
  height?: number;
  /** quay quanh trục y (radian) để mặt nhìn về camera */
  rotY?: number;
};

/**
 * 12 con thú hoang dùng trong sở thú.
 * Mỗi lần vào game sẽ chọn ngẫu nhiên 6 con từ danh sách này.
 */
export const WILD_ANIMALS: WildAnimalData[] = [
  { id: 'elephant', model: 'elephant.glb', height: 1.5 },
  { id: 'giraffe', model: 'giraffe.glb', height: 1.8 },
  { id: 'lion', model: 'lion.glb' },
  { id: 'tiger', model: 'tiger.glb' },
  { id: 'monkey', model: 'monkey.glb' },
  { id: 'panda', model: 'panda.glb' },
  { id: 'penguin', model: 'penguin.glb' },
  { id: 'koala', model: 'koala.glb' },
  { id: 'fox', model: 'fox.glb' },
  { id: 'bear', model: 'bear.glb', height: 1.4 },
  { id: 'parrot', model: 'parrot.glb' },
  { id: 'fish', model: 'fish.glb' },
];

/**
 * Seeded random number generator (Mulberry32).
 * Cho kết quả nhất quán khi cùng seed, hữu ích cho test.
 */
function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle với PRNG cho phép đặt seed.
 */
function shuffleWithSeed<T>(arr: T[], rand: () => number): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Chọn ngẫu nhiên 6 con thú từ 12 con trong WILD_ANIMALS.
 * @param seed Nếu truyền seed (số nguyên), kết quả sẽ nhất quán. Không truyền thì dùng Math.random.
 * @returns Mảng 6 WildAnimalData khác nhau.
 */
export function pickSixAnimals(seed?: number): WildAnimalData[] {
  const rand = seed !== undefined ? mulberry32(seed) : Math.random;
  const shuffled = shuffleWithSeed(WILD_ANIMALS, rand);
  return shuffled.slice(0, 6);
}
