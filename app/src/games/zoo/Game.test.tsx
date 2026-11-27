import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup, screen } from '@testing-library/react';
import type { Speaker } from '../../core/audio';

// R3F không chạy trong jsdom: thay cảnh 3D bằng một div (phần 3D kiểm bằng Playwright)
vi.mock('../../ui/Scene3D', () => ({ Scene3D: () => <div data-testid="scene" /> }));

declare global {
  interface Window {
    __behocTap?: (id: string) => void;
  }
}

afterEach(() => {
  cleanup();
  window.history.replaceState({}, '', '/');
});

describe('Sở thú: tên, tiếng kêu, câu vui nói nối tiếp', () => {
  it('chạm thú: ba câu đi chung một lượt sayThen (câu sau không cắt câu trước)', async () => {
    window.history.replaceState({}, '', '/?e2e=1&seed=7');
    vi.resetModules();
    const { default: Game } = await import('./Game');
    const sayThen = vi.fn((_keys: readonly string[]) => () => {});
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    expect(sp.say).toHaveBeenCalledWith('zoo.hello');
    const id = screen.getByTestId('game-zoo').getAttribute('data-visible-animals')!.split(',')[0];
    act(() => window.__behocTap?.(id));
    expect(sayThen).toHaveBeenCalledTimes(1);
    expect(sayThen.mock.calls[0][0]).toEqual([`animal.${id}`, `animal.${id}-sound`, `animal.${id}-fact`]);
    expect(sp.say).toHaveBeenCalledTimes(1);
  }, 30_000); // nạp lại module 3D (three) sau resetModules chậm trên máy này
});
