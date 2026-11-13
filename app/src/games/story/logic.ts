/**
 * Chuyện ba tranh: logic thuần (không React) để test.
 * Mỗi chuyện có 3 hoặc 4 tranh theo thứ tự, câu đọc `story.<id>-<n>`.
 * Chuyện ảnh chụp (PHOTO_STORIES) dùng ảnh `cards/story/<id>-<n>.png`; chuyện vẽ (bạn đồng hành và các bạn thú,
 * xem scenes.ts) ghép từ ảnh thẻ có sẵn.
 */

/** Chuyện ảnh chụp thật, 3 tranh. */
export const PHOTO_STORIES = ['plant', 'chick', 'butterfly', 'frog', 'banana', 'rain'] as const;
/** Chuyện có bạn đồng hành: 3 hoặc 4 tranh (PAGES). */
export const BUDDY_STORIES = ['party', 'day', 'share', 'duckling', 'garden', 'sea'] as const;
export const STORIES = [...PHOTO_STORIES, ...BUDDY_STORIES] as const;
export type StoryId = (typeof STORIES)[number];

/** Số tranh của chuyện (mặc định 3). */
export const PAGES: Partial<Record<StoryId, number>> = { party: 4, day: 4, duckling: 4, garden: 4 };
export const pagesOf = (s: StoryId) => PAGES[s] ?? 3;

export const isPhoto = (s: StoryId) => (PHOTO_STORIES as readonly string[]).includes(s);

export interface Round {
  story: StoryId;
  /** Tranh (số trang) của từng ô theo thứ tự, ví dụ [1, 2, 3]; bé < 36 tháng chỉ đầu và cuối. */
  steps: number[];
  /** Tranh trong khay lúc bắt đầu (ô 1 đã có sẵn tranh đầu), đã xáo trộn. */
  tray: number[];
}

/**
 * Tranh được xếp theo tuổi:
 * - < 36 tháng: 2 tranh (đầu và cuối);
 * - 36–53 tháng: 3 tranh (chuyện 4 tranh bỏ tranh 3);
 * - ≥ 54 tháng ("Khó"): đủ mọi tranh.
 */
export function stepsForAge(ageMonths: number, pages = 3): number[] {
  if (ageMonths < 36) return [1, pages];
  if (ageMonths < 54) return [1, 2, pages];
  return Array.from({ length: pages }, (_, i) => i + 1);
}

/** Kho chuyện theo tuổi: bé lớn (≥ 54 tháng) chơi chuyện 4 tranh. */
export function storiesForAge(ageMonths: number): StoryId[] {
  const long = STORIES.filter((s) => pagesOf(s) >= 4);
  return ageMonths >= 54 && long.length > 1 ? long : [...STORIES];
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

/**
 * Ván mới: chọn chuyện khác lần trước, khay chứa các tranh còn lại xáo trộn (không để đúng thứ tự).
 * `force`: chuyện đầu tiên cố định (e2e).
 */
export function newRound(seed: number, last: StoryId | null, ageMonths: number, force?: StoryId): Round {
  const rng = mulberry32(seed);
  const pool = storiesForAge(ageMonths).filter((s) => s !== last);
  const picked = pool[Math.floor(rng() * pool.length)];
  const story = force ?? picked;
  const steps = stepsForAge(ageMonths, pagesOf(story));
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
