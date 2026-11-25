import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { clearRecentPicks } from '../../core/gameOptions';
import type { Speaker } from '../../core/audio';

vi.mock('idb-keyval', () => ({ get: vi.fn(async () => undefined), set: vi.fn(async () => {}) }));

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}
const said = (sp: ReturnType<typeof speaker>) => sp.say.mock.calls.map((c) => c[0] as string);

/** Vào trò (bé nhỏ: 2 cặp), chờ hết lúc xem trước; trả về các thẻ gom theo hình. */
async function open(sp: Speaker) {
  const view = render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
  await act(async () => {}); // đọc cấp đã lưu
  act(() => vi.advanceTimersByTime(2100));
  const cards = [...screen.getByTestId('game-memory').querySelectorAll('[data-flipped]')];
  const byId = new Map<string, Element[]>();
  for (const c of cards) {
    const id = c.querySelector('img')!.getAttribute('alt')!;
    byId.set(id, [...(byId.get(id) ?? []), c]);
  }
  return { ...view, pairs: [...byId.values()] };
}

describe('Lật hình', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    clearRecentPicks();
  });
  afterEach(() => vi.useRealTimers());

  it('lật đúng cặp: đọc tên thẻ, rồi "Giống nhau rồi!"; xong ván thì khen và sang ván mới', async () => {
    const sp = speaker();
    const { pairs } = await open(sp);
    expect(pairs).toHaveLength(2);
    expect(said(sp)).toEqual(['memory.hello']);
    fireEvent.pointerDown(pairs[0][0]);
    fireEvent.pointerDown(pairs[0][1]);
    expect(sp.say).not.toHaveBeenLastCalledWith('memory.match'); // tên thẻ trước
    act(() => vi.advanceTimersByTime(1500));
    expect(sp.say).toHaveBeenLastCalledWith('memory.match');
    fireEvent.pointerDown(pairs[1][0]);
    fireEvent.pointerDown(pairs[1][1]);
    act(() => vi.advanceTimersByTime(2500));
    expect(said(sp).slice(-2)).toEqual(['memory.match', 'memory.done']);
    act(() => vi.advanceTimersByTime(3000)); // khen xong, nghỉ, dựng ván mới
    act(() => vi.advanceTimersByTime(1000));
    expect(sp.say).toHaveBeenLastCalledWith('memory.hello'); // ván mới
  });

  it('thoát trò giữa chừng (vừa lật đúng cặp cuối): không còn tiếng nào phát nữa', async () => {
    const sp = speaker();
    const { pairs, unmount } = await open(sp);
    fireEvent.pointerDown(pairs[0][0]);
    fireEvent.pointerDown(pairs[0][1]);
    act(() => vi.advanceTimersByTime(1500));
    fireEvent.pointerDown(pairs[1][0]);
    fireEvent.pointerDown(pairs[1][1]);
    const n = sp.say.mock.calls.length;
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sp.say).toHaveBeenCalledTimes(n);
  });

  it('thoát trò ngay khi vừa vào: câu chào hẹn giờ cũng không phát', async () => {
    const sp = speaker();
    const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    await act(async () => {});
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sp.say).not.toHaveBeenCalled();
  });
});
