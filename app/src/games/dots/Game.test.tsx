import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { ANIMALS } from './logic';
import type { Speaker } from '../../core/audio';

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

/** Toạ độ tâm chấm i (1..n) trong khung; jsdom không co giãn nên client = khung. */
function dotCenter(n: number) {
  const el = screen.getByTestId(`dot-${n}`);
  return { clientX: parseFloat(el.style.left) + 60, clientY: parseFloat(el.style.top) + 60 };
}

describe('Nối điểm', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('vào trò: chào, có bóng mờ con vật và 5 chấm (dưới 36 tháng), chấm 1 nhấp nháy', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    const game = screen.getByTestId('game-dots');
    expect(ANIMALS).toContain(game.getAttribute('data-animal'));
    expect(sp.say).toHaveBeenCalledWith('dots.hello');
    expect(screen.getAllByTestId(/^dot-\d+$/)).toHaveLength(5);
    expect(screen.getByTestId('dot-1')).toHaveAttribute('data-state', 'next');
    expect(screen.getByTestId('dots-silhouette')).toBeInTheDocument();
  });

  it('10 chấm từ 48 tháng, 8 chấm 36–47 tháng', () => {
    const { unmount } = render(<Game lang="vi" speaker={speaker()} ageMonths={60} onExit={() => {}} />);
    expect(screen.getAllByTestId(/^dot-\d+$/)).toHaveLength(10);
    unmount();
    render(<Game lang="vi" speaker={speaker()} ageMonths={40} onExit={() => {}} />);
    expect(screen.getAllByTestId(/^dot-\d+$/)).toHaveLength(8);
  });

  it('chạm chấm đúng: đọc số ngay, chấm sáng; chạm sai: không nói gì, chấm kế nhún', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    const game = screen.getByTestId('game-dots');
    fireEvent.pointerDown(game, { pointerId: 1, ...dotCenter(1) });
    expect(sp.say).toHaveBeenLastCalledWith('number.1');
    expect(screen.getByTestId('dot-1')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('dot-1')).toHaveAttribute('data-pressed', '');
    fireEvent.pointerUp(game, { pointerId: 1 });

    vi.mocked(sp.say).mockClear();
    fireEvent.pointerDown(game, { pointerId: 1, ...dotCenter(4) });
    expect(sp.say).not.toHaveBeenCalled();
    expect(screen.getByTestId('dot-4')).toHaveAttribute('data-state', 'todo');
    expect(screen.getByTestId('dot-4')).toHaveAttribute('data-pressed', '');
    expect(screen.getByTestId('dot-2').querySelector('[data-hint]')).not.toBeNull();
    fireEvent.pointerUp(game, { pointerId: 1 });
  });

  it('kéo ngón qua các chấm theo thứ tự cũng nối; xong vòng: ảnh thật hiện, tiếng kêu thật, "Là con ..."; rồi sang con khác', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    const game = screen.getByTestId('game-dots');
    const animal = game.getAttribute('data-animal');
    fireEvent.pointerDown(game, { pointerId: 1, ...dotCenter(1) });
    for (let n = 2; n <= 5; n++) fireEvent.pointerMove(game, { pointerId: 1, ...dotCenter(n) });
    fireEvent.pointerUp(game, { pointerId: 1 });
    expect(sp.say).toHaveBeenCalledWith('number.5');
    expect(game).toHaveAttribute('data-phase', 'reveal');
    expect(screen.getByTestId('dots-sparkles')).toBeInTheDocument();
    expect(screen.getByTestId('dots-photo').getAttribute('src')).toMatch(new RegExp(`cards/${animal}\\.png$`));

    act(() => vi.advanceTimersByTime(1000));
    expect(sp.say).toHaveBeenLastCalledWith(`animal.${animal}-sound`);
    act(() => vi.advanceTimersByTime(2000));
    expect(sp.say).toHaveBeenLastCalledWith(`dots.is.${animal}`);
    act(() => vi.advanceTimersByTime(4000));
    expect(game).toHaveAttribute('data-phase', 'play');
    expect(game.getAttribute('data-animal')).not.toBe(animal);
    expect(game).toHaveAttribute('data-next', '0');
  });

  it('chạm chỗ trống có gợn phản hồi; không có nút nào khác ngoài Về nhà', () => {
    const { container } = render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={() => {}} />);
    fireEvent.pointerDown(screen.getByTestId('game-dots'), { pointerId: 1, clientX: 600, clientY: 20 });
    expect(container.querySelector('[class*="ripple"]')).not.toBeNull();
    expect(screen.getAllByRole('button', { hidden: true }).filter((b) => b.tagName === 'BUTTON').map((b) => b.getAttribute('aria-label'))).toEqual(['Về nhà']);
  });

  it('nút Về nhà thoát trò', () => {
    const onExit = vi.fn();
    render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={onExit} />);
    fireEvent.pointerDown(screen.getByLabelText('Về nhà'));
    expect(onExit).toHaveBeenCalled();
  });
});
