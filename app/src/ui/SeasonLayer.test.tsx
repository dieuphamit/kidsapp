import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { SeasonLayer, GREET_DELAY_MS } from './SeasonLayer';
import { TRAIN_GREET_DELAY_MS } from './TrainMenu';
import { saveSeasonPref } from '../core/seasonPref';

const speaker = () => ({ say: vi.fn(), sfx: vi.fn() });

describe('SeasonLayer', () => {
  beforeEach(async () => {
    localStorage.clear();
    await saveSeasonPref('auto');
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  });
  afterEach(() => vi.useRealTimers());

  it('ngày Tết: đèn lồng, cánh hoa rơi; không nhận chạm', () => {
    render(<SeasonLayer speaker={speaker()} search="?e2e=1&date=2027-02-06" />);
    const layer = screen.getByTestId('season-layer');
    expect(layer).toHaveAttribute('data-season', 'tet');
    expect(layer).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getAllByTestId('season-petal').length).toBeGreaterThan(0);
    expect(layer.querySelector('button')).toBeNull();
  });

  it('Trung thu và Giáng Sinh', () => {
    const { unmount } = render(<SeasonLayer speaker={speaker()} search="?e2e=1&date=2026-09-25" />);
    expect(screen.getByTestId('season-layer')).toHaveAttribute('data-season', 'trungthu');
    unmount();
    render(<SeasonLayer speaker={speaker()} search="?e2e=1&date=2026-12-24" />);
    expect(screen.getByTestId('season-layer')).toHaveAttribute('data-season', 'xmas');
    expect(screen.getAllByTestId('season-snow').length).toBeGreaterThan(10);
  });

  it('ngày thường không vẽ gì', () => {
    const { container } = render(<SeasonLayer speaker={speaker()} search="?e2e=1&date=2026-11-19" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('chào một lần mỗi ngày, sau khi bản đồ nói xong', () => {
    const sp = speaker();
    const { unmount } = render(<SeasonLayer speaker={sp} search="?e2e=1&date=2026-12-24" />);
    act(() => { vi.advanceTimersByTime(GREET_DELAY_MS - 1); });
    expect(sp.say).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1); });
    expect(sp.say).toHaveBeenCalledWith('season.xmas');
    unmount();
    // quay lại bản đồ cùng ngày: không chào nữa
    const sp2 = speaker();
    const second = render(<SeasonLayer speaker={sp2} search="?e2e=1&date=2026-12-24" />);
    act(() => { vi.advanceTimersByTime(GREET_DELAY_MS * 2); });
    expect(sp2.say).not.toHaveBeenCalled();
    second.unmount();
    // hôm sau chào lại
    const sp3 = speaker();
    render(<SeasonLayer speaker={sp3} search="?e2e=1&date=2026-12-25" />);
    act(() => { vi.advanceTimersByTime(GREET_DELAY_MS); });
    expect(sp3.say).toHaveBeenCalledTimes(1);
  });

  it('màn có câu chào dài (đoàn tàu ~6,3s) đặt delayMs: chưa tới giờ thì không chào chen vào', () => {
    const sp = speaker();
    render(<SeasonLayer speaker={sp} search="?e2e=1&date=2026-12-24" delayMs={TRAIN_GREET_DELAY_MS} />);
    act(() => { vi.advanceTimersByTime(GREET_DELAY_MS); });
    expect(sp.say).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(TRAIN_GREET_DELAY_MS - GREET_DELAY_MS); });
    expect(sp.say).toHaveBeenCalledWith('season.xmas');
    expect(TRAIN_GREET_DELAY_MS).toBeGreaterThan(6336); // ui.train-hello dài nhất (ja) 6,3s
  });

  it('rời bản đồ trước khi chào thì không chào', () => {
    const sp = speaker();
    const { unmount } = render(<SeasonLayer speaker={sp} search="?e2e=1&date=2026-12-24" />);
    unmount();
    act(() => { vi.advanceTimersByTime(GREET_DELAY_MS * 2); });
    expect(sp.say).not.toHaveBeenCalled();
  });

  // để cuối: đọc idb của các test trước không ghi đè lại tùy chọn
  it('bố mẹ tắt thì không vẽ gì', async () => {
    await act(async () => { await saveSeasonPref('off'); });
    const { container } = render(<SeasonLayer speaker={speaker()} search="?e2e=1&date=2027-02-06" />);
    expect(container).toBeEmptyDOMElement();
  });
});
