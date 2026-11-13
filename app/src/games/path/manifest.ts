import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'path',
  title: { vi: 'Đường về nhà', ja: 'おうちへ かえろう', en: 'The way home' },
  place: 'place.puzzle',
  icon: '🗺️',
  color: 'mint',
  minAge: 36,
  maxAge: 72,
  order: 2,
  titleKey: 'game.path',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
