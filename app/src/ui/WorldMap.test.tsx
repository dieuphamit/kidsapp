import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import type { GameManifest } from '../core/games';
import { lazy } from 'react';

// Mock WorldMapScene vì jsdom không có WebGL
vi.mock('./WorldMapScene', () => ({
  WorldMapScene: ({ onTapDauDau, facing }: { facing: number; onTapDauDau(): void }) => (
    <div role="img" aria-label="Đậu Đậu" data-facing={facing} data-testid="scene">
      <button data-testid="daudau" onClick={onTapDauDau}>DauDau</button>
    </div>
  ),
}));

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string, extra: Partial<GameManifest> = {}): GameManifest {
  return {
    id,
    title: { vi: 'Trò ' + id, ja: 'ゲーム' + id, en: 'Game ' + id },
    place,
    icon: '🎮',
    color: 'mint',
    minAge: 24,
    maxAge: 72,
    order: 0,
    Component: lazy(() => Promise.resolve({ default: DummyGame })),
    ...extra,
  };
}

const FIVE = [
  makeGame('z', 'place.zoo'),
  makeGame('h', 'place.house'),
  makeGame('o', 'place.orchard'),
  makeGame('p', 'place.puzzle'),
  makeGame('m', 'place.music'),
];

describe('WorldMap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('hiện đúng 5 khu theo thứ tự với tên tiếng Việt', () => {
    render(<WorldMap games={FIVE} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    const buttons = screen.getAllByRole('button', { name: /Thế giới thú|Nhà Đậu Đậu|Vườn quả|Góc đố|Nhà âm nhạc/ });
    expect(buttons.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Thế giới thú',
      'Nhà Đậu Đậu',
      'Vườn quả',
      'Góc đố',
      'Nhà âm nhạc',
    ]);
  });

  it('tên khu tiếng Nhật', () => {
    render(<WorldMap games={FIVE} lang="ja" speaker={mockSpeaker()} onPick={vi.fn()} />);
    for (const name of ['どうぶつの くに', 'ダウダウのおうち', 'かじゅえん', 'なぞなぞ コーナー', 'おんがくのいえ']) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
  });

  it('bỏ trang trại và hồ nước khỏi bản đồ', () => {
    const games = [...FIVE, makeGame('f', 'place.farm'), makeGame('w', 'place.pond')];
    render(<WorldMap games={games} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    expect(screen.queryByLabelText('Trang trại')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Hồ nước')).not.toBeInTheDocument();
  });

  it('ẩn khu không có trò', () => {
    render(<WorldMap games={[makeGame('m', 'place.music')]} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    expect(screen.getByLabelText('Nhà âm nhạc')).toBeInTheDocument();
    expect(screen.queryByLabelText('Thế giới thú')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nhà Đậu Đậu')).not.toBeInTheDocument();
  });

  it('dải icon trò trong nút khu, tối đa 4, theo order', () => {
    const games = [
      makeGame('a', 'place.zoo', { icon: '🐄', order: 0 }),
      makeGame('e', 'place.zoo', { icon: '🌳', order: 4 }),
      makeGame('b', 'place.zoo', { icon: '🦁', order: 1 }),
      makeGame('c', 'place.zoo', { icon: '🔊', order: 2 }),
      makeGame('d', 'place.zoo', { icon: '👤', order: 3 }),
      makeGame('m', 'place.music', { icon: '🎹' }),
    ];
    render(<WorldMap games={games} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    // icon khu + tên khu nằm trong nút
    expect(screen.getByLabelText('Thế giới thú')).toHaveTextContent(/^🦁Thế giới thú/);
    const strips = screen.getAllByTestId('strip');
    expect(strips[0].textContent).toBe('🐄🦁🔊👤');
    expect(strips[1].textContent).toBe('🎹');
  });

  it('chạm khu nói tên khu ngay và Đậu Đậu quay về phía khu', () => {
    const speaker = mockSpeaker();
    render(<WorldMap games={FIVE} lang="vi" speaker={speaker} onPick={vi.fn()} />);
    fireEvent.pointerDown(screen.getByLabelText('Nhà âm nhạc'));
    expect(speaker.say).toHaveBeenCalledWith('place.music');
    expect(screen.getByTestId('home')).toHaveAttribute('data-last-say', 'place.music');
    expect(screen.getByTestId('scene')).toHaveAttribute('data-facing', '1');
  });

  it('hướng quay theo cột: trái, giữa, phải', () => {
    const { unmount } = render(<WorldMap games={FIVE} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    fireEvent.pointerDown(screen.getByLabelText('Nhà Đậu Đậu'));
    expect(screen.getByTestId('scene')).toHaveAttribute('data-facing', '-1');
    unmount();
    render(<WorldMap games={FIVE} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} />);
    fireEvent.pointerDown(screen.getByLabelText('Góc đố'));
    expect(screen.getByTestId('scene')).toHaveAttribute('data-facing', '0');
  });

  it('khu 1 trò vào thẳng sau 400ms', () => {
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const music = makeGame('m', 'place.music');
    render(<WorldMap games={[music]} lang="vi" speaker={mockSpeaker()} onPick={onPick} onOpenPicker={onOpenPicker} />);
    fireEvent.pointerDown(screen.getByLabelText('Nhà âm nhạc'));
    vi.advanceTimersByTime(399);
    expect(onPick).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onPick).toHaveBeenCalledWith(music);
    expect(onOpenPicker).not.toHaveBeenCalled();
  });

  it('khu nhiều trò mở màn chọn trò sau 400ms, chạm lần hai bị bỏ qua', () => {
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const g1 = makeGame('g1', 'place.zoo');
    const g2 = makeGame('g2', 'place.zoo', { order: 1 });
    render(<WorldMap games={[g2, g1]} lang="vi" speaker={mockSpeaker()} onPick={onPick} onOpenPicker={onOpenPicker} />);
    const zoo = screen.getByLabelText('Thế giới thú');
    fireEvent.pointerDown(zoo);
    fireEvent.pointerDown(zoo);
    vi.advanceTimersByTime(399);
    expect(onOpenPicker).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onOpenPicker).toHaveBeenCalledTimes(1);
    expect(onOpenPicker).toHaveBeenCalledWith('place.zoo', [g1, g2]);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('nói ui.where khi mount và có Đậu Đậu', () => {
    const speaker = mockSpeaker();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={vi.fn()} />);
    expect(speaker.say).toHaveBeenCalledWith('ui.where');
    expect(screen.getByRole('img', { name: 'Đậu Đậu' })).toBeInTheDocument();
  });

  describe('nút chơi lại', () => {
    it('ẩn khi chưa có trò nào', () => {
      render(<WorldMap games={FIVE} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} lastGameId={null} />);
      expect(screen.queryByTestId('replay')).not.toBeInTheDocument();
    });

    it('ẩn khi trò vừa chơi không hợp tuổi (không có trong danh sách đã lọc)', () => {
      render(<WorldMap games={FIVE} lang="vi" speaker={mockSpeaker()} onPick={vi.fn()} lastGameId="peekaboo" />);
      expect(screen.queryByTestId('replay')).not.toBeInTheDocument();
    });

    it('hiện icon trò vừa chơi, chạm nói tên trò ngay rồi mở trò sau 300ms', () => {
      const speaker = mockSpeaker();
      const onPick = vi.fn();
      const onOpenPicker = vi.fn();
      const memory = makeGame('memory', 'place.puzzle', { icon: '🃏', titleKey: 'game.memory' });
      const games = [...FIVE, memory];
      render(<WorldMap games={games} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} lastGameId="memory" />);
      const replay = screen.getByTestId('replay');
      expect(replay).toHaveTextContent('🃏');
      fireEvent.pointerDown(within(replay).getByRole('button', { name: 'Trò memory' }));
      expect(speaker.say).toHaveBeenLastCalledWith('game.memory');
      vi.advanceTimersByTime(299);
      expect(onPick).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onPick).toHaveBeenCalledWith(memory);
      expect(onOpenPicker).not.toHaveBeenCalled();
    });

    it('trò không có titleKey thì nói tên khu', () => {
      const speaker = mockSpeaker();
      render(<WorldMap games={FIVE} lang="vi" speaker={speaker} onPick={vi.fn()} lastGameId="m" />);
      fireEvent.pointerDown(within(screen.getByTestId('replay')).getByRole('button'));
      expect(speaker.say).toHaveBeenLastCalledWith('place.music');
    });
  });
});
