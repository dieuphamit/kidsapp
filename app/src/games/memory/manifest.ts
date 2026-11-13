import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'memory',
  title: { vi: 'Lật hình', ja: 'おなじの さがし', en: 'Flip and match' },
  place: 'place.puzzle',
  icon: '🃏',
  color: 'lilac',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.memory',
  Component: lazy(() => import('./Game')),
};
