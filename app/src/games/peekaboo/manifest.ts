import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'peekaboo',
  title: { vi: 'Ú òa', ja: 'いないいないばあ', en: 'Peekaboo' },
  place: 'place.pond',
  icon: '🌳',
  color: 'leaf',
  minAge: 24,
  maxAge: 60,
  order: 1,
  titleKey: 'game.peekaboo',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
