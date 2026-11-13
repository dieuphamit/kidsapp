import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'bakery',
  title: { vi: 'Tiệm bánh', ja: 'ケーキやさん', en: 'Bakery' },
  place: 'place.house',
  icon: '🎂',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  order: 2,
  titleKey: 'game.bakery',
  Component: lazy(() => import('./Game')),
};
