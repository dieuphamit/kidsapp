import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'rescue',
  title: { vi: 'Đội cứu hộ', ja: 'レスキューたい', en: 'Rescue team' },
  place: 'place.farm',
  icon: '🚒',
  color: 'peach',
  minAge: 24,
  maxAge: 72,
  order: 2,
  titleKey: 'game.rescue',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
