import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'animals',
  title: { vi: 'Con vật', ja: 'どうぶつ' },
  place: 'place.farm',
  icon: '🐄',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  Component: lazy(() => import('./Game')),
};
