/**
 * Trò Bóng của ai?: kéo thẻ vào đúng bóng.
 * Kho hình theo chủ đề bố mẹ chọn: con vật (20 con), trái cây (16 quả), hình khối (8 hình vẽ SVG).
 * 'mix': mỗi ván bốc ngẫu nhiên một nhóm, các lựa chọn cùng nhóm với đáp án để phải nhìn dáng bóng.
 */
import { ANIMAL_IDS, FRUIT_IDS, SHAPE_IDS } from '../../content/pictures';
import { pickFresh, type Topic } from '../../core/gameOptions';

export const ANIMALS = ANIMAL_IDS;

/** Id một hình trong kho (con vật, quả hoặc hình khối). */
export type AnimalId = string;

export type ShadowGroup = 'animals' | 'fruits' | 'shapes';

export const POOLS: Record<ShadowGroup, readonly string[]> = {
  animals: ANIMAL_IDS,
  fruits: FRUIT_IDS,
  shapes: SHAPE_IDS,
};

const GROUPS: readonly ShadowGroup[] = ['animals', 'fruits', 'shapes'];

export interface Round {
  answer: AnimalId;
  choices: AnimalId[];
  group: ShadowGroup;
}

/** Số lựa chọn theo tuổi đã quy độ khó: <36 tháng 2, 36–47 tháng 3, từ 48 tháng 4. */
export function choiceCountForAge(ageMonths: number): number {
  if (ageMonths < 36) return 2;
  if (ageMonths < 48) return 3;
  return 4;
}

/** Nhóm hình của ván: theo chủ đề, 'mix' (hoặc chủ đề lạ) thì bốc ngẫu nhiên. */
export function groupForTopic(topic: Topic, rand: () => number = Math.random): ShadowGroup {
  if (topic === 'animals' || topic === 'fruits' || topic === 'shapes') return topic;
  return GROUPS[Math.floor(rand() * GROUPS.length)];
}

/**
 * Tạo ván mới.
 * @param choiceCount Số lựa chọn (2–4)
 * @param rand Hàm random (mặc định Math.random)
 * @param exclude Hình của các ván vừa rồi (một id hoặc danh sách) để không lặp ngay
 * @param topic Chủ đề bố mẹ chọn (mặc định trộn)
 */
export function newRound(
  choiceCount: number,
  rand: () => number = Math.random,
  exclude?: AnimalId | readonly AnimalId[],
  topic: Topic = 'mix',
): Round {
  const group = groupForTopic(topic, rand);
  const pool = POOLS[group];
  const count = Math.max(2, Math.min(choiceCount, pool.length));
  const avoid: readonly string[] = exclude === undefined ? [] : typeof exclude === 'string' ? [exclude] : exclude;
  const [answer] = pickFresh(pool, 1, avoid, rand);
  const others = pickFresh(pool.filter((a) => a !== answer), count - 1, [], rand);
  const choices = pickFresh([answer, ...others], count, [], rand);
  return { answer, choices, group };
}

export type DropResult = 'snap' | 'wrong' | 'none';

/**
 * Xác định kết quả khi thả thẻ.
 * @param draggedId ID thú đang kéo
 * @param answerId ID thú đúng (bóng)
 * @param dist Khoảng cách từ thẻ đến tâm bóng
 * @param radius Bán kính chấp nhận thả (mặc định 150px)
 */
export function dropResult(draggedId: AnimalId, answerId: AnimalId, dist: number, radius = 150): DropResult {
  if (dist > radius) return 'none';
  if (draggedId === answerId) return 'snap';
  return 'wrong';
}
