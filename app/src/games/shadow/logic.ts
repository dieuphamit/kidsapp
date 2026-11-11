/**
 * Trò Bóng của ai?: kéo thẻ thú vào đúng bóng.
 * Dùng 10 con thú có dáng khác nhau rõ: elephant, giraffe, penguin, parrot, fish, horse, duck, sheep, monkey, chicken.
 */

export const ANIMALS = [
  'elephant',
  'giraffe',
  'penguin',
  'parrot',
  'fish',
  'horse',
  'duck',
  'sheep',
  'monkey',
  'chicken',
] as const;

export type AnimalId = (typeof ANIMALS)[number];

export interface Round {
  answer: AnimalId;
  choices: AnimalId[];
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tạo ván mới.
 * @param choiceCount Số lựa chọn (2 nếu < 36 tháng, 3 nếu >= 36)
 * @param rand Hàm random (mặc định Math.random)
 * @param exclude Thú đã chọn ở ván trước để không lặp ngay (optional)
 */
export function newRound(choiceCount: number, rand = Math.random, exclude?: AnimalId): Round {
  const count = Math.max(2, Math.min(choiceCount, ANIMALS.length));
  const pool = exclude ? ANIMALS.filter((a) => a !== exclude) : [...ANIMALS];
  const shuffled = shuffle([...pool], rand);
  const answer = shuffled[0];
  // Lấy đủ choices, đảm bảo answer nằm trong
  const othersCount = count - 1;
  const others = shuffled.slice(1, 1 + othersCount);
  const choices = shuffle([answer, ...others], rand);
  return { answer, choices };
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
