import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'sort',
  title: { vi: 'Xếp quả theo màu', ja: 'いろわけ' },
  place: 'place.orchard',
  icon: '🧺',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  order: 1,
  titleKey: 'game.sort',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
