import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

vi.mock('../../core/synth', () => ({ synth: { playNote: vi.fn(), playDrum: vi.fn() } }));
// jsdom không có bố cục: lưới nằm ở góc khung, toạ độ màn hình = toạ độ khung
vi.mock('../../ui/Stage', () => ({
  clientToStage: (x: number, y: number) => ({ x, y }),
  stageRect: () => ({ left: 0, top: 0, right: 696, bottom: 408, width: 696, height: 408 }),
}));

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}

describe('Đường về nhà: chạm bạn đang đi', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('chạm bạn đồng hành: nhún ngay trong pointerdown và nhắc lại việc cần làm', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const hello = screen.getByTestId('game-path').getAttribute('data-last-say')!;
    expect(hello).toMatch(/^path\.hello/);
    const before = sp.say.mock.calls.length;
    const hop = Number(screen.getByTestId('daudau').getAttribute('data-hop'));
    const cell = screen.getByTestId('daudau').parentElement!;
    fireEvent.pointerDown(cell);
    expect(Number(screen.getByTestId('daudau').getAttribute('data-hop'))).toBe(hop + 1);
    expect(sp.say).toHaveBeenCalledTimes(before + 1);
    expect(sp.say).toHaveBeenLastCalledWith(hello);
    // bạn vẫn đứng yên ở ô cũ: chạm không tính là một bước đi
    expect(screen.getByTestId('daudau').parentElement).toBe(cell);
    act(() => vi.advanceTimersByTime(5000));
    expect(sp.say).toHaveBeenCalledTimes(before + 1);
  });

  it('mức xếp lệnh (bé lớn): chạm bạn đồng hành cũng có phản hồi', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const hop = Number(screen.getByTestId('daudau').getAttribute('data-hop'));
    fireEvent.pointerDown(screen.getByTestId('daudau').parentElement!);
    expect(Number(screen.getByTestId('daudau').getAttribute('data-hop'))).toBe(hop + 1);
    expect(sp.say.mock.calls.at(-1)![0]).toMatch(/^path\.hello/);
  });
});

const walkerCell = () => screen.getByTestId('daudau').parentElement!;
const posOf = (el: Element) => ({ r: Number(el.getAttribute('data-r')), c: Number(el.getAttribute('data-c')) });
const cellEl = (r: number, c: number) => screen.getByTestId(`cell-${r}-${c}`);
const mid = (r: number, c: number) => ({ clientX: c * 144 + 60, clientY: r * 144 + 60, pointerId: 1 });
const firstHint = () => document.querySelector<HTMLElement>('[data-hint="true"]')!;

describe('Đường về nhà: chạm ô và vẽ đường', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('bé dưới 48 tháng: mặc định chạm ô; chạm ô kề thì nhảy sang ngay trong pointerdown', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    expect(screen.getByTestId('game-path').getAttribute('data-mode')).toBe('tap');
    expect(screen.getByRole('button', { name: 'Chạm ô' })).toHaveAttribute('aria-pressed', 'true');
    const from = posOf(walkerCell());
    const hint = firstHint();
    expect(hint).not.toBeNull();
    fireEvent.pointerDown(hint);
    expect(posOf(walkerCell())).toEqual(posOf(hint));
    expect(posOf(walkerCell())).not.toEqual(from);
    expect(sp.say.mock.calls.at(-1)![0]).toMatch(/^path\.(up|down|left|right)$/);
  });

  it('chạm ô xa hoặc cây: không đi, không nói gì, con vật nghiêng đầu và ô kề nhấp nháy', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    const from = posOf(walkerCell());
    const far = Array.from(document.querySelectorAll('[data-kind="grass"]')).find((el) => {
      const p = posOf(el);
      return Math.abs(p.r - from.r) + Math.abs(p.c - from.c) >= 2;
    })!;
    const calls = sp.say.mock.calls.length;
    fireEvent.pointerDown(far);
    expect(posOf(walkerCell())).toEqual(from);
    expect(sp.say).toHaveBeenCalledTimes(calls);
    expect(screen.getByTestId('daudau')).toHaveAttribute('data-puzzled');
    expect(screen.getByTestId('path-grid')).toHaveAttribute('data-nudge', 'true');
    fireEvent.pointerDown(document.querySelector('[data-kind="tree"]')!);
    expect(posOf(walkerCell())).toEqual(from);
    expect(sp.say).toHaveBeenCalledTimes(calls);
  });

  it('chạm ô tới đích: ăn mừng, nói tới nơi rồi tiếng kêu thật, sau đó sang bản đồ mới', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    let guard = 0;
    while (!document.querySelector('[data-kind="home"][data-dau]') && guard++ < 10) {
      const home = posOf(document.querySelector('[data-kind="home"]')!);
      const dist = (el: Element) => Math.abs(posOf(el).r - home.r) + Math.abs(posOf(el).c - home.c);
      const hints = Array.from(document.querySelectorAll('[data-hint="true"]')).sort((a, b) => dist(a) - dist(b));
      fireEvent.pointerDown(hints[0]);
    }
    expect(document.querySelector('[data-kind="home"][data-dau]')).not.toBeNull();
    act(() => vi.advanceTimersByTime(700));
    expect(document.querySelector('[data-kind="home"]')).toHaveAttribute('data-glow', 'true');
    expect(screen.getByTestId('daudau')).toHaveAttribute('data-cheer', 'true');
    const said = () => sp.say.mock.calls.map((c) => c[0] as string);
    expect(said().some((k) => /^path\.home/.test(k))).toBe(true);
    act(() => vi.advanceTimersByTime(10_000));
    expect(said().some((k) => /^animal\.[a-z]+-sound$/.test(k))).toBe(true);
    expect(document.querySelector('[data-kind="home"]')).not.toHaveAttribute('data-glow');
  });

  it('48–59 tháng: mặc định vẽ đường; kéo từ con vật qua ô kề → nét; kéo ngược xoá; nhả tay thì đi theo nét', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={52} onExit={() => {}} />);
    const game = screen.getByTestId('game-path');
    expect(game.getAttribute('data-mode')).toBe('draw');
    const from = posOf(walkerCell());
    const next = posOf(firstHint());
    const grid = screen.getByTestId('path-grid');
    fireEvent.pointerDown(walkerCell(), mid(from.r, from.c));
    expect(game).toHaveAttribute('data-trail-len', '1');
    fireEvent.pointerMove(grid, mid(next.r, next.c));
    expect(game).toHaveAttribute('data-trail-len', '2');
    expect(cellEl(next.r, next.c)).toHaveAttribute('data-trail', 'true');
    expect(screen.getByTestId('path-trail')).toBeInTheDocument();
    fireEvent.pointerMove(grid, mid(from.r, from.c));
    expect(game).toHaveAttribute('data-trail-len', '1');
    fireEvent.pointerMove(grid, mid(next.r, next.c));
    fireEvent.pointerUp(grid, mid(next.r, next.c));
    act(() => vi.advanceTimersByTime(50));
    expect(posOf(walkerCell())).toEqual(next);
  });

  it('vẽ vào cây: nét dừng ở ô trước đó', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={52} onExit={() => {}} />);
    const game = screen.getByTestId('game-path');
    const tree = posOf(document.querySelector('[data-kind="tree"]')!);
    const from = posOf(walkerCell());
    fireEvent.pointerDown(walkerCell(), mid(from.r, from.c));
    fireEvent.pointerMove(screen.getByTestId('path-grid'), mid(tree.r, tree.c));
    expect(cellEl(tree.r, tree.c)).not.toHaveAttribute('data-trail');
    expect(Number(game.getAttribute('data-trail-len'))).toBeGreaterThanOrEqual(1);
  });

  it('chế độ chạm ô: kéo từ con vật cũng vẽ được đường', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={() => {}} />);
    const from = posOf(walkerCell());
    const next = posOf(firstHint());
    fireEvent.pointerDown(walkerCell(), mid(from.r, from.c));
    fireEvent.pointerMove(screen.getByTestId('path-grid'), mid(next.r, next.c));
    expect(screen.getByTestId('game-path')).toHaveAttribute('data-trail-len', '2');
  });

  it('nút đổi cách chơi: nói cách chơi; mũi tên hiện dải lệnh, đưa con vật về ô xuất phát', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    const start = posOf(walkerCell());
    fireEvent.pointerDown(firstHint());
    expect(posOf(walkerCell())).not.toEqual(start);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Vẽ đường' }));
    expect(screen.getByTestId('game-path').getAttribute('data-mode')).toBe('draw');
    expect(sp.say).toHaveBeenLastCalledWith('path.mode-draw');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Mũi tên' }));
    expect(screen.getByTestId('game-path').getAttribute('data-mode')).toBe('program');
    expect(sp.say).toHaveBeenLastCalledWith('path.mode-arrows');
    expect(screen.getByTestId('slot-0')).toBeInTheDocument();
    expect(posOf(walkerCell())).toEqual(start);
    expect(document.querySelector('[data-hint="true"]')).toBeNull();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chạm ô' }));
    expect(sp.say).toHaveBeenLastCalledWith('path.mode-tap');
    expect(screen.queryByTestId('slot-0')).toBeNull();
  });

  it('từ 60 tháng: mặc định mũi tên', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={60} onExit={() => {}} />);
    expect(screen.getByTestId('game-path').getAttribute('data-mode')).toBe('program');
  });
});
