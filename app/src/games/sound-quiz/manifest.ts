import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'sound-quiz',
  title: { vi: 'Ai kêu đấy?', ja: 'だれの こえ?' },
  place: 'place.zoo',
  icon: '🔊',
  color: 'peach',
  minAge: 24,
  maxAge: 72,
  order: 2,
  titleKey: 'game.sound-quiz',
  Component: lazy(() => import('./Game')),
};
