import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ParentGate } from './ParentGate';

afterEach(() => vi.useRealTimers());

describe('ParentGate', () => {
  it('chạm nhanh không mở; giữ 3 giây rồi trả lời đúng thì mở', () => {
    vi.useFakeTimers();
    const onOpen = vi.fn();
    render(<ParentGate onOpen={onOpen} rand={() => 0} />);
    const zone = screen.getByRole('button', { name: 'Khu phụ huynh' });
    fireEvent.pointerDown(zone);
    act(() => { vi.advanceTimersByTime(1000); });
    fireEvent.pointerUp(zone);
    expect(screen.queryByLabelText('Đáp án')).toBeNull();

    fireEvent.pointerDown(zone);
    act(() => { vi.advanceTimersByTime(3000); });
    const input = screen.getByLabelText('Đáp án');
    expect(screen.getByText('10 + 10 = ?')).toBeInTheDocument();
    fireEvent.change(input, { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'Mở' }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
