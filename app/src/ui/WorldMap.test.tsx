import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import type { GameManifest } from '../core/games';
import { lazy } from 'react';

// Mock WorldMapScene vì jsdom không có WebGL
vi.mock('./WorldMapScene', () => ({
  WorldMapScene: ({ onTapDauDau }: { target: number; onTapDauDau(): void }) => (
    <div role="img" aria-label="Đậu Đậu" onClick={onTapDauDau}>
      <button data-testid="daudau" onClick={onTapDauDau}>DauDau</button>
    </div>
  ),
}));

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(id: string, place: string): GameManifest {
  return {
    id,
    title: { vi: 'Game ' + id, ja: 'ゲーム' + id },
    place,
    icon: '🎮',
    color: 'mint',
    minAge: 24,
    maxAge: 72,
    order: 0,
    Component: lazy(() => Promise.resolve({ default: DummyGame })),
  };
}

describe('WorldMap', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('render 4 nút địa điểm có game với tên tiếng Việt', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const games = [
      makeGame('farm', 'place.farm'),
      makeGame('pond', 'place.pond'),
      makeGame('orchard', 'place.orchard'),
      makeGame('music', 'place.music'),
    ];
    render(<WorldMap games={games} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    expect(screen.getByLabelText('Trang trại')).toBeInTheDocument();
    expect(screen.getByLabelText('Hồ nước')).toBeInTheDocument();
    expect(screen.getByLabelText('Vườn quả')).toBeInTheDocument();
    expect(screen.getByLabelText('Nhà âm nhạc')).toBeInTheDocument();
  });

  it('render 6 nút địa điểm có game với tên tiếng Nhật', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const games = [
      makeGame('farm', 'place.farm'),
      makeGame('pond', 'place.pond'),
      makeGame('orchard', 'place.orchard'),
      makeGame('music', 'place.music'),
      makeGame('zoo', 'place.zoo'),
      makeGame('house', 'place.house'),
    ];
    render(<WorldMap games={games} lang="ja" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    expect(screen.getByLabelText('まきば')).toBeInTheDocument();
    expect(screen.getByLabelText('いけ')).toBeInTheDocument();
    expect(screen.getByLabelText('かじゅえん')).toBeInTheDocument();
    expect(screen.getByLabelText('おんがくのいえ')).toBeInTheDocument();
    expect(screen.getByLabelText('どうぶつえん')).toBeInTheDocument();
    expect(screen.getByLabelText('ダウダウのおうち')).toBeInTheDocument();
  });

  it('ẩn địa điểm không có game nào', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    // Chỉ có game cho farm và pond
    const games = [
      makeGame('farm', 'place.farm'),
      makeGame('pond', 'place.pond'),
    ];
    render(<WorldMap games={games} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    expect(screen.getByLabelText('Trang trại')).toBeInTheDocument();
    expect(screen.getByLabelText('Hồ nước')).toBeInTheDocument();
    expect(screen.queryByLabelText('Vườn quả')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nhà âm nhạc')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Sở thú')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Nhà Đậu Đậu')).not.toBeInTheDocument();
  });

  it('gọi speaker.say với place key khi pointerDown vào địa điểm', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const games = [makeGame('pond', 'place.pond')];
    render(<WorldMap games={games} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    const pondBtn = screen.getByLabelText('Hồ nước');
    fireEvent.pointerDown(pondBtn);

    expect(speaker.say).toHaveBeenCalledWith('place.pond');
  });

  it('gọi onPick với game sau 800ms nếu địa điểm có 1 game', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const farmGame = makeGame('farm', 'place.farm');
    render(<WorldMap games={[farmGame]} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    const farmBtn = screen.getByLabelText('Trang trại');
    fireEvent.pointerDown(farmBtn);

    expect(speaker.say).toHaveBeenCalledWith('place.farm');
    expect(onPick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);
    expect(onPick).toHaveBeenCalledWith(farmGame);
    expect(onOpenPicker).not.toHaveBeenCalled();
  });

  it('gọi onOpenPicker sau 800ms nếu địa điểm có >= 2 game', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    const farmGame1 = makeGame('farm1', 'place.farm');
    const farmGame2 = makeGame('farm2', 'place.farm');
    render(<WorldMap games={[farmGame1, farmGame2]} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    const farmBtn = screen.getByLabelText('Trang trại');
    fireEvent.pointerDown(farmBtn);

    expect(speaker.say).toHaveBeenCalledWith('place.farm');
    expect(onPick).not.toHaveBeenCalled();
    expect(onOpenPicker).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);
    expect(onPick).not.toHaveBeenCalled();
    expect(onOpenPicker).toHaveBeenCalledTimes(1);
    expect(onOpenPicker).toHaveBeenCalledWith('place.farm', [farmGame1, farmGame2]);
  });

  it('gọi speaker.say ui.where khi mount', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    expect(speaker.say).toHaveBeenCalledWith('ui.where');
  });

  it('hiện Đậu Đậu với role img', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const onOpenPicker = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} onOpenPicker={onOpenPicker} />);

    expect(screen.getByRole('img', { name: 'Đậu Đậu' })).toBeInTheDocument();
  });
});
