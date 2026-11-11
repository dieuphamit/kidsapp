import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'shapes',
  title: { vi: 'Màu và hình', ja: 'いろとかたち' },
  place: 'place.pond',
  icon: '🔺',
  color: 'mint',
  minAge: 24,
  maxAge: 72,
  order: 0,
  Component: lazy(() => import('./Game')),
};
