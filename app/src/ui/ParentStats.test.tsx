import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ParentStats } from './ParentStats';
import { ParentArea } from './ParentArea';
import { ALL_GAMES } from '../core/games';
import { DEFAULT_SETTINGS } from '../core/settings';
import { addPlay, type PlayLog } from '../core/playTime';

const NOW = new Date(2026, 10, 19, 15, 0).getTime();
const MIN = 60_000;

function logOf(): PlayLog {
  let log: PlayLog = {};
  log = addPlay(log, 'sort', 10 * MIN, NOW); // logic + math
  log = addPlay(log, 'counting', 5 * MIN, NOW - 2 * 86_400_000); // math
  log = addPlay(log, 'music', 30 * MIN, NOW - 9 * 86_400_000); // ngoài 7 ngày
  return log;
}

describe('ParentStats', () => {
  it('thanh phút theo kỹ năng 7 ngày, tổng, chip kỹ năng từng trò; trò chơi nhiều lên đầu', async () => {
    const log = logOf();
    render(<ParentStats games={ALL_GAMES} lang="vi" onClose={vi.fn()} load={() => Promise.resolve(log)} now={() => NOW} />);
    expect(await screen.findByText('7 ngày qua: bé chơi 15 phút')).toBeInTheDocument();
    expect(screen.getByTestId('skill-bar-math')).toHaveAttribute('data-minutes', '15');
    expect(screen.getByTestId('skill-bar-logic')).toHaveAttribute('data-minutes', '10');
    expect(screen.getByTestId('skill-bar-creativity')).toHaveAttribute('data-minutes', '0');
    expect(within(screen.getByTestId('skill-bar-math')).getByText('Toán')).toBeInTheDocument();
    // thanh dài nhất 100%
    const fill = screen.getByTestId('skill-bar-math').querySelector('span span[style]') as HTMLElement;
    expect(fill.style.width).toBe('100%');

    const rows = screen.getAllByTestId(/^game-skills-/);
    expect(rows).toHaveLength(ALL_GAMES.length);
    expect(rows[0]).toHaveAttribute('data-testid', 'game-skills-sort');
    expect(rows[1]).toHaveAttribute('data-testid', 'game-skills-counting');
    const sortChips = rows[0].querySelectorAll('[data-skill]');
    expect([...sortChips].map((c) => c.getAttribute('data-skill'))).toEqual(['logic', 'math']);
    expect(within(screen.getByTestId('game-skills-music')).getByText('chưa chơi')).toBeInTheDocument();
    // mọi trò đều có ít nhất một chip
    for (const r of rows) expect(r.querySelectorAll('[data-skill]').length).toBeGreaterThan(0);
  });

  it('chưa chơi gì: báo chưa chơi, mọi thanh 0', async () => {
    render(<ParentStats games={ALL_GAMES} lang="vi" onClose={vi.fn()} load={() => Promise.resolve({})} now={() => NOW} />);
    expect(await screen.findByText('Tuần này bé chưa chơi trò nào.')).toBeInTheDocument();
    for (const el of screen.getAllByTestId(/^skill-bar-/)) expect(el).toHaveAttribute('data-minutes', '0');
  });

  it('nhãn theo ngôn ngữ: ja, en', async () => {
    const log = logOf();
    const { unmount } = render(<ParentStats games={ALL_GAMES} lang="ja" onClose={vi.fn()} load={() => Promise.resolve(log)} now={() => NOW} />);
    expect(await screen.findByText('この7日間: 15 分 あそびました')).toBeInTheDocument();
    expect(screen.getByText('📊 こんしゅう')).toBeInTheDocument();
    expect(within(screen.getByTestId('skill-bar-math')).getByText('15 分')).toBeInTheDocument();
    unmount();
    render(<ParentStats games={ALL_GAMES} lang="en" onClose={vi.fn()} load={() => Promise.resolve(log)} now={() => NOW} />);
    expect(await screen.findByText('Last 7 days: 15 min of play')).toBeInTheDocument();
    expect(within(screen.getByTestId('skill-bar-social')).getByText(/Social & emotional/)).toBeInTheDocument();
  });

  it('nút Xong (nhả tay) gọi onClose', () => {
    const onClose = vi.fn();
    render(<ParentStats games={ALL_GAMES} lang="vi" onClose={onClose} load={() => Promise.resolve({})} now={() => NOW} />);
    const done = screen.getByRole('button', { name: 'Xong' });
    fireEvent.pointerDown(done);
    fireEvent.pointerUp(done);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('ParentArea: Tuần này và Chế độ nhẹ nhàng', () => {
  function renderArea(settings = DEFAULT_SETTINGS) {
    const props = { settings, speaker: { say: vi.fn(), sfx: vi.fn() }, onSave: vi.fn(), onUnlock: vi.fn(), onClose: vi.fn() };
    render(<ParentArea {...props} />);
    return props;
  }

  it('công tắc nhẹ nhàng lưu ngay, bấm lại thì tắt', () => {
    const { onSave, onClose } = renderArea();
    const calm = screen.getByRole('button', { name: 'Chế độ nhẹ nhàng' });
    expect(calm).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(calm);
    expect(onSave).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, calm: true });
    expect(calm).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(calm);
    expect(onSave).toHaveBeenLastCalledWith({ ...DEFAULT_SETTINGS, calm: false });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('nút Tuần này mở màn thống kê, Xong quay lại khu bố mẹ', async () => {
    renderArea();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Tuần này' }));
    expect(await screen.findByTestId('parent-stats')).toBeInTheDocument();
    const done = screen.getByRole('button', { name: 'Xong' });
    fireEvent.pointerDown(done);
    fireEvent.pointerUp(done);
    expect(screen.getByRole('dialog', { name: 'Cài đặt phụ huynh' })).toBeInTheDocument();
  });
});
