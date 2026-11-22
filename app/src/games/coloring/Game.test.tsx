import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';

const store = new Map<string, unknown>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: unknown) => {
    store.set(k, v);
  }),
}));
vi.mock('./sound', () => ({ playPop: vi.fn() }));

import { set } from 'idb-keyval';
import Game from './Game';
import { playPop } from './sound';
import { pictureById, picturesOf } from './pictures';
import type { Speaker } from '../../core/audio';

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

/** Bút màu bấm khi nhả tay (cột màu cuộn được). */
function choose(label: string) {
  const btn = screen.getByLabelText(label);
  fireEvent.pointerDown(btn);
  fireEvent.pointerUp(btn);
}

async function flush() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('Tô màu', () => {
  beforeEach(() => {
    store.clear();
    vi.mocked(set).mockClear();
    vi.mocked(playPop).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it('vào trò: chào, phòng vẽ có 4 giá vẽ nhóm thú và 7 tab nhóm; chạm tab đổi nhóm và đọc tên nhóm', async () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    await flush();
    expect(sp.say).toHaveBeenCalledWith('coloring.hello');
    for (const p of picturesOf('animals')) expect(screen.getByTestId(`easel-${p.id}`)).toBeInTheDocument();
    expect(screen.getAllByTestId(/^tab-/)).toHaveLength(7);
    fireEvent.pointerDown(screen.getByLabelText('Dưới biển'));
    expect(sp.say).toHaveBeenLastCalledWith('coloring.group.sea');
    expect(screen.getByTestId('easel-whale')).toBeInTheDocument();
    expect(screen.queryByTestId('easel-pig')).toBeNull();
  });

  it('chọn tranh, chọn màu, chạm vùng là đổ màu ngay + bụp; hoàn tác/làm lại; lưu máy', async () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    await flush();
    fireEvent.pointerDown(screen.getByLabelText('Bạn heo con!'));
    const game = screen.getByTestId('game-coloring');
    expect(game).toHaveAttribute('data-screen', 'paint');
    expect(sp.say).toHaveBeenLastCalledWith('coloring.pic.pig');

    choose('Màu hồng');
    expect(sp.say).toHaveBeenLastCalledWith('color.pink');
    expect(game).toHaveAttribute('data-color', 'pink');

    fireEvent.pointerDown(screen.getByTestId('region-head'), { clientX: 600, clientY: 400 });
    expect(screen.getByTestId('region-head')).toHaveAttribute('data-fill', 'pink');
    expect(playPop).toHaveBeenCalledTimes(1);
    expect(set).toHaveBeenLastCalledWith('behoc.coloring', { pig: { head: 'pink' } });

    choose('Màu cầu vồng!');
    fireEvent.pointerDown(screen.getByTestId('region-snout'));
    expect(screen.getByTestId('region-snout')).toHaveAttribute('data-fill', 'rainbow');

    fireEvent.pointerDown(screen.getByLabelText('Hoàn tác'));
    expect(screen.getByTestId('region-snout')).toHaveAttribute('data-fill', '');
    expect(screen.getByTestId('region-head')).toHaveAttribute('data-fill', 'pink');
    fireEvent.pointerDown(screen.getByLabelText('Làm lại'));
    expect(screen.getByTestId('region-snout')).toHaveAttribute('data-fill', 'rainbow');
    expect(set).toHaveBeenLastCalledWith('behoc.coloring', { pig: { head: 'pink', snout: 'rainbow' } });

    // Về giá vẽ: tranh nhỏ hiện bản đã tô
    fireEvent.pointerDown(screen.getByLabelText('Về giá vẽ'));
    expect(game).toHaveAttribute('data-screen', 'pick');
    expect(screen.getByTestId('easel-pig')).toHaveAttribute('data-filled', '2');
  });

  it('tô hết mọi vùng: ăn mừng và khen; tô lại không ăn mừng lần nữa', async () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    await flush();
    vi.useFakeTimers();
    fireEvent.pointerDown(screen.getByLabelText('Bạn gấu!'));
    const bear = pictureById('bear')!;
    for (const r of bear.regions) fireEvent.pointerDown(screen.getByTestId(`region-${r.id}`));
    const game = screen.getByTestId('game-coloring');
    expect(game).toHaveAttribute('data-done', '');
    expect(screen.getByTestId('coloring-party')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(600));
    expect(sp.say).toHaveBeenLastCalledWith('coloring.done');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.queryByTestId('coloring-party')).toBeNull();
  });

  it('đọc lại tranh đã lưu', async () => {
    store.set('behoc.coloring', { pig: { head: 'blue', 'ear-l': 'red' } });
    render(<Game lang="vi" speaker={speaker()} ageMonths={36} onExit={() => {}} />);
    await flush();
    await flush();
    expect(screen.getByTestId('easel-pig')).toHaveAttribute('data-filled', '2');
    fireEvent.pointerDown(screen.getByLabelText('Bạn heo con!'));
    expect(screen.getByTestId('region-head')).toHaveAttribute('data-fill', 'blue');
  });

  it('nút Về nhà gọi onExit', async () => {
    const onExit = vi.fn();
    render(<Game lang="vi" speaker={speaker()} ageMonths={36} onExit={onExit} />);
    await flush();
    fireEvent.pointerDown(screen.getByLabelText('Về nhà'));
    expect(onExit).toHaveBeenCalled();
  });
});
