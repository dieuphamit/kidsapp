import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'pattern',
  title: { vi: 'Chuỗi hạt', ja: 'じゅんばん ビーズ' },
  place: 'place.orchard',
  icon: '📿',
  color: 'leaf',
  minAge: 30,
  maxAge: 72,
  order: 3,
  titleKey: 'game.pattern',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
