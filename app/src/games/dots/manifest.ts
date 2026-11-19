import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'dots',
  title: { vi: 'Nối điểm', ja: 'てんつなぎ', en: 'Connect the dots' },
  place: 'place.puzzle',
  icon: '✏️',
  color: 'butter',
  minAge: 30,
  maxAge: 72,
  order: 3,
  titleKey: 'game.dots',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
