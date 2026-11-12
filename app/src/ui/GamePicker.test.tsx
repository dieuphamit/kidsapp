import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePicker } from './GamePicker';
import type { GameManifest } from '../core/games';
import { lazy } from 'react';

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string, titleKey?: string, icon = '🎮'): GameManifest {
  return {
    id,
    title: { vi: `Trò ${id}`, ja: `ゲーム ${id}` },
    place,
    icon,
    color: 'mint',
    minAge: 24,
    maxAge: 72,
    order: 0,
    titleKey,
    Component: lazy(() => Promise.resolve({ default: DummyGame })),
  };
}

const ZOO = [
  makeGame('animals', 'place.zoo', 'game.farm3d', '🐄'),
  makeGame('zoo3d', 'place.zoo', 'game.zoo3d', '🦁'),
  makeGame('sound-quiz', 'place.zoo', 'game.sound-quiz', '🔊'),
  makeGame('shadow', 'place.zoo', 'game.shadow', '👤'),
  makeGame('peekaboo', 'place.zoo', 'game.peekaboo', '🌳'),
];

function renderPicker(games: GameManifest[], over: Partial<Parameters<typeof GamePicker>[0]> = {}) {
  const props = {
    placeKey: 'place.zoo',
    games,
    lang: 'vi' as const,
    speaker: mockSpeaker(),
    onPick: vi.fn(),
    onBack: vi.fn(),
    ...over,
  };
  render(<GamePicker {...props} />);
  return props;
}

describe('GamePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('bong bóng tên khu có icon khu và 5 thẻ trò theo thứ tự', () => {
    renderPicker(ZOO);
    const heading = screen.getByRole('heading');
    expect(heading).toHaveTextContent('🦁');
    expect(heading).toHaveTextContent('Thế giới thú');
    const cards = screen.getAllByTestId(/^pick-/);
    expect(cards.map((c) => c.getAttribute('data-testid'))).toEqual([
      'pick-animals',
      'pick-zoo3d',
      'pick-sound-quiz',
      'pick-shadow',
      'pick-peekaboo',
    ]);
    for (const g of ZOO) {
      const btn = screen.getByRole('button', { name: g.title.vi });
      expect(btn).toHaveTextContent(g.icon);
      expect(btn).toHaveTextContent(g.title.vi);
    }
  });

  it('tên tiếng Nhật', () => {
    renderPicker(ZOO, { lang: 'ja' });
    expect(screen.getByRole('heading')).toHaveTextContent('どうぶつの くに');
    expect(screen.getByLabelText('ゲーム animals')).toBeInTheDocument();
  });

  it('nói ui.pick-game khi vào và hiện Đậu Đậu kèm câu hỏi', () => {
    const { speaker } = renderPicker(ZOO);
    expect(speaker.say).toHaveBeenCalledWith('ui.pick-game');
    expect(screen.getByTestId('game-picker')).toHaveAttribute('data-last-say', 'ui.pick-game');
    expect(screen.getByText('Bé chơi trò nào?')).toBeInTheDocument();
    const img = screen.getByTestId('game-picker').querySelector('img');
    expect(img?.getAttribute('src')).toMatch(/cards\/daudau\.png$/);
  });

  it('chạm thẻ nói titleKey ngay và mở trò sau 300ms, chạm thêm bị bỏ qua', () => {
    const { speaker, onPick } = renderPicker(ZOO);
    fireEvent.pointerDown(screen.getByLabelText('Trò shadow'));
    fireEvent.pointerDown(screen.getByLabelText('Trò zoo3d'));
    expect(speaker.say).toHaveBeenLastCalledWith('game.shadow');
    expect(screen.getByTestId('game-picker')).toHaveAttribute('data-last-say', 'game.shadow');
    vi.advanceTimersByTime(299);
    expect(onPick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(ZOO[3]);
  });

  it('thẻ không có titleKey thì nói tên khu', () => {
    const { speaker } = renderPicker([makeGame('x', 'place.zoo')]);
    fireEvent.pointerDown(screen.getByLabelText('Trò x'));
    expect(speaker.say).toHaveBeenLastCalledWith('place.zoo');
  });

  it('nút quay lại gọi onBack', () => {
    const { onBack } = renderPicker(ZOO);
    fireEvent.pointerDown(screen.getByLabelText('Đậu Đậu'));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
