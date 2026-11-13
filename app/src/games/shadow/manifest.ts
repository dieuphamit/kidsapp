import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'shadow',
  title: { vi: 'Bóng của ai?', ja: 'だれの かげ?' },
  place: 'place.zoo',
  icon: '👤',
  color: 'lilac',
  minAge: 28,
  maxAge: 72,
  order: 3,
  titleKey: 'game.shadow',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
