import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorldMap } from './WorldMap';
import type { GameManifest } from '../core/games';
import { lazy } from 'react';

// Mock @react-three/fiber vì jsdom không có WebGL
vi.mock('@react-three/fiber', () => ({
  useFrame: vi.fn(),
}));

// Mock Scene3D and DauDau vì jsdom không có WebGL
vi.mock('./Scene3D', () => ({
  Scene3D: ({ children, label }: { children: React.ReactNode; label: string }) => (
    <div role="img" aria-label={label}>{children}</div>
  ),
}));

vi.mock('./DauDau', () => ({
  DauDau: ({ onTap }: { onTap(): void }) => (
    <button data-testid="daudau" onClick={onTap}>DauDau</button>
  ),
}));

function mockSpeaker() {
  return { say: vi.fn(), sfx: vi.fn() };
}

const DummyGame = () => <div>Game</div>;
function makeGame(place: string): GameManifest {
  return {
    id: place.replace('place.', ''),
    title: { vi: 'Game ' + place, ja: 'ゲーム' + place },
    place,
    icon: '🎮',
    color: 'mint',
    minAge: 24,
    maxAge: 72,
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

  it('render 4 nút địa điểm với tên tiếng Việt', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} />);

    expect(screen.getByLabelText('Trang trại')).toBeInTheDocument();
    expect(screen.getByLabelText('Hồ nước')).toBeInTheDocument();
    expect(screen.getByLabelText('Vườn quả')).toBeInTheDocument();
    expect(screen.getByLabelText('Nhà âm nhạc')).toBeInTheDocument();
  });

  it('render 4 nút địa điểm với tên tiếng Nhật', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="ja" speaker={speaker} onPick={onPick} />);

    expect(screen.getByLabelText('まきば')).toBeInTheDocument();
    expect(screen.getByLabelText('いけ')).toBeInTheDocument();
    expect(screen.getByLabelText('かじゅえん')).toBeInTheDocument();
    expect(screen.getByLabelText('おんがくのいえ')).toBeInTheDocument();
  });

  it('gọi speaker.say với place key khi pointerDown vào địa điểm', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} />);

    const pondBtn = screen.getByLabelText('Hồ nước');
    fireEvent.pointerDown(pondBtn);

    expect(speaker.say).toHaveBeenCalledWith('place.pond');
  });

  it('gọi onPick với game sau 800ms nếu địa điểm có game', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    const farmGame = makeGame('place.farm');
    render(<WorldMap games={[farmGame]} lang="vi" speaker={speaker} onPick={onPick} />);

    const farmBtn = screen.getByLabelText('Trang trại');
    fireEvent.pointerDown(farmBtn);

    expect(speaker.say).toHaveBeenCalledWith('place.farm');
    expect(onPick).not.toHaveBeenCalled();

    vi.advanceTimersByTime(900);
    expect(onPick).toHaveBeenCalledWith(farmGame);
  });

  it('không gọi onPick nếu địa điểm không có game', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} />);

    const farmBtn = screen.getByLabelText('Trang trại');
    fireEvent.pointerDown(farmBtn);

    vi.advanceTimersByTime(2000);
    expect(onPick).not.toHaveBeenCalled();
  });

  it('gọi speaker.say ui.where khi mount', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} />);

    expect(speaker.say).toHaveBeenCalledWith('ui.where');
  });

  it('hiện Đậu Đậu với role img', () => {
    const speaker = mockSpeaker();
    const onPick = vi.fn();
    render(<WorldMap games={[]} lang="vi" speaker={speaker} onPick={onPick} />);

    expect(screen.getByRole('img', { name: 'Đậu Đậu' })).toBeInTheDocument();
  });
});
