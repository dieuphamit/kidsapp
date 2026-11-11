import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'zoo3d',
  title: { vi: 'Sở thú', ja: 'どうぶつえん' },
  place: 'place.zoo',
  icon: '🦁',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.zoo3d',
  Component: lazy(() => import('./Game')),
};
