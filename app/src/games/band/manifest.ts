import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'band',
  title: { vi: 'Ban nhạc thú', ja: 'どうぶつ バンド', en: 'Animal band' },
  place: 'place.music',
  icon: '🥁',
  color: 'lilac',
  minAge: 24,
  maxAge: 72,
  order: 1,
  titleKey: 'game.band',
  Component: lazy(() => import('./Game')),
};
