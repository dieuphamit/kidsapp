import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'counting',
  title: { vi: 'Đếm số', ja: 'かず' },
  place: 'place.orchard',
  icon: '🍎',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  Component: lazy(() => import('./Game')),
};
