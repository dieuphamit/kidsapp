import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClayButton } from './ClayButton';

describe('ClayButton', () => {
  it('không bao giờ nhỏ hơn 120px dù truyền size nhỏ', () => {
    render(<ClayButton color="peach" label="Con bò" size={50} onPress={() => {}}>🐮</ClayButton>);
    const b = screen.getByRole('button', { name: 'Con bò' });
    expect(b.style.width).toBe('120px');
    expect(b.style.height).toBe('120px');
  });
  it('gọi onPress ngay khi chạm xuống (pointerdown)', () => {
    const onPress = vi.fn();
    render(<ClayButton color="mint" label="Hồ nước" onPress={onPress}>💧</ClayButton>);
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Hồ nước' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it('dùng màu đất sét từ token', () => {
    render(<ClayButton color="butter" label="x" onPress={() => {}}>x</ClayButton>);
    expect(screen.getByRole('button').style.background).toBe('var(--clay-butter)');
  });
  it('đặt data-pressed khi chạm xuống và bỏ khi nhả', () => {
    render(<ClayButton color="mint" label="Nhấn" onPress={() => {}}>x</ClayButton>);
    const b = screen.getByRole('button', { name: 'Nhấn' });
    expect(b).not.toHaveAttribute('data-pressed');
    fireEvent.pointerDown(b);
    expect(b).toHaveAttribute('data-pressed');
    fireEvent.pointerUp(b);
    expect(b).not.toHaveAttribute('data-pressed');
  });
  it('style của caller không làm nút nhỏ hơn 120px', () => {
    render(<ClayButton color="peach" label="Rộng" size={50} onPress={() => {}} style={{ width: '10px' }}>x</ClayButton>);
    expect(screen.getByRole('button', { name: 'Rộng' }).style.width).toBe('120px');
  });
  it("activateOn='release': lún ngay khi chạm, chỉ kích hoạt khi nhả tay", () => {
    const onPress = vi.fn();
    render(<ClayButton color="mint" label="Tên" activateOn="release" onPress={onPress}>x</ClayButton>);
    const b = screen.getByRole('button', { name: 'Tên' });
    fireEvent.pointerDown(b, { clientX: 10, clientY: 10 });
    expect(b).toHaveAttribute('data-pressed');
    expect(onPress).not.toHaveBeenCalled();
    fireEvent.pointerUp(b);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  it("activateOn='release': kéo (cuộn) hoặc pointercancel thì không bấm", () => {
    const onPress = vi.fn();
    render(<ClayButton color="mint" label="Tên" activateOn="release" onPress={onPress}>x</ClayButton>);
    const b = screen.getByRole('button', { name: 'Tên' });
    fireEvent.pointerDown(b, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(b, { clientX: 10, clientY: 60 });
    expect(b).not.toHaveAttribute('data-pressed');
    fireEvent.pointerUp(b);
    fireEvent.pointerDown(b, { clientX: 10, clientY: 10 });
    fireEvent.pointerCancel(b);
    fireEvent.pointerUp(b);
    expect(onPress).not.toHaveBeenCalled();
    // xê dịch nhỏ (tay run) vẫn tính là bấm
    fireEvent.pointerDown(b, { clientX: 10, clientY: 10 });
    fireEvent.pointerMove(b, { clientX: 14, clientY: 13 });
    fireEvent.pointerUp(b);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
