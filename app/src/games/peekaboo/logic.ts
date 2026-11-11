/**
 * Peekaboo game logic - Ú òa (tìm bạn thú trốn sau bụi)
 * Logic thuần, không UI
 */

// Danh sách thú từ cards farm + wild
// IDs lấy từ animals.json và wild.json
export const FARM_ANIMALS = ['cow', 'chicken', 'duck', 'pig', 'dog', 'sheep', 'horse', 'rabbit'] as const;
export const WILD_ANIMALS = [
  'elephant',
  'giraffe',
  'lion',
  'tiger',
  'monkey',
  'panda',
  'penguin',
  'koala',
  'fox',
  'bear',
  'parrot',
  'fish',
] as const;

export const ALL_ANIMALS = [...FARM_ANIMALS, ...WILD_ANIMALS] as const;
export type AnimalId = (typeof ALL_ANIMALS)[number];

export interface PeekState {
  bushCount: number;
  hidingBush: number; // index của bụi có thú trốn
  animalId: AnimalId;
  found: boolean;
}

/**
 * Chọn số bụi theo tuổi (tháng):
 * - < 36 tháng: 3 bụi
 * - 36-47 tháng: 4 bụi
 * - >= 48 tháng: 5 bụi
 */
export function bushCountForAge(ageMonths: number): number {
  if (ageMonths < 36) return 3;
  if (ageMonths < 48) return 4;
  return 5;
}

/**
 * Seeded random number generator (mulberry32)
 * Cho kết quả deterministic để test
 */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Tạo ván mới:
 * - bushCount: số bụi
 * - seed: seed cho random (cho test)
 * - prevId: id thú ván trước (để tránh trùng)
 */
export function newRound(bushCount: number, seed: number, prevId?: AnimalId): PeekState {
  const rng = mulberry32(seed);

  // Chọn thú ngẫu nhiên, khác ván trước
  let available = ALL_ANIMALS.filter((id) => id !== prevId);
  if (available.length === 0) available = [...ALL_ANIMALS];

  const animalIndex = Math.floor(rng() * available.length);
  const animalId = available[animalIndex];

  // Chọn bụi ngẫu nhiên để thú trốn
  const hidingBush = Math.floor(rng() * bushCount);

  return {
    bushCount,
    hidingBush,
    animalId,
    found: false,
  };
}

/**
 * Xử lý chạm bụi:
 * - Trả về 'empty' nếu bụi trống
 * - Trả về 'found' nếu tìm thấy thú
 */
export function tap(state: PeekState, bushIndex: number): 'empty' | 'found' {
  if (state.found) return 'found'; // đã tìm thấy rồi
  if (bushIndex === state.hidingBush) {
    return 'found';
  }
  return 'empty';
}
