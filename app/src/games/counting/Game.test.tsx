import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

/** Loa giả như loa thật: chuỗi sau chỉ bắt đầu khi gọi done() của chuỗi trước. */
function chainSpeaker() {
  const chains: { keys: readonly string[]; done(): void }[] = [];
  const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
    keys.forEach((k, i) => opts?.onSay?.(k, i));
    chains.push({ keys, done: () => opts?.onDone?.() });
    return () => {};
  });
  const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
  return { sp, chains };
}

const items = () => screen.getAllByRole('button').filter((b) => /^(Quả|Bạn|Hình) \d+$/.test(b.getAttribute('aria-label') ?? ''));

describe('Đếm: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  it('mức khó: chào + "con lấy mấy" + số đi chung một lượt sayThen', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} options={{ difficulty: 'hard', topic: 'fruits' }} onExit={() => {}} />);
    const target = screen.getByTestId('game-counting').getAttribute('data-target');
    expect(chains).toHaveLength(1);
    expect(chains[0].keys).toEqual(['count.hello', 'count.ask', `number.${target}`]);
    expect(sp.say).not.toHaveBeenCalled();
  });

  it('hái đủ: số cuối đọc xong mới khen, khen xong mới sang lượt mới', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} options={{ difficulty: 'hard', topic: 'fruits' }} onExit={() => {}} />);
    const game = screen.getByTestId('game-counting');
    const target = Number(game.getAttribute('data-target'));
    const item = game.getAttribute('data-item');
    const btns = items();
    for (let i = 0; i < target - 1; i++) fireEvent.pointerDown(btns[i]);
    // số do bé chạm: say() thường (chạm sau cắt chạm trước là đúng ý)
    expect(sp.say).toHaveBeenLastCalledWith(`number.${target - 1}`);
    fireEvent.pointerDown(btns[target - 1]);
    const n = chains.length;
    expect(chains[n - 1].keys).toEqual([`number.${target}`]);
    act(() => chains[n - 1].done());
    expect(chains[n].keys[0]).toMatch(/^count\.(all|done)$/);
    expect(game.getAttribute('data-item')).toBe(item); // chưa sang lượt khi đang khen
    act(() => chains[n].done());
    // lượt mới: món mới, gọi tên món trong chuỗi mới
    expect(chains.length).toBe(n + 2);
    expect(chains[n + 1].keys[0]).not.toMatch(/^count\.(all|done)$/);
  });
});
