import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';

function setup() {
  const speaker: Speaker = { say: vi.fn(), sfx: vi.fn() };
  render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
  const game = screen.getByTestId('game-bakery');
  const said = () => (speaker.say as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
  return { speaker, game, said };
}

describe('Tiệm bánh', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/?e2e=1');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('chào, rồi khách nói tên và gọi bánh', () => {
    const { game, said } = setup();
    expect(said()[0]).toBe('bakery.hello');
    const animal = game.querySelector('[data-testid="customer"]')!.getAttribute('data-animal');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(said()).toContain(`animal.${animal}`);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(game.getAttribute('data-last-say')).toBe('bakery.order');
  });

  it('có 6 topping trên kệ, chuông ≥120px', () => {
    setup();
    for (const id of ['strawberry', 'cherries', 'blueberry', 'kiwi', 'candle', 'chocolate']) {
      expect(screen.getByTestId(`shelf-${id}`)).toBeInTheDocument();
    }
    expect(screen.getByRole('button', { name: 'Chuông' }).style.width).toBe('140px');
  });

  it('chuông khi bánh trống → nói lại bakery.order', () => {
    const { game } = setup();
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Chuông' }));
    expect(game.getAttribute('data-last-say')).toBe('bakery.order');
  });

  it('thêm topping nói tên, cái thứ 2 cùng loại đếm sau 700ms', () => {
    const { game } = setup();
    act(() => { vi.advanceTimersByTime(4000); });
    act(() => { window.__behocBakery!.add('kiwi'); });
    expect(game.getAttribute('data-last-say')).toBe('topping.kiwi');
    act(() => { vi.advanceTimersByTime(1000); });
    expect(game.getAttribute('data-last-say')).toBe('topping.kiwi');
    act(() => { window.__behocBakery!.add('kiwi'); });
    act(() => { vi.advanceTimersByTime(699); });
    expect(game.getAttribute('data-last-say')).toBe('topping.kiwi');
    act(() => { vi.advanceTimersByTime(1); });
    expect(game.getAttribute('data-last-say')).toBe('number.2');
    expect(window.__behocBakery!.toppings()).toHaveLength(2);
  });

  it('chạm topping trên bánh → bỏ ra', () => {
    setup();
    act(() => { window.__behocBakery!.add('candle'); });
    const items = screen.getAllByTestId('on-cake');
    expect(items).toHaveLength(1);
    fireEvent.pointerDown(items[0]);
    expect(screen.queryAllByTestId('on-cake')).toHaveLength(0);
    expect(window.__behocBakery!.toppings()).toHaveLength(0);
  });

  it('rung chuông: khen theo bánh, 1.5s hỏi, 3s sau khách mới và bánh trống', () => {
    const { game, said } = setup();
    act(() => { vi.advanceTimersByTime(4000); });
    const first = game.querySelector('[data-testid="customer"]')!.getAttribute('data-animal');
    act(() => {
      window.__behocBakery!.add('strawberry');
      window.__behocBakery!.add('kiwi');
      window.__behocBakery!.add('blueberry');
    });
    act(() => { window.__behocBakery!.serve(); });
    expect(game.getAttribute('data-last-say')).toBe('bakery.yum-fruit');
    expect(screen.getByTestId('cake').hasAttribute('data-eaten')).toBe(true);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(game.getAttribute('data-last-say')).toBe('bakery.ask');
    act(() => { vi.advanceTimersByTime(3000); });
    const next = game.querySelector('[data-testid="customer"]')!.getAttribute('data-animal');
    expect(next).not.toBe(first);
    expect(said().at(-1)).toBe(`animal.${next}`);
    expect(window.__behocBakery!.toppings()).toHaveLength(0);
    act(() => { vi.advanceTimersByTime(1500); });
    expect(game.getAttribute('data-last-say')).toBe('bakery.order');
  });
});
