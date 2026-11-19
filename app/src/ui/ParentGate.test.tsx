import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, within } from '@testing-library/react';
import { ParentGate } from './ParentGate';

afterEach(() => vi.useRealTimers());

/** Chạm nút đáp án (ClayButton kích hoạt khi nhả tay). */
function tap(el: HTMLElement) {
  fireEvent.pointerDown(el);
  fireEvent.pointerUp(el);
}

function hold(zone: HTMLElement, ms: number) {
  fireEvent.pointerDown(zone);
  act(() => { vi.advanceTimersByTime(ms); });
  fireEvent.pointerUp(zone);
}

describe('ParentGate', () => {
  it('chạm nhanh không mở; giữ 3 giây rồi chọn đúng đáp án thì mở', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<ParentGate onOpen={onOpen} rand={() => 0} />);
    const zone = screen.getByRole('button', { name: 'Khu phụ huynh' });
    hold(zone, 1000);
    expect(screen.queryByRole('dialog', { name: 'Xác nhận phụ huynh' })).toBeNull();

    hold(zone, 3000);
    expect(screen.getByTestId('gate-question')).toHaveTextContent('3 × 3 = ?');
    const choices = within(screen.getByRole('group', { name: 'Đáp án' })).getAllByRole('button');
    expect(choices).toHaveLength(4);
    // mọi nút đáp án là ClayButton ≥120px
    for (const c of choices) expect(c.style.width).toBe('120px');
    tap(screen.getByRole('button', { name: '9' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog', { name: 'Xác nhận phụ huynh' })).toBeNull();
  });

  it('chọn sai: lặng lẽ đóng, không mở; phải giữ lại 3 giây mới có câu mới', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<ParentGate onOpen={onOpen} rand={() => 0} />);
    const zone = screen.getByRole('button', { name: 'Khu phụ huynh' });
    hold(zone, 3000);
    const wrong = within(screen.getByRole('group', { name: 'Đáp án' }))
      .getAllByRole('button')
      .find((b) => b.getAttribute('aria-label') !== '9')!;
    tap(wrong);
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog', { name: 'Xác nhận phụ huynh' })).toBeNull();

    hold(zone, 3000);
    tap(screen.getByRole('button', { name: '9' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('chạm xuống rồi kéo đi (không nhả trên nút) thì không tính là chọn', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<ParentGate onOpen={onOpen} rand={() => 0} />);
    hold(screen.getByRole('button', { name: 'Khu phụ huynh' }), 3000);
    const right = screen.getByRole('button', { name: '9' });
    fireEvent.pointerDown(right);
    fireEvent.pointerLeave(right);
    fireEvent.pointerUp(right);
    expect(onOpen).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Xác nhận phụ huynh' })).toBeInTheDocument();
  });
});
