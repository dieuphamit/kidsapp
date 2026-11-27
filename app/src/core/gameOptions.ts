/** Độ khó bố mẹ chọn cho một trò; 'auto' là theo tuổi thật của bé. */
export type Difficulty = 'auto' | 'easy' | 'medium' | 'hard';
/**
 * Chủ đề nội dung; 'mix' là trộn như mặc định của trò.
 * 'colors' | 'kinds' | 'sizes' là kiểu phân loại (trò Xếp vào giỏ): theo màu, con vật/trái cây, to/nhỏ.
 */
export type Topic = 'mix' | 'animals' | 'fruits' | 'shapes' | 'colors' | 'kinds' | 'sizes';

export const DIFFICULTIES: readonly Difficulty[] = ['auto', 'easy', 'medium', 'hard'];
export const TOPICS: readonly Topic[] = ['mix', 'animals', 'fruits', 'shapes', 'colors', 'kinds', 'sizes'];

/** Tùy chọn bố mẹ chỉnh cho một trò (lưu trong Settings.games). */
export interface GameSetting {
  enabled: boolean;
  difficulty: Difficulty;
  topic: Topic;
}

/** Tùy chọn truyền vào trò qua props. */
export interface GameOptions {
  difficulty: Difficulty;
  topic: Topic;
}

export const DEFAULT_GAME_SETTING: GameSetting = { enabled: true, difficulty: 'auto', topic: 'mix' };

/** Tuổi giả (tháng) cho từng mức độ khó. */
const AGE_FOR: Record<Exclude<Difficulty, 'auto'>, number> = { easy: 24, medium: 36, hard: 54 };

/**
 * Tuổi truyền vào trò: auto → tuổi thật, còn lại → tuổi giả 24/36/54 tháng.
 * Nếu có khoảng tuổi của trò thì kẹp vào [minAge, maxAge].
 */
export function effectiveAge(
  ageMonths: number,
  difficulty: Difficulty,
  range?: { minAge: number; maxAge: number },
): number {
  const age = difficulty === 'auto' ? ageMonths : AGE_FOR[difficulty] ?? ageMonths;
  if (!range) return age;
  return Math.min(range.maxAge, Math.max(range.minAge, age));
}

function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && (DIFFICULTIES as readonly string[]).includes(v);
}

function isTopic(v: unknown): v is Topic {
  return typeof v === 'string' && (TOPICS as readonly string[]).includes(v);
}

/** Vá một mục tùy chọn trò từ dữ liệu lưu (có thể cũ hoặc sai) về dạng hợp lệ. */
export function sanitizeGameSetting(raw: unknown): GameSetting {
  const o = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : DEFAULT_GAME_SETTING.enabled,
    difficulty: isDifficulty(o.difficulty) ? o.difficulty : DEFAULT_GAME_SETTING.difficulty,
    topic: isTopic(o.topic) ? o.topic : DEFAULT_GAME_SETTING.topic,
  };
}

/** Vá cả bảng tùy chọn trò; giá trị không phải object thì bỏ. */
export function sanitizeGameSettings(raw: unknown): Record<string, GameSetting> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out: Record<string, GameSetting> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) out[id] = sanitizeGameSetting(v);
  return out;
}

/** Tùy chọn của một trò, thiếu thì mặc định bật/auto/mix. */
export function gameSetting(games: Record<string, GameSetting> | undefined, id: string): GameSetting {
  return games?.[id] ?? DEFAULT_GAME_SETTING;
}

/**
 * Tùy chọn truyền vào trò: chủ đề trò không khai báo thì về 'mix',
 * độ khó khi trò không hỗ trợ thì về 'auto'.
 */
export function optionsFor(
  manifest: { options?: { difficulty?: boolean; topics?: Topic[] } },
  s: GameSetting,
): GameOptions {
  const difficulty = manifest.options?.difficulty ? s.difficulty : 'auto';
  const topic = s.topic !== 'mix' && manifest.options?.topics?.includes(s.topic) ? s.topic : 'mix';
  return { difficulty, topic };
}

/**
 * Chọn n món khác nhau trong pool, ưu tiên món không có trong `avoid` (trí nhớ ngắn:
 * các lượt vừa chơi). Pool không đủ món mới thì lấy thêm món cũ cho đủ.
 */
export function pickFresh<T>(pool: readonly T[], n: number, avoid: readonly T[] = [], rand: () => number = Math.random): T[] {
  const shuffle = (arr: T[]) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };
  const uniq = [...new Set(pool)];
  const fresh = shuffle(uniq.filter((x) => !avoid.includes(x)));
  const picked = fresh.slice(0, n);
  if (picked.length < n) {
    const old = shuffle(uniq.filter((x) => !picked.includes(x)));
    picked.push(...old.slice(0, n - picked.length));
  }
  return picked;
}

// Trí nhớ ngắn theo trò, sống trong phiên chạy app (ra vào trò vẫn nhớ, tải lại trang thì quên)
const RECENT = new Map<string, unknown[][]>();

/** Những món đã chọn trong vài lượt gần đây của `key` (gộp phẳng). */
export function recentPicks<T>(key: string): T[] {
  return (RECENT.get(key) ?? []).flat() as T[];
}

/** Ghi nhớ món vừa chọn cho `key`; chỉ giữ `rounds` lượt gần nhất. */
export function rememberPicks<T>(key: string, picked: readonly T[], rounds = 1): void {
  const list = [...(RECENT.get(key) ?? []), [...picked]];
  RECENT.set(key, list.slice(-Math.max(1, rounds)));
}

/** Xóa trí nhớ ngắn (dùng trong test). */
export function clearRecentPicks(): void {
  RECENT.clear();
}

/** pickFresh + nhớ luôn lượt này: món tránh là của `rounds` lượt trước. */
export function pickFreshRemembered<T>(
  key: string,
  pool: readonly T[],
  n: number,
  rounds = 1,
  rand: () => number = Math.random,
): T[] {
  const picked = pickFresh(pool, n, recentPicks<T>(key), rand);
  rememberPicks(key, picked, rounds);
  return picked;
}

/** Chủ đề nội dung dùng cho nút "Tất cả trò" (kiểu phân loại riêng của trò Xếp vào giỏ không tính). */
export const BULK_TOPICS: readonly Topic[] = ['mix', 'animals', 'fruits', 'shapes'];

type BulkGame = { id: string; options?: { difficulty?: boolean; topics?: Topic[] } };

/** Các chủ đề nhóm hiện cho "Tất cả trò": 'mix' + chủ đề nội dung có ít nhất một trò hỗ trợ. */
export function bulkTopics(games: readonly BulkGame[]): Topic[] {
  return BULK_TOPICS.filter((t) => t === 'mix' || games.some((g) => g.options?.topics?.includes(t)));
}

/**
 * Áp một lựa chọn cho mọi trò một lần (bố mẹ khỏi chỉnh từng trò):
 * - difficulty: mọi trò có tùy chọn độ khó;
 * - topic 'mix': mọi trò có chủ đề về 'mix'; topic khác: chỉ trò có chủ đề đó, trò khác giữ nguyên.
 * Không đổi trạng thái bật/tắt.
 */
export function applyToAll(
  current: Record<string, GameSetting> | undefined,
  games: readonly BulkGame[],
  patch: { difficulty?: Difficulty; topic?: Topic },
): Record<string, GameSetting> {
  const next: Record<string, GameSetting> = { ...(current ?? {}) };
  for (const g of games) {
    const s = { ...gameSetting(current, g.id) };
    let changed = false;
    if (patch.difficulty && g.options?.difficulty && s.difficulty !== patch.difficulty) {
      s.difficulty = patch.difficulty;
      changed = true;
    }
    const topics = g.options?.topics ?? [];
    if (patch.topic && topics.length > 0) {
      const t = patch.topic === 'mix' || topics.includes(patch.topic) ? patch.topic : null;
      if (t && s.topic !== t) {
        s.topic = t;
        changed = true;
      }
    }
    if (changed) next[g.id] = s;
  }
  return next;
}

/**
 * Giá trị chung đang áp cho "Tất cả trò" (để tô sáng nút), hoặc null nếu các trò đang khác nhau.
 * Chủ đề T được coi là chung khi mọi trò hỗ trợ T đang chọn T (và 'mix' khi mọi trò có chủ đề đang 'mix').
 */
export function commonDifficulty(current: Record<string, GameSetting> | undefined, games: readonly BulkGame[]): Difficulty | null {
  const ds = games.filter((g) => g.options?.difficulty).map((g) => gameSetting(current, g.id).difficulty);
  return ds.length > 0 && ds.every((d) => d === ds[0]) ? ds[0] : null;
}

export function commonTopic(current: Record<string, GameSetting> | undefined, games: readonly BulkGame[]): Topic | null {
  for (const t of bulkTopics(games)) {
    const holders = games.filter((g) => (g.options?.topics?.length ?? 0) > 0 && (t === 'mix' || g.options!.topics!.includes(t)));
    if (holders.length > 0 && holders.every((g) => gameSetting(current, g.id).topic === t)) return t;
  }
  return null;
}
