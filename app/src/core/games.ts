import type { ComponentType, LazyExoticComponent } from 'react';
import type { Lang } from './i18n';
import type { ClayColor } from './tokens';
import type { Speaker } from './audio';

export interface GameProps {
  lang: Lang;
  speaker: Speaker;
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
  Component: LazyExoticComponent<ComponentType<GameProps>>;
}

const modules = import.meta.glob<{ manifest: GameManifest }>('../games/*/manifest.ts', { eager: true });

export const ALL_GAMES: GameManifest[] = Object.values(modules)
  .map((m) => m.manifest)
  .sort((a, b) => a.id.localeCompare(b.id));

export function gamesForAge(games: GameManifest[], ageMonths: number): GameManifest[] {
  return games.filter((g) => ageMonths >= g.minAge && ageMonths <= g.maxAge);
}
