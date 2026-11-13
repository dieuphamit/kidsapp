import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'world',
  title: { vi: 'Khám phá thế giới', ja: 'せかいを たんけん', en: 'Explore the world' },
  place: 'place.zoo',
  icon: '🌍',
  color: 'mint',
  minAge: 24,
  maxAge: 72,
  // trò đầu tiên của Thế giới thú
  order: -1,
  titleKey: 'game.world',
  Component: lazy(() => import('./Game')),
};
