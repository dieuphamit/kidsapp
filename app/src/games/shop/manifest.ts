import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'shop',
  title: { vi: 'Cửa hàng', ja: 'おみせやさん', en: 'The shop' },
  place: 'place.orchard',
  icon: '🛒',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  order: 4,
  titleKey: 'game.shop',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
