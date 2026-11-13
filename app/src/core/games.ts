import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from './i18n';
import type { ClayColor } from './tokens';
import type { Speaker } from './audio';
import { gameSetting, type GameOptions, type GameSetting, type Topic } from './gameOptions';

export interface GameProps {
  lang: Lang;
  speaker: Speaker;
  /** Tuổi đã quy theo độ khó bố mẹ chọn (effectiveAge), không hẳn là tuổi thật. */
  ageMonths: number;
  /** Tùy chọn bố mẹ chỉnh; trò cũ có thể bỏ qua. Thiếu thì coi như auto/mix. */
  options?: GameOptions;
  onExit(): void;
}

export interface GameManifest {
  id: string;
  title: { vi: string; ja: string };
  place: string; // key content của tên địa điểm, ví dụ "place.farm"
  icon: string;
  color: ClayColor;
  minAge: number; // tháng
  maxAge: number; // tháng
  order?: number; // thứ tự trong địa điểm, mặc định 0
  titleKey?: string; // key content cho tên trò, dùng trong GamePicker
  /** Tùy chọn trò hỗ trợ: difficulty = có logic theo tuổi; topics = chủ đề có nội dung. */
  options?: { difficulty?: boolean; topics?: Topic[] };
  Component: LazyExoticComponent<ComponentType<GameProps>>;
}

const modules = import.meta.glob<{ manifest: GameManifest }>('../games/*/manifest.ts', { eager: true });

export const ALL_GAMES: GameManifest[] = Object.values(modules)
  .map((m) => m.manifest)
  .sort((a, b) => a.id.localeCompare(b.id));

export function gamesForAge(games: GameManifest[], ageMonths: number): GameManifest[] {
  return games.filter((g) => ageMonths >= g.minAge && ageMonths <= g.maxAge);
}

/**
 * Trò hiện trên menu (bản đồ, kệ, màn chọn trò): hợp tuổi và không bị bố mẹ tắt.
 * Không bao giờ rỗng vì tắt: nếu mọi trò hợp tuổi đều tắt thì trả lại danh sách hợp tuổi.
 * Khu không còn trò nào bật thì tự ẩn (WorldMap/ShelfMenu chỉ vẽ khu có trò).
 */
export function visibleGames(
  games: GameManifest[],
  ageMonths: number,
  settings: Record<string, GameSetting> | undefined,
): GameManifest[] {
  const forAge = gamesForAge(games, ageMonths);
  const enabled = forAge.filter((g) => gameSetting(settings, g.id).enabled);
  return enabled.length > 0 ? enabled : forAge;
}

/**
 * Gom game theo địa điểm, sắp theo order rồi id.
 */
export function gamesByPlace(games: GameManifest[]): Map<string, GameManifest[]> {
  const map = new Map<string, GameManifest[]>();
  for (const g of games) {
    const list = map.get(g.place);
    if (list) {
      list.push(g);
    } else {
      map.set(g.place, [g]);
    }
  }
  // Sắp xếp mỗi list theo order (mặc định 0) rồi id
  for (const list of map.values()) {
    list.sort((a, b) => {
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.id.localeCompare(b.id);
    });
  }
  return map;
}
