/** Độ khó bố mẹ chọn cho một trò; 'auto' là theo tuổi thật của bé. */
export type Difficulty = 'auto' | 'easy' | 'medium' | 'hard';
/** Chủ đề nội dung; 'mix' là trộn như mặc định của trò. */
export type Topic = 'mix' | 'animals' | 'fruits' | 'shapes';

export const DIFFICULTIES: readonly Difficulty[] = ['auto', 'easy', 'medium', 'hard'];
export const TOPICS: readonly Topic[] = ['mix', 'animals', 'fruits', 'shapes'];

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
