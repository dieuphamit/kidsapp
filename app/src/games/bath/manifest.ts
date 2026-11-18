import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'bath',
  title: { vi: 'Tắm cho thú', ja: 'どうぶつ おふろ', en: 'Bath time' },
  place: 'place.pond',
  icon: '🛁',
  color: 'mint',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.bath',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
