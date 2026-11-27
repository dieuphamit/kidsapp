import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { lazy } from 'react';
import type { GameManifest } from '../core/games';
import type { Speaker } from '../core/audio';
import { TrainMenu } from './TrainMenu';
import { ShelfMenu } from './ShelfMenu';
import { GamePicker } from './GamePicker';
import { WorldMap } from './WorldMap';
import { SAY_GO_MAX_MS } from './useSayThen';

vi.mock('./WorldMapScene', () => ({ WorldMapScene: () => <div data-testid="scene" /> }));

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string, titleKey?: string): GameManifest {
  return {
    id,
    title: { vi: `Trò ${id}`, ja: `ゲーム ${id}`, en: `Game ${id}` },
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

/** Loa giả như loa thật: chỉ báo hết tiếng khi gọi done(). */
function chainSpeaker() {
  const chains: { keys: readonly string[]; done(): void }[] = [];
  const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
    keys.forEach((k, i) => opts?.onSay?.(k, i));
    chains.push({ keys, done: () => opts?.onDone?.() });
    return () => {};
  });
  return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
}

/** Bấm thì tên đọc trong một lượt sayThen; chưa đọc xong thì chưa mở (dù đã quá mức chờ cũ), xong thì mở. */
function expectOpensAfterName(chains: { keys: readonly string[]; done(): void }[], key: string, opened: () => number) {
  const c = chains.at(-1)!;
  expect(c.keys).toEqual([key]);
  act(() => {
    vi.advanceTimersByTime(1000);
  });
  expect(opened()).toBe(0);
  act(() => c.done());
  expect(opened()).toBe(1);
}

describe('Menu đọc tên trò/khu xong mới mở (câu chào của trò không cắt tên)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('đoàn tàu', () => {
    const { sp, chains } = chainSpeaker();
    const onPick = vi.fn();
    render(<TrainMenu games={[makeGame('a', 'place.zoo', 'game.a')]} lang="vi" speaker={sp} onPick={onPick} />);
    const play = screen.getByRole('button', { name: 'Trò a' });
    fireEvent.pointerDown(play);
    fireEvent.pointerUp(play);
    expectOpensAfterName(chains, 'game.a', () => onPick.mock.calls.length);
  });

  it('kệ đồ chơi', () => {
    const { sp, chains } = chainSpeaker();
    const onPick = vi.fn();
    render(<ShelfMenu games={[makeGame('a', 'place.zoo', 'game.a')]} lang="vi" speaker={sp} onPick={onPick} />);
    const card = screen.getByRole('button', { name: 'Trò a' });
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(card);
    expectOpensAfterName(chains, 'game.a', () => onPick.mock.calls.length);
  });

  it('bảng chọn trò', () => {
    const { sp, chains } = chainSpeaker();
    const onPick = vi.fn();
    const games = [makeGame('a', 'place.zoo', 'game.a'), makeGame('b', 'place.zoo', 'game.b')];
    render(<GamePicker placeKey="place.zoo" games={games} lang="vi" speaker={sp} onPick={onPick} onBack={vi.fn()} />);
    const card = screen.getByRole('button', { name: 'Trò a' });
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(card);
    expectOpensAfterName(chains, 'game.a', () => onPick.mock.calls.length);
  });

  it('bản đồ: khu nhiều trò đọc tên khu xong mới mở bảng chọn trò', () => {
    const { sp, chains } = chainSpeaker();
    const onOpenPicker = vi.fn();
    const games = [makeGame('a', 'place.zoo'), makeGame('b', 'place.zoo')];
    render(<WorldMap games={games} lang="vi" speaker={sp} onPick={vi.fn()} onOpenPicker={onOpenPicker} />);
    fireEvent.pointerDown(screen.getByLabelText('Thế giới thú'));
    expectOpensAfterName(chains, 'place.zoo', () => onOpenPicker.mock.calls.length);
  });

  it('loa không báo hết tiếng (file lỗi / âm thanh bị khoá): vẫn mở sau tối đa SAY_GO_MAX_MS', () => {
    const { sp, chains } = chainSpeaker();
    const onPick = vi.fn();
    render(<ShelfMenu games={[makeGame('a', 'place.zoo', 'game.a')]} lang="vi" speaker={sp} onPick={onPick} />);
    const card = screen.getByRole('button', { name: 'Trò a' });
    fireEvent.pointerDown(card);
    fireEvent.pointerUp(card);
    expect(chains.at(-1)!.keys).toEqual(['game.a']);
    act(() => {
      vi.advanceTimersByTime(SAY_GO_MAX_MS);
    });
    expect(onPick).toHaveBeenCalledTimes(1);
    act(() => chains.at(-1)!.done());
    expect(onPick).toHaveBeenCalledTimes(1);
  });
});
