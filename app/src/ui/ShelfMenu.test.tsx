import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { lazy } from 'react';
import { ShelfMenu, shelfOrder } from './ShelfMenu';
import { ALL_GAMES, gamesForAge, type GameManifest } from '../core/games';
import { placeOrder } from '../core/places';

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string, order = 0, titleKey?: string): GameManifest {
  return {
    id,
    title: { vi: `Trò ${id}`, ja: `ゲーム ${id}`, en: `Game ${id}` },
    place,
    icon: '🎮',
    color: 'mint',
    minAge: 24,
    maxAge: 72,
    order,
    titleKey,
    Component: lazy(() => Promise.resolve({ default: DummyGame })),
  };
}

function renderShelf(games: GameManifest[], over: Partial<Parameters<typeof ShelfMenu>[0]> = {}) {
  const props = { games, lang: 'vi' as const, speaker: mockSpeaker(), onPick: vi.fn(), ...over };
  render(<ShelfMenu {...props} />);
  return props;
}

function cardIds(): string[] {
  return screen.getAllByTestId(/^shelf-card-/).map((c) => c.getAttribute('data-testid')!.slice('shelf-card-'.length));
}

describe('ShelfMenu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('số thẻ bằng số trò hợp tuổi', () => {
    for (const age of [24, 28, 66]) {
      const games = gamesForAge(ALL_GAMES, age);
      const { unmount } = render(
        <ShelfMenu games={games} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />,
      );
      expect(screen.getAllByTestId(/^shelf-card-/)).toHaveLength(games.length);
      unmount();
    }
  });

  it('xếp theo thứ tự khu rồi order, rồi id', () => {
    renderShelf([
      makeGame('m', 'place.music'),
      makeGame('z2', 'place.zoo', 2),
      makeGame('o1', 'place.orchard', 1),
      makeGame('z0', 'place.zoo', 0),
      makeGame('pb', 'place.puzzle'),
      makeGame('pa', 'place.puzzle'),
      makeGame('h', 'place.house'),
    ]);
    expect(cardIds()).toEqual(['z0', 'z2', 'h', 'o1', 'pa', 'pb', 'm']);
  });

  it('trò thật xếp theo khu không giảm dần', () => {
    const sorted = shelfOrder(gamesForAge(ALL_GAMES, 66));
    const orders = sorted.map((g) => placeOrder(g.place));
    expect([...orders].sort((a, b) => a - b)).toEqual(orders);
  });

  it('thẻ 132px nền màu khu, chỉ có icon; 6 cột', () => {
    renderShelf([makeGame('z', 'place.zoo'), makeGame('m', 'place.music')]);
    const btn = screen.getByRole('button', { name: 'Trò z' });
    expect(btn.style.width).toBe('132px');
    expect(btn.style.background).toBe('var(--clay-peach)');
    expect(btn).toHaveTextContent(/^🎮$/);
    expect(screen.getByRole('button', { name: 'Trò m' }).style.background).toBe('var(--clay-lilac)');
    expect(screen.getByTestId('shelf')).toHaveAttribute('data-cols', '6');
  });

  it('hơn 18 trò thì thẻ 120px, 7 cột', () => {
    const many = Array.from({ length: 19 }, (_, i) => makeGame(`g${String(i).padStart(2, '0')}`, 'place.zoo'));
    renderShelf(many);
    expect(screen.getByRole('button', { name: 'Trò g00' }).style.width).toBe('120px');
    expect(screen.getByTestId('shelf')).toHaveAttribute('data-cols', '7');
  });

  it('nói ui.pick-game khi vào, có Đậu Đậu và bong bóng', () => {
    const { speaker } = renderShelf([makeGame('z', 'place.zoo')]);
    expect(speaker.say).toHaveBeenCalledWith('ui.pick-game');
    const shelf = screen.getByTestId('shelf');
    expect(shelf).toHaveAttribute('data-last-say', 'ui.pick-game');
    expect(screen.getByText('Bé chơi trò nào?')).toBeInTheDocument();
    expect(shelf.querySelector('img')?.getAttribute('src')).toMatch(/cards\/daudau\.png$/);
  });

  it('không có nút Về nhà', () => {
    renderShelf([makeGame('z', 'place.zoo')]);
    expect(screen.queryByLabelText('Về nhà')).toBeNull();
    expect(screen.queryByLabelText('Đậu Đậu')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });

  it('chạm thẻ nói titleKey ngay, gọi onPick sau 300ms, chạm thêm bị bỏ qua', () => {
    const games = [makeGame('a', 'place.zoo', 0, 'game.a'), makeGame('b', 'place.zoo', 1)];
    const { speaker, onPick } = renderShelf(games);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò a' }));
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò b' }));
    expect(speaker.say).toHaveBeenLastCalledWith('game.a');
    expect(screen.getByTestId('shelf')).toHaveAttribute('data-last-say', 'game.a');
    vi.advanceTimersByTime(299);
    expect(onPick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(games[0]);
  });

  it('thẻ không có titleKey thì nói tên khu', () => {
    const { speaker } = renderShelf([makeGame('x', 'place.orchard')]);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò x' }));
    expect(speaker.say).toHaveBeenLastCalledWith('place.orchard');
  });

  it('tiếng Nhật: nhãn thẻ và bong bóng', () => {
    renderShelf([makeGame('z', 'place.zoo')], { lang: 'ja' });
    expect(screen.getByRole('button', { name: 'ゲーム z' })).toBeInTheDocument();
    expect(screen.getByText('どれで あそぶ?')).toBeInTheDocument();
  });
});
