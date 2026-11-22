import { get, set } from 'idb-keyval';
import type { Lang } from './i18n';
import { sanitizeGameSettings, type GameSetting } from './gameOptions';
import { DEFAULT_BUDDY, sanitizeBuddy, type Buddy } from './buddy';

/** Kiểu menu chính: đoàn tàu (mặc định), bản đồ các khu hoặc kệ đồ chơi một màn. */
export type MenuStyle = 'train' | 'map' | 'shelf';
export const MENU_STYLES: readonly MenuStyle[] = ['train', 'map', 'shelf'];

export interface Settings {
  lang: Lang;
  ageMonths: number;
  sessionMinutes: number;
  menuStyle: MenuStyle;
  /** Tùy chọn từng trò theo id; thiếu trò nào thì trò đó bật/auto/mix (xem gameSetting). */
  games?: Record<string, GameSetting>;
  /** Bạn đồng hành: con vật và tên, chọn độc lập (mặc định mèo + Đậu Đậu). */
  buddy: Buddy;
  /** Chế độ nhẹ nhàng: nhỏ tiếng hơn, giọng đọc chậm hơn, bớt hiệu ứng nhấp nháy/ăn mừng. */
  calm: boolean;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'train', buddy: DEFAULT_BUDDY, calm: false };
const KEY = 'behoc.settings';

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(KEY);
  const s = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  // Bản lưu cũ (chưa có menuStyle) hoặc giá trị lạ thì về đoàn tàu; đã chọn bản đồ/kệ thì giữ nguyên
  if (!MENU_STYLES.includes(s.menuStyle)) s.menuStyle = DEFAULT_SETTINGS.menuStyle;
  // Tùy chọn trò: bản cũ chưa có thì để trống; có thì vá từng mục sai về mặc định
  if (s.games !== undefined) s.games = sanitizeGameSettings(s.games);
  // Bạn đồng hành: bản cũ chưa có hoặc giá trị lạ thì về mèo + Đậu Đậu (từng phần)
  s.buddy = sanitizeBuddy(s.buddy);
  // Chế độ nhẹ nhàng: bản cũ chưa có hoặc giá trị lạ thì tắt
  s.calm = s.calm === true;
  return s;
}

export async function saveSettings(s: Settings): Promise<void> {
  await set(KEY, s);
}
