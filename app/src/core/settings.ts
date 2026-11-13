import { get, set } from 'idb-keyval';
import type { Lang } from './i18n';
import { sanitizeGameSettings, type GameSetting } from './gameOptions';

/** Kiểu menu chính: bản đồ 5 khu (mặc định) hoặc kệ đồ chơi một màn. */
export type MenuStyle = 'map' | 'shelf';

export interface Settings {
  lang: Lang;
  ageMonths: number;
  sessionMinutes: number;
  menuStyle: MenuStyle;
  /** Tùy chọn từng trò theo id; thiếu trò nào thì trò đó bật/auto/mix (xem gameSetting). */
  games?: Record<string, GameSetting>;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' };
const KEY = 'behoc.settings';

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(KEY);
  const s = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  // Bản lưu cũ (chưa có menuStyle) hoặc giá trị lạ thì về bản đồ
  if (s.menuStyle !== 'map' && s.menuStyle !== 'shelf') s.menuStyle = DEFAULT_SETTINGS.menuStyle;
  // Tùy chọn trò: bản cũ chưa có thì để trống; có thì vá từng mục sai về mặc định
  if (s.games !== undefined) s.games = sanitizeGameSettings(s.games);
  return s;
}

export async function saveSettings(s: Settings): Promise<void> {
  await set(KEY, s);
}
