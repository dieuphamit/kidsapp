/**
 * Chuyện ba tranh: logic thuần (không React) để test.
 * Mỗi chuyện có 3 tranh theo thứ tự: bước 1 → 2 → 3, ảnh `cards/story/<id>-<n>.png`,
 * câu đọc `story.<id>-<n>` ("đầu tiên…", "tiếp theo…", "cuối cùng…").
 */

export const STORIES = ['plant', 'chick', 'butterfly', 'frog', 'banana', 'rain'] as const;
export type StoryId = (typeof STORIES)[number];

export interface Round {
  story: StoryId;
  /** Bước của từng ô theo thứ tự: [1, 2, 3], hoặc [1, 3] cho bé < 36 tháng. */
  steps: number[];
  /** Tranh trong khay lúc bắt đầu (ô 1 đã có sẵn tranh đầu), đã xáo trộn. */
  tray: number[];
}

/** Bé < 36 tháng: chỉ 2 tranh (đầu và cuối). */
export function stepsForAge(ageMonths: number): number[] {
  return ageMonths < 36 ? [1, 3] : [1, 2, 3];
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ván mới: chọn chuyện khác lần trước, khay chứa các tranh còn lại xáo trộn (không để đúng thứ tự). */
export function newRound(seed: number, last: StoryId | null, ageMonths: number): Round {
  const rng = mulberry32(seed);
  const pool = STORIES.filter((s) => s !== last);
  const story = pool[Math.floor(rng() * pool.length)];
  const steps = stepsForAge(ageMonths);
  const tray = steps.slice(1);
  for (let i = tray.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [tray[i], tray[j]] = [tray[j], tray[i]];
  }
  // khay đang đúng thứ tự thì đảo lại, để bé phải nghĩ
  if (tray.length > 1 && tray.every((s, i) => i === 0 || tray[i - 1] < s)) tray.reverse();
  return { story, steps, tray };
}

/**
 * Thả tranh `cardStep` vào ô `slotIndex` được không: đúng bước của ô, ô còn trống và các ô trước đã đầy.
 * `steps` mặc định [1, 2, 3] (ô i nhận bước i + 1); bản 2 tranh truyền [1, 3].
 */
export function canDrop(slotIndex: number, cardStep: number, filled: boolean[], steps: number[] = [1, 2, 3]): boolean {
  if (slotIndex < 0 || slotIndex >= steps.length) return false;
  if (cardStep !== steps[slotIndex]) return false;
  if (filled[slotIndex]) return false;
  for (let i = 0; i < slotIndex; i++) if (!filled[i]) return false;
  return true;
}
