import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'sort',
  title: { vi: 'Xếp vào giỏ', ja: 'なかまわけ', en: 'Sort into baskets' },
  place: 'place.farm',
  icon: '🧺',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  order: 3,
  titleKey: 'game.sort',
  options: { difficulty: true, topics: ['colors', 'kinds', 'sizes'] },
  Component: lazy(() => import('./Game')),
};
