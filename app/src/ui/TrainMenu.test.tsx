import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { lazy } from 'react';
import {
  TrainMenu, TRAIN_PICK_DELAY_MS, WHISTLE_SFX, initialPlace, sceneSeason, trainPlaces, trainLayout,
  TRAIN_LEFT, TRAIN_RIGHT, CAR_MAX_W, CAR_MIN_W, ENGINE_W, ENGINE_MIN_W,
} from './TrainMenu';
import { ALL_GAMES, gamesForAge, type GameManifest } from '../core/games';
import { PLACES } from '../core/places';

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

const GAMES = [
  makeGame('a', 'place.zoo', 1, 'game.a'),
  makeGame('b', 'place.zoo', 0),
  makeGame('c', 'place.music'),
  makeGame('d', 'place.farm'),
];

function renderTrain(games = GAMES, over: Partial<Parameters<typeof TrainMenu>[0]> = {}) {
  const props = { games, lang: 'vi' as const, speaker: mockSpeaker(), onPick: vi.fn(), ...over };
  render(<TrainMenu {...props} />);
  return props;
}

const carIds = () => screen.getAllByTestId(/^train-car-/).map((c) => c.getAttribute('data-testid')!.slice('train-car-'.length));

describe('TrainMenu', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('mở ra: Đậu Đậu chào, còi tàu kêu, khu đầu tiên có trò đang chọn', () => {
    const { speaker } = renderTrain();
    expect(speaker.say).toHaveBeenCalledWith('ui.train-hello');
    expect(speaker.sfx).toHaveBeenCalledWith(WHISTLE_SFX);
    expect(screen.getByTestId('train-menu')).toHaveAttribute('data-place', 'place.zoo');
    expect(screen.getByRole('button', { name: 'Thế giới thú' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Tu tu! Lên tàu nào! Bé chọn toa nào?')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Đậu Đậu' })).toBeInTheDocument();
  });

  it('mỗi toa một trò của khu, theo order; nút ▶ mang tên trò', () => {
    renderTrain();
    expect(carIds()).toEqual(['b', 'a']);
    expect(screen.getByRole('button', { name: 'Trò a' })).toBeInTheDocument();
  });

  it('thanh tab chỉ có khu có trò, theo thứ tự PLACES, mọi tab ≥120px', () => {
    renderTrain();
    const tabs = screen.getAllByTestId(/^train-tab-/).map((t) => t.getAttribute('data-testid'));
    expect(tabs).toEqual(['train-tab-zoo', 'train-tab-music', 'train-tab-farm']);
    for (const t of screen.getAllByTestId(/^train-tab-/)) {
      const btn = t.querySelector('button')!;
      expect(parseInt(btn.style.width)).toBeGreaterThanOrEqual(120);
      expect(parseInt(btn.style.height)).toBeGreaterThanOrEqual(120);
    }
  });

  it('chạm tab: nói tên khu, còi tàu, đoàn tàu mới của khu đó', () => {
    const speaker = mockSpeaker();
    renderTrain(GAMES, { speaker });
    speaker.sfx.mockClear();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Nhà âm nhạc' }));
    expect(speaker.say).toHaveBeenLastCalledWith('place.music');
    expect(speaker.sfx).toHaveBeenCalledWith(WHISTLE_SFX);
    expect(screen.getByTestId('train-menu')).toHaveAttribute('data-place', 'place.music');
    expect(carIds()).toEqual(['c']);
    expect(screen.getByRole('button', { name: 'Nhà âm nhạc' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('train')).toHaveAttribute('data-moving', 'true');
  });

  it('chạm lại tab đang chọn chỉ nói tên khu, không đổi tàu', () => {
    const speaker = mockSpeaker();
    renderTrain(GAMES, { speaker });
    speaker.sfx.mockClear();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Thế giới thú' }));
    expect(speaker.say).toHaveBeenLastCalledWith('place.zoo');
    expect(speaker.sfx).not.toHaveBeenCalled();
  });

  it('chạm ▶ của toa: nói tên trò, chờ rồi mở trò; chỉ mở một lần', () => {
    const { speaker, onPick } = renderTrain();
    const play = screen.getByRole('button', { name: 'Trò a' });
    fireEvent.pointerDown(play);
    fireEvent.pointerUp(play);
    expect(speaker.say).toHaveBeenLastCalledWith('game.a');
    expect(screen.getByTestId('train-menu')).toHaveAttribute('data-last-say', 'game.a');
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Trò b' }));
    fireEvent.pointerUp(screen.getByRole('button', { name: 'Trò b' }));
    act(() => { vi.advanceTimersByTime(TRAIN_PICK_DELAY_MS); });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(GAMES[0]);
  });

  it('trò không có titleKey thì nói tên khu', () => {
    const { speaker } = renderTrain();
    const play = screen.getByRole('button', { name: 'Trò b' });
    fireEvent.pointerDown(play);
    fireEvent.pointerUp(play);
    expect(speaker.say).toHaveBeenLastCalledWith('place.zoo');
  });

  it('mở ở khu của trò vừa chơi', () => {
    renderTrain(GAMES, { lastGameId: 'd' });
    expect(screen.getByTestId('train-menu')).toHaveAttribute('data-place', 'place.farm');
  });

  it('tiếng Nhật: tên khu và câu chào theo ngôn ngữ', () => {
    renderTrain(GAMES, { lang: 'ja' });
    expect(screen.getByRole('button', { name: 'どうぶつの くに' })).toBeInTheDocument();
    expect(screen.getByText('ポッポー! きしゃに のろう! どの しゃりょうに する?')).toBeInTheDocument();
  });

  it('mọi trò thật hợp tuổi đều có toa ở đúng một khu', () => {
    for (const age of [24, 28, 66]) {
      const games = gamesForAge(ALL_GAMES, age);
      const places = trainPlaces(games);
      expect(places.flatMap((p) => p.games.map((g) => g.id)).sort()).toEqual(games.map((g) => g.id).sort());
      expect(places.length).toBeLessThanOrEqual(PLACES.length);
    }
  });
});

describe('trainLayout', () => {
  it('tới 4 trò: cả đoàn tàu vừa khung, chừa 144px mép phải; toa đủ rộng cho nút ▶ 120 và khe 24', () => {
    for (let n = 1; n <= 4; n++) {
      const l = trainLayout(n);
      expect(l.overflow, `${n}`).toBe(false);
      expect(TRAIN_LEFT + l.width, `${n}`).toBeLessThanOrEqual(TRAIN_RIGHT);
      expect(l.engineW).toBe(ENGINE_W);
      expect(l.carW).toBeLessThanOrEqual(CAR_MAX_W);
      expect(l.carW).toBeGreaterThanOrEqual(CAR_MIN_W);
      // khe giữa hai nút ▶ của hai toa kề nhau
      expect(l.carW + l.coupler - 120).toBeGreaterThanOrEqual(24);
    }
    expect(trainLayout(1).carW).toBe(CAR_MAX_W);
    expect(trainLayout(4).carW).toBeGreaterThan(170);
  });

  it('càng nhiều trò toa càng hẹp; chật thì thu đầu tàu trước khi báo tràn', () => {
    const widths = [1, 2, 3, 4, 5, 6].map((n) => trainLayout(n).carW);
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeLessThanOrEqual(widths[i - 1]);
    const five = trainLayout(5);
    expect(five.overflow).toBe(false);
    expect(TRAIN_LEFT + five.width).toBeLessThanOrEqual(TRAIN_RIGHT);
    const many = trainLayout(9);
    expect(many.overflow).toBe(true);
    expect(many.engineW).toBe(ENGINE_MIN_W);
    expect(many.carW).toBe(CAR_MIN_W);
    expect(TRAIN_LEFT + many.width).toBeGreaterThan(TRAIN_RIGHT);
  });

  it('khu quá nhiều trò: vùng tàu báo tràn (tự chạy qua lại) và vẫn có đủ toa', () => {
    const many = Array.from({ length: 9 }, (_, i) => makeGame(`z${i}`, 'place.zoo', i));
    renderTrain(many);
    expect(screen.getByTestId('train-viewport')).toHaveAttribute('data-overflow', 'true');
    expect(carIds()).toHaveLength(9);
  });

  it('khu ít trò: không tràn, toa mang cỡ của trainLayout', () => {
    renderTrain();
    expect(screen.getByTestId('train-viewport')).not.toHaveAttribute('data-overflow');
    expect(screen.getByTestId('train').style.getPropertyValue('--car-w')).toBe(`${trainLayout(2).carW}px`);
  });
});

describe('initialPlace / sceneSeason', () => {
  it('khu của trò vừa chơi, không có thì khu đầu', () => {
    const places = trainPlaces(GAMES);
    expect(initialPlace(places, 'c')).toBe('place.music');
    expect(initialPlace(places, 'zzz')).toBe('place.zoo');
    expect(initialPlace(places, null)).toBe('place.zoo');
    expect(initialPlace([], null)).toBeUndefined();
  });

  it('mùa phong cảnh theo tháng', () => {
    expect(sceneSeason(new Date(2026, 2, 1))).toBe('spring');
    expect(sceneSeason(new Date(2026, 5, 1))).toBe('summer');
    expect(sceneSeason(new Date(2026, 9, 1))).toBe('autumn');
    expect(sceneSeason(new Date(2026, 11, 1))).toBe('winter');
    expect(sceneSeason(new Date(2026, 0, 1))).toBe('winter');
  });
});
