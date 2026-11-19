import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'feed',
  title: { vi: 'Cho thú ăn', ja: 'ごはん あげよう', en: 'Feed the animals' },
  place: 'place.farm',
  icon: '🥕',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  order: 1,
  titleKey: 'game.feed',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
