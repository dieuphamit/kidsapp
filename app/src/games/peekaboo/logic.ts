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

/** E4: thú của thế giới 5 khu có thẻ ảnh thật và tiếng kêu thật. */
export const NEW_ANIMALS = ['zebra', 'deer', 'raccoon', 'frog', 'bee', 'pigeon', 'dolphin', 'whale'] as const;

export const ALL_ANIMALS = [...FARM_ANIMALS, ...WILD_ANIMALS, ...NEW_ANIMALS] as const;
export type AnimalId = (typeof ALL_ANIMALS)[number];

/** Chỗ núp: bụi cây (vườn), đám mây (trời), con sóng (biển). */
export type Cover = 'bush' | 'cloud' | 'wave';
export const COVERS: readonly Cover[] = ['bush', 'cloud', 'wave'];

/** Thú núp sau mây (biết bay) và sau sóng (ở biển); còn lại núp trong bụi. */
const SKY: readonly AnimalId[] = ['parrot', 'pigeon', 'bee'];
const SEA: readonly AnimalId[] = ['fish', 'penguin', 'dolphin', 'whale'];

export function coverOf(id: AnimalId): Cover {
  if (SKY.includes(id)) return 'cloud';
  if (SEA.includes(id)) return 'wave';
  return 'bush';
}

export function animalsFor(cover: Cover): AnimalId[] {
  return ALL_ANIMALS.filter((id) => coverOf(id) === cover);
}

export interface PeekState {
  bushCount: number;
  hidingBush: number; // index của bụi có thú trốn
  animalId: AnimalId;
  /** Chỗ núp của ván (mọi ô cùng một loại). */
  cover: Cover;
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

/** Số ván đầu thú ló tai gợi ý: bé nhỏ được gợi ý lâu hơn. */
export function hintRoundsForAge(ageMonths: number): number {
  if (ageMonths < 36) return 3;
  return ageMonths < 48 ? 2 : 1;
}

/** Nhịp bụi có thú khẽ rung (ms): bé lớn rung thưa hơn, phải nhìn kỹ hơn. */
export function wiggleMsForAge(ageMonths: number): number {
  return ageMonths < 48 ? 3000 : 5000;
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
 * - forceCover: ép chỗ núp (e2e)
 */
export function newRound(bushCount: number, seed: number, prevId?: AnimalId, forceCover?: Cover): PeekState {
  const rng = mulberry32(seed);

  // Chọn chỗ núp: nửa số ván là vườn bụi, còn lại chia đều trời mây và biển sóng
  const r = rng();
  const cover: Cover = forceCover ?? (r < 0.5 ? 'bush' : r < 0.75 ? 'cloud' : 'wave');

  // Chọn thú ngẫu nhiên hợp chỗ núp, khác ván trước
  let available = animalsFor(cover).filter((id) => id !== prevId);
  if (available.length === 0) available = animalsFor(cover);

  const animalIndex = Math.floor(rng() * available.length);
  const animalId = available[animalIndex];

  // Chọn bụi ngẫu nhiên để thú trốn
  const hidingBush = Math.floor(rng() * bushCount);

  return {
    bushCount,
    hidingBush,
    animalId,
    cover,
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
