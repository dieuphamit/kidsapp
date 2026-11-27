import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

type PuzzleHook = { solveOne(): void };

describe('Ghép hình: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/?e2e=1');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('ghép xong: khen → tên hình → câu chào ván mới, mỗi câu chờ câu trước nói xong', () => {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    expect(sp.say).toHaveBeenCalledWith('puzzle.hello');
    const hook = () => (window as unknown as { __behocPuzzle: PuzzleHook }).__behocPuzzle;
    for (let i = 0; i < 12; i++) act(() => hook().solveOne());
    act(() => vi.advanceTimersByTime(500));
    expect(chains.map((c) => c.keys)).toEqual([['puzzle.done']]);
    act(() => chains[0].done());
    expect(chains[1].keys[0]).toMatch(/^(animal|fruit|shape)\./);
    act(() => chains[1].done());
    expect(chains[2].keys).toEqual(['puzzle.hello']);
    expect(sp.say).toHaveBeenCalledTimes(1);
  });
});
