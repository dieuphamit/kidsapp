import { useSyncExternalStore } from 'react';
import { get, set } from 'idb-keyval';

/**
 * Tùy chọn "Trang trí theo mùa" của bố mẹ: tự động (theo ngày) hoặc tắt.
 * Lưu riêng một key idb (không nằm trong Settings) để phần cài đặt chung không phải đổi.
 */
export type SeasonPref = 'auto' | 'off';
export const DEFAULT_SEASON_PREF: SeasonPref = 'auto';
const KEY = 'behoc.season';

let value: SeasonPref = DEFAULT_SEASON_PREF;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function sanitizeSeasonPref(v: unknown): SeasonPref {
  return v === 'off' ? 'off' : 'auto';
}

export async function loadSeasonPref(): Promise<SeasonPref> {
  try {
    value = sanitizeSeasonPref(await get(KEY));
  } catch {
    value = DEFAULT_SEASON_PREF; // không đọc được bộ nhớ: giữ mặc định
  }
  emit();
  return value;
}

export async function saveSeasonPref(next: SeasonPref): Promise<void> {
  value = next;
  emit();
  try {
    await set(KEY, next);
  } catch {
    /* không lưu được (chế độ riêng tư): vẫn dùng trong phiên này */
  }
}

export function getSeasonPref(): SeasonPref {
  return value;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

/** Hook đọc tùy chọn, tự cập nhật khi bố mẹ đổi. */
export function useSeasonPref(): SeasonPref {
  return useSyncExternalStore(subscribe, getSeasonPref, getSeasonPref);
}
