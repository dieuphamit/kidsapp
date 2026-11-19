import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'words',
  title: { vi: 'Đồ vật quanh bé', ja: 'みのまわりの もの', en: 'Things around me' },
  place: 'place.house',
  icon: '🧸',
  color: 'mint',
  minAge: 24,
  maxAge: 72,
  order: 3,
  titleKey: 'game.words',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
