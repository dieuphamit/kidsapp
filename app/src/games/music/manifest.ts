import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'music',
  title: { vi: 'Vẽ và nhạc', ja: 'おえかきとおんがく', en: 'Drawing and music' },
  place: 'place.music',
  icon: '🎵',
  color: 'lilac',
  minAge: 24,
  maxAge: 72,
  order: 0,
  Component: lazy(() => import('./Game')),
};
