import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'shapes',
  title: { vi: 'Màu và hình', ja: 'いろとかたち', en: 'Colors and shapes' },
  place: 'place.orchard',
  icon: '🔺',
  color: 'mint',
  minAge: 24,
  maxAge: 72,
  order: 2,
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
