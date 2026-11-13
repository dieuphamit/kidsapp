import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'counting',
  title: { vi: 'Đếm số', ja: 'かず', en: 'Counting' },
  place: 'place.orchard',
  icon: '🍎',
  color: 'leaf',
  minAge: 24,
  maxAge: 72,
  order: 0,
  options: { difficulty: true, topics: ['animals', 'fruits', 'shapes'] },
  Component: lazy(() => import('./Game')),
};
