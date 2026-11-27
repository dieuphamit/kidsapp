import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

type SortHook = {
  fruits(): { id: string; color: string }[];
  sayFor(i: number): string;
  drop(i: number, color: string): 'ok' | 'wrong';
};

describe('Phân loại: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  beforeEach(() => window.history.pushState({}, '', '/?e2e=1'));
  afterEach(() => window.history.pushState({}, '', '/'));

  it('quả cuối: câu của quả đọc xong mới khen, khen xong mới sang lượt mới', () => {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    const hook = () => (window as unknown as { __behocSort: SortHook }).__behocSort;
    const fruits = hook().fruits();
    for (let i = 0; i < fruits.length - 1; i++) act(() => void hook().drop(i, fruits[i].color));
    const n = fruits.length - 1;
    const lastKey = hook().sayFor(n);
    act(() => void hook().drop(n, fruits[n].color));
    expect(chains.map((c) => c.keys)).toEqual([[lastKey]]);
    act(() => chains[0].done());
    expect(chains[1].keys).toEqual(['sort.done']);
    expect(screen.getByTestId('game-sort')).toHaveAttribute('data-last-say', 'sort.done');
    const before = hook().fruits();
    act(() => chains[1].done());
    expect(hook().fruits()).not.toBe(before);
  });
});
