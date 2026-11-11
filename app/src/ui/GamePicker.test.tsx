import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GamePicker } from './GamePicker';
import type { GameManifest } from '../core/games';
import { lazy } from 'react';

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string, titleKey?: string): GameManifest {
  return {
    id,
    title: { vi: `Trò ${id}`, ja: `ゲーム ${id}` },
    place,
    icon: '🎮',
    color: 'mint',
    minAge: 24,
    maxAge: 72,
    order: 0,
    titleKey,
    Component: lazy(() => Promise.resolve({ default: DummyGame })),
  };
}

describe('GamePicker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiện tiêu đề địa điểm và 2 nút trò chơi', () => {
    const speaker = mockSpeaker();
    const games = [
      makeGame('game1', 'place.farm'),
      makeGame('game2', 'place.farm'),
    ];
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(screen.getByText('Trang trại')).toBeInTheDocument();
    expect(screen.getByLabelText('Trò game1')).toBeInTheDocument();
    expect(screen.getByLabelText('Trò game2')).toBeInTheDocument();
  });

  it('gọi speaker.say ui.pick-game khi mount', () => {
    const speaker = mockSpeaker();
    const games = [makeGame('game1', 'place.farm')];
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    expect(speaker.say).toHaveBeenCalledWith('ui.pick-game');
  });

  it('chạm nút trò chơi gọi speaker.say và onPick sau 400ms', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const games = [
      makeGame('game1', 'place.farm', 'game.farm3d'),
      makeGame('game2', 'place.farm'),
    ];
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={onPick}
        onBack={vi.fn()}
      />,
    );

    const game1Btn = screen.getByLabelText('Trò game1');
    fireEvent.pointerDown(game1Btn);

    // say được gọi với titleKey
    expect(speaker.say).toHaveBeenCalledWith('game.farm3d');
    expect(onPick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(500);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(games[0]);
  });

  it('chạm nút trò chơi không có titleKey thì dùng place làm key nói', () => {
    const speaker = mockSpeaker();
    const games = [makeGame('game2', 'place.farm')]; // không có titleKey
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    fireEvent.pointerDown(screen.getByLabelText('Trò game2'));
    expect(speaker.say).toHaveBeenCalledWith('place.farm');
  });

  it('có nút quay lại gọi onBack', () => {
    const speaker = mockSpeaker();
    const onBack = vi.fn();
    const games = [makeGame('game1', 'place.farm')];
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={vi.fn()}
        onBack={onBack}
      />,
    );

    const backBtn = screen.getByLabelText('Đậu Đậu');
    fireEvent.pointerDown(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('có data-testid game-picker và data-last-say', () => {
    const speaker = mockSpeaker();
    const games = [makeGame('game1', 'place.farm')];
    render(
      <GamePicker
        placeKey="place.farm"
        games={games}
        lang="vi"
        speaker={speaker}
        onPick={vi.fn()}
        onBack={vi.fn()}
      />,
    );

    const picker = screen.getByTestId('game-picker');
    expect(picker).toBeInTheDocument();
    expect(picker).toHaveAttribute('data-last-say', 'ui.pick-game');
  });
});
