import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'puzzle',
  title: { vi: 'Ghép hình', ja: 'パズル', en: 'Puzzle' },
  place: 'place.puzzle',
  icon: '🧩',
  color: 'lilac',
  minAge: 24,
  maxAge: 72,
  order: 1,
  titleKey: 'game.puzzle',
  options: { difficulty: true, topics: ['animals', 'fruits'] },
  Component: lazy(() => import('./Game')),
};
