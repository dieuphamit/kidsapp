import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

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
