import { describe, it, expect, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import type { WorldSceneProps } from './WorldScene';

// R3F không chạy trong jsdom: thay cảnh 3D bằng một div, giữ lại props để kiểm tra khu được dựng/bật
let lastProps: WorldSceneProps | null = null;
vi.mock('./WorldScene', () => ({
  default: (p: WorldSceneProps) => {
    lastProps = p;
    return <div data-testid="world-scene-mock" data-mounted={p.mounted.join(',')} />;
  },
}));

import Game from './Game';

function setup() {
  const speaker = { say: vi.fn(), sfx: vi.fn() };
  const onExit = vi.fn();
  render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={onExit} />);
  return { speaker, onExit };
}

describe('Khám phá thế giới', () => {
  it('chào khi vào trò, ở đồng cỏ, chỉ dựng khu đầu và khu kế bên', async () => {
    const { speaker } = setup();
    expect(speaker.say).toHaveBeenCalledWith('world.hello');
    const game = screen.getByTestId('game-world');
    expect(game).toHaveAttribute('data-habitat', 'meadow');
    await screen.findByTestId('world-scene-mock');
    expect(lastProps!.mounted).toEqual([0, 1]);
    expect(lastProps!.visible).toEqual([0]);
    expect(screen.getByTestId('world-dots').children).toHaveLength(5);
  });

  it('đầu dải chỉ có mũi tên phải; bấm thì sang ao hồ và đọc tên khu khi tới nơi', async () => {
    vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance', 'setTimeout'] });
    try {
      const { speaker } = setup();
      expect(screen.queryByRole('button', { name: 'Sang trái' })).toBeNull();
      const right = screen.getByRole('button', { name: 'Sang phải' });
      act(() => {
        right.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      await act(async () => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.getByTestId('game-world')).toHaveAttribute('data-habitat', 'pond');
      expect(speaker.say).toHaveBeenLastCalledWith('world.pond');
      expect(screen.getByRole('button', { name: 'Sang trái' })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('nút Về nhà gọi onExit', () => {
    const { onExit } = setup();
    act(() => {
      screen.getByRole('button', { name: 'Về nhà' }).dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(onExit).toHaveBeenCalled();
  });
});
