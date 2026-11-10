import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { BackHome } from './BackHome';

describe('BackHome', () => {
  it('calls onExit exactly once on pointerDown', () => {
    const onExit = vi.fn();
    const { getByRole } = render(<BackHome onExit={onExit} />);
    const button = getByRole('button', { name: 'Về nhà' });
    fireEvent.pointerDown(button);
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('has size 120px', () => {
    const onExit = vi.fn();
    const { getByRole } = render(<BackHome onExit={onExit} />);
    const button = getByRole('button', { name: 'Về nhà' });
    expect(button.style.width).toBe('120px');
    expect(button.style.height).toBe('120px');
  });

  it('uses custom label', () => {
    const onExit = vi.fn();
    const { getByRole } = render(<BackHome onExit={onExit} label="Thoát" />);
    const button = getByRole('button', { name: 'Thoát' });
    expect(button).toBeTruthy();
  });
});
