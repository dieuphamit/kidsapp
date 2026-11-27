import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
import type { Speaker } from '../../core/audio';

// R3F không chạy trong jsdom: thay cảnh 3D bằng một div (phần 3D kiểm bằng Playwright)
vi.mock('../../ui/Scene3D', () => ({ Scene3D: () => <div data-testid="scene" /> }));

type Win = Window & {
  __behocTap?: (id: string) => void;
  __behocShapes?: () => { shapes: string[] };
};

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  window.history.replaceState({}, '', '/');
});

/** Loa giả như loa thật: chỉ báo hết tiếng khi gọi done(). */
function chainSpeaker() {
  const chains: { keys: readonly string[]; done(): void }[] = [];
  const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
    keys.forEach((k, i) => opts?.onSay?.(k, i));
    chains.push({ keys, done: () => opts?.onDone?.() });
    return () => {};
  });
  return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
}

async function load() {
  window.history.replaceState({}, '', '/?e2e=1');
  vi.resetModules();
  return (await import('./Game')).default;
}

describe('Hồ hình khối: lời nói nối tiếp', () => {
  it('chạm hình: màu và tên hình đi chung một lượt sayThen (tên hình không cắt màu)', async () => {
    const Game = await load();
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    const w = window as Win;
    const shape = w.__behocShapes!().shapes[0];
    act(() => w.__behocTap!(shape));
    const last = chains.at(-1)!;
    expect(last.keys).toHaveLength(2);
    expect(last.keys[0]).toMatch(/^color\./);
    expect(last.keys[1]).toBe(`shape.${shape}`);
    expect(sp.say).not.toHaveBeenCalled();
  }, 30_000);

  it('câu nhắc kéo chờ câu chào (dài ~6s) đọc xong, không cắt ngang', async () => {
    const Game = await load();
    vi.useFakeTimers();
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    expect(chains.map((c) => c.keys)).toEqual([['pond.hello']]);
    act(() => vi.advanceTimersByTime(4500));
    expect(chains).toHaveLength(1);
    act(() => chains[0].done());
    expect(chains[1].keys).toEqual(['pond.drag-hint']);
  }, 30_000);

  it('bé chạm hình lúc câu chào chưa xong: câu nhắc kéo không cắt màu/tên hình, chờ chuỗi đó xong', async () => {
    const Game = await load();
    vi.useFakeTimers();
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    act(() => vi.advanceTimersByTime(4500));
    const w = window as Win;
    act(() => w.__behocTap!(w.__behocShapes!().shapes[0]));
    const color = chains[1];
    act(() => chains[0].done()); // loa báo câu chào bị cắt
    expect(chains).toHaveLength(2);
    act(() => color.done());
    expect(chains[2].keys).toEqual(['pond.drag-hint']);
  }, 30_000);
});

