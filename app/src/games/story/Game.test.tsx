import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Game from './Game';
import type { Speaker } from '../../core/audio';

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}

describe('Kể chuyện: chạm bạn đồng hành', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nhún ngay trong pointerdown và nhắc "Tiếp theo là gì nhỉ?"', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    act(() => vi.advanceTimersByTime(30_000)); // chào, đọc tranh 1, hỏi tiếp theo
    expect(sp.say).toHaveBeenLastCalledWith('story.next');
    const before = sp.say.mock.calls.length;

    const buddy = screen.getByTestId('buddy');
    fireEvent.pointerDown(buddy);
    expect(sp.say).toHaveBeenCalledTimes(before + 1);
    expect(sp.say).toHaveBeenLastCalledWith('story.next');
    // key đổi nên ảnh được dựng lại → hoạt ảnh nhún chạy lại dù câu nói không đổi
    const again = screen.getByTestId('buddy');
    expect(again).not.toBe(buddy);
    expect(again).toHaveAttribute('data-poke', '1');

    fireEvent.pointerDown(again);
    expect(screen.getByTestId('buddy')).toHaveAttribute('data-poke', '2');
    expect(sp.say).toHaveBeenCalledTimes(before + 2);
  });

  it('css: bạn đồng hành nhận được chạm', () => {
    const css = readFileSync(join(import.meta.dirname, 'Game.module.css'), 'utf8');
    const rule = /\.daudau\s*\{([^}]*)\}/.exec(css)![1];
    expect(rule).not.toMatch(/pointer-events:\s*none/);
  });
});

describe('Chuyện ba tranh: câu sau không đè câu trước', () => {
  it('vào game: chào, câu tranh 1, câu hỏi đi chung một lượt sayThen (loa chờ câu trước hết)', () => {
    const sayThen = vi.fn((_keys: readonly string[]) => () => {});
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={48} onExit={() => {}} />);
    expect(sayThen).toHaveBeenCalledTimes(1);
    const keys = sayThen.mock.calls[0][0];
    expect(keys[0]).toBe('story.hello');
    expect(keys[1]).toMatch(/^story\.[a-z]+-1$/);
    expect(keys.at(-1)).toBe('story.next');
    expect(sp.say).not.toHaveBeenCalled();
  });
});
