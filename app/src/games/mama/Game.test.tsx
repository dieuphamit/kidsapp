import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';
import { soundKey } from './logic';

/** Loa giả như loa thật: chuỗi sau chỉ bắt đầu khi gọi done() của chuỗi trước. */
function chainSpeaker() {
  const chains: { keys: readonly string[]; done(): void }[] = [];
  const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
    keys.forEach((k, i) => opts?.onSay?.(k, i));
    chains.push({ keys, done: () => opts?.onDone?.() });
    return () => {};
  });
  return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
}

describe('Tìm mẹ: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  beforeEach(() => window.history.pushState({}, '', '/?e2e=1'));
  afterEach(() => window.history.pushState({}, '', '/'));

  it('câu chào (~6s) đọc xong mới hỏi con đầu tiên', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    expect(chains.map((c) => c.keys)).toEqual([['mama.hello']]);
    expect(sp.say).not.toHaveBeenCalled();
    act(() => chains[0].done());
    const baby = window.__behocMama!.turn()!.baby;
    expect(sp.say).toHaveBeenLastCalledWith(`mama.ask.${baby}`);
  });

  it('bé chạm mẹ lúc câu chào chưa xong: không hỏi chen vào tiếng kêu bé vừa chạm', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    const mama = window.__behocMama!.turn()!.mamas[0];
    fireEvent.pointerDown(screen.getByTestId(`mama-${mama}`));
    expect(sp.say).toHaveBeenLastCalledWith(soundKey(mama));
    act(() => chains[0].done()); // loa báo chuỗi chào kết thúc (bị cắt)
    expect(sp.say).toHaveBeenLastCalledWith(soundKey(mama));
  });
});
