import { lazy } from 'react';
import type { GameManifest } from '../../core/games';

export const manifest: GameManifest = {
  id: 'hide',
  // {name}: tên bạn đồng hành đang chọn (màn hiển thị thay bằng fillName)
  title: { vi: '{name} trốn ở đâu?', ja: '{name} どこかな?', en: 'Where is {name}?' },
  place: 'place.house',
  icon: '📦',
  color: 'butter',
  minAge: 24,
  maxAge: 72,
  order: 0,
  titleKey: 'game.hide',
  options: { difficulty: true },
  Component: lazy(() => import('./Game')),
};
