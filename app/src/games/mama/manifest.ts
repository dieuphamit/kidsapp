import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'mama',
  title: { vi: 'Mẹ ơi, con đâu?', ja: 'ママは どこ?', en: "Where's my mommy?" },
  place: 'place.farm',
  icon: '🐣',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.mama',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
