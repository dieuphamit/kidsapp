import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'coloring',
  title: { vi: 'Tô màu', ja: 'ぬりえ', en: 'Coloring' },
  place: 'place.music',
  icon: '🖍️',
  color: 'lilac',
  minAge: 24,
  maxAge: 72,
  order: 2,
  titleKey: 'game.coloring',
  Component: lazy(() => import('./Game')),
};
