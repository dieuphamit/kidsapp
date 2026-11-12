import type { ClayColor } from './tokens';

export type Place = {
  key: string;
  icon: string;
  color: ClayColor;
};

/** 5 khu theo thứ tự cố định, dùng chung cho bản đồ và kệ đồ chơi. */
export const PLACES: readonly Place[] = [
  { key: 'place.zoo', icon: '🦁', color: 'peach' },
  { key: 'place.house', icon: '🏠', color: 'butter' },
  { key: 'place.orchard', icon: '🍎', color: 'leaf' },
  { key: 'place.puzzle', icon: '🧩', color: 'mint' },
  { key: 'place.music', icon: '🎵', color: 'lilac' },
];

/** Chỉ số khu trong PLACES; khu lạ xếp cuối. */
export function placeOrder(key: string): number {
  const i = PLACES.findIndex((p) => p.key === key);
  return i < 0 ? PLACES.length : i;
}

export function placeByKey(key: string): Place | undefined {
  return PLACES.find((p) => p.key === key);
}
