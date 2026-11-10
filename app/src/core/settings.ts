import { get, set } from 'idb-keyval';
import type { Lang } from './i18n';

export interface Settings {
  lang: Lang;
  ageMonths: number;
  sessionMinutes: number;
}

export const DEFAULT_SETTINGS: Settings = { lang: 'vi', ageMonths: 28, sessionMinutes: 15 };
const KEY = 'behoc.settings';

export async function loadSettings(): Promise<Settings> {
  const saved = await get<Partial<Settings>>(KEY);
  return { ...DEFAULT_SETTINGS, ...(saved ?? {}) };
}

export async function saveSettings(s: Settings): Promise<void> {
  await set(KEY, s);
}
