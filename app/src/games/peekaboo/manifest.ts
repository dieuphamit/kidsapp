import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'peekaboo',
  title: { vi: 'Ú òa', ja: 'いないいないばあ', en: 'Peekaboo' },
  place: 'place.zoo',
  icon: '🌳',
  color: 'leaf',
  minAge: 24,
  maxAge: 60,
  order: 4,
  titleKey: 'game.peekaboo',
  Component: lazy(() => import('./Game')),
};
