import { describe, it, expect, vi, beforeAll, beforeEach, afterEach, afterAll } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { clearRecentPicks } from '../../core/gameOptions';
import type { Speaker } from '../../core/audio';

type Hook = { answer(): string; sayKey(): string; drop(id: string): void };
const hook = () => (window as unknown as { __behocShadow: Hook }).__behocShadow;

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}
const said = (sp: ReturnType<typeof speaker>) => sp.say.mock.calls.map((c) => c[0] as string);

let Game: typeof import('./Game').default;

describe('Bóng của ai?', () => {
  beforeAll(async () => {
    // móc e2e (__behocShadow) bật theo ?e2e=1 lúc nạp module
    window.history.pushState({}, '', '?e2e=1');
    Game = (await import('./Game')).default;
  });
  afterAll(() => window.history.pushState({}, '', '/'));
  beforeEach(() => {
    vi.useFakeTimers();
    clearRecentPicks();
  });
  afterEach(() => vi.useRealTimers());

  it('ghép đúng: đọc tên hình, rồi khen, rồi sang ván mới', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    expect(sp.say.mock.calls[0][0]).toMatch(/^shadow\.hello(-thing)?$/);
    const first = hook().answer();
    const name = hook().sayKey();
    act(() => hook().drop(first));
    expect(sp.say).toHaveBeenLastCalledWith(name);
    act(() => vi.advanceTimersByTime(900));
    expect(said(sp).slice(-2)).toEqual([name, 'ui.great']);
    expect(screen.getByTestId('shadow')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4000));
    expect(hook().answer()).not.toBe(first);
  });

  it('thoát trò ngay sau khi ghép đúng: không còn tiếng nào phát nữa', () => {
    const sp = speaker();
    const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const answer = hook().answer();
    act(() => hook().drop(answer));
    const n = sp.say.mock.calls.length;
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sp.say).toHaveBeenCalledTimes(n);
  });

  it('thoát trò lúc đã khen xong, đang chờ ván mới: không còn tiếng nào phát nữa', () => {
    const sp = speaker();
    const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    act(() => hook().drop(hook().answer()));
    act(() => vi.advanceTimersByTime(1000));
    expect(sp.say).toHaveBeenLastCalledWith('ui.great');
    const n = sp.say.mock.calls.length;
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sp.say).toHaveBeenCalledTimes(n);
  });
});
