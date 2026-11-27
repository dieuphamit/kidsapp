import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, cleanup } from '@testing-library/react';
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

describe('Trang trại: tên rồi tiếng kêu nói nối tiếp', () => {
  it('chạm con vật: tên và tiếng kêu thật đi chung một lượt sayThen (tiếng kêu không cắt tên)', async () => {
    window.history.replaceState({}, '', '/?e2e=1');
    vi.resetModules();
    const { default: Game } = await import('./Game');
    const sayThen = vi.fn((_keys: readonly string[]) => () => {});
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    expect(sp.say).toHaveBeenCalledWith('farm.hello');
    act(() => window.__behocTap?.('cow'));
    expect(sayThen).toHaveBeenCalledTimes(1);
    expect(sayThen.mock.calls[0][0]).toEqual(['animal.cow', 'animal.cow-sound']);
    // không có say() riêng nào cho tên/tiếng kêu chen vào
    expect(sp.say).toHaveBeenCalledTimes(1);
  }, 30_000); // nạp lại module 3D (three) sau resetModules chậm trên máy này
});
