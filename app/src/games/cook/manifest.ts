import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'cook',
  title: { vi: 'Bếp nấu ăn', ja: 'りょうりやさん', en: 'Cooking' },
  place: 'place.house',
  icon: '🍲',
  color: 'peach',
  minAge: 24,
  maxAge: 72,
  order: 4,
  titleKey: 'game.cook',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
