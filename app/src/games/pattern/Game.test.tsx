import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import Game from './Game';
import type { Speaker } from '../../core/audio';

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}
const said = (sp: ReturnType<typeof speaker>) => sp.say.mock.calls.map((c) => c[0] as string);

describe('Chuỗi hạt: chạm bạn đồng hành', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('nhún ngay trong pointerdown rồi đọc lại chuỗi hạt và hỏi "Tiếp theo là …?"', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={48} onExit={() => {}} />);
    expect(said(sp)).toEqual(['pattern.hello']);
    act(() => vi.advanceTimersByTime(20_000)); // đọc xong chuỗi đầu, đang chờ bé chọn
    const firstRead = said(sp).slice(1);
    expect(firstRead.at(-1)).toMatch(/^pattern\.next/);
    const before = sp.say.mock.calls.length;

    const buddy = screen.getByTestId('buddy');
    const poke = Number(buddy.getAttribute('data-poke'));
    fireEvent.pointerDown(buddy);
    const after = screen.getByTestId('buddy');
    expect(Number(after.getAttribute('data-poke'))).toBe(poke + 1);
    expect(after).toHaveAttribute('data-talking'); // chạy lại hoạt ảnh nhún
    act(() => vi.advanceTimersByTime(20_000));
    expect(said(sp).slice(before)).toEqual(firstRead);
  });

  it('css: bạn đồng hành nhận được chạm', () => {
    const css = readFileSync(join(import.meta.dirname, 'Game.module.css'), 'utf8');
    const rule = /\.mascot\s*\{([^}]*)\}/.exec(css)![1];
    expect(rule).not.toMatch(/pointer-events:\s*none/);
  });
});
