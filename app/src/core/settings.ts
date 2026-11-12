import { get, set } from 'idb-keyval';
import type { Lang } from './i18n';

/** Kiểu menu chính: bản đồ 5 khu (mặc định) hoặc kệ đồ chơi một màn. */
export type MenuStyle = 'map' | 'shelf';

export interface Settings {
  lang: Lang;
  ageMonths: number;
  sessionMinutes: number;
  menuStyle: MenuStyle;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'vi', ageMonths: 28, sessionMinutes: 15, menuStyle: 'map' };
const KEY = 'behoc.settings';

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(KEY);
  const s = { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
  // Bản lưu cũ (chưa có menuStyle) hoặc giá trị lạ thì về bản đồ
  if (s.menuStyle !== 'map' && s.menuStyle !== 'shelf') s.menuStyle = DEFAULT_SETTINGS.menuStyle;
  return s;
}

export async function saveSettings(s: Settings): Promise<void> {
  await set(KEY, s);
}
