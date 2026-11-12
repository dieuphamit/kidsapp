import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'hide',
  title: { vi: 'Đậu Đậu trốn ở đâu?', ja: 'ダウダウ どこかな?' },
  place: 'place.house',
  icon: '📦',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.hide',
  Component: lazy(() => import('./Game')),
};
