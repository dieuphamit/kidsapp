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
  order: 0,
  titleKey: 'game.farm3d',
  Component: lazy(() => import('./Game')),
};
