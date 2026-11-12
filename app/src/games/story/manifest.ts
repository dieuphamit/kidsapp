import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'story',
  title: { vi: 'Chuyện ba tranh', ja: 'おはなし ならべ' },
  place: 'place.house',
  icon: '📖',
  color: 'butter',
  minAge: 30,
  maxAge: 72,
  order: 1,
  titleKey: 'game.story',
  Component: lazy(() => import('./Game')),
};
