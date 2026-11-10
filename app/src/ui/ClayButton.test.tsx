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
});
