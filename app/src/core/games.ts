import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from './i18n';
import type { ClayColor } from './tokens';
import type { Speaker } from './audio';

export interface GameProps {
  lang: Lang;
  speaker: Speaker;
  ageMonths: number;
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
