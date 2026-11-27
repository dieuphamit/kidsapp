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

describe('Tiệm bánh: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  beforeEach(() => window.history.pushState({}, '', '/?e2e=1'));
  afterEach(() => window.history.pushState({}, '', '/'));

  /** Loa giả như loa thật: chuỗi sau chỉ bắt đầu khi gọi done() của chuỗi trước. */
  function chainSpeaker() {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    return { sp, chains };
  }

  it('vào tiệm: chào → tên khách → gọi bánh + điều ước, mỗi đoạn chờ đoạn trước nói xong', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    const animal = screen.getByTestId('customer').getAttribute('data-animal');
    expect(chains.map((c) => c.keys)).toEqual([['bakery.hello']]);
    act(() => chains[0].done());
    expect(chains[1].keys).toEqual([`animal.${animal}`]);
    act(() => chains[1].done());
    expect(chains[2].keys[0]).toBe('bakery.order');
    expect(chains[2].keys[1]).toBe('bakery.wish');
    expect(sp.say).not.toHaveBeenCalled();
  });

  it('thả topping trùng loại: tên rồi số đếm trong một lượt sayThen', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    act(() => { window.__behocBakery!.add('kiwi'); });
    act(() => { window.__behocBakery!.add('kiwi'); });
    expect(chains.at(-1)!.keys).toEqual(['topping.kiwi', 'number.2']);
  });

  it('rung chuông: khen → hỏi → khách mới (đổi khi tới lượt nói tên) → gọi bánh, nối tiếp', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={36} onExit={() => {}} />);
    const first = screen.getByTestId('customer').getAttribute('data-animal');
    act(() => { window.__behocBakery!.add('candle'); });
    act(() => { window.__behocBakery!.serve(); });
    const n = chains.length;
    expect(chains[n - 1].keys[0]).toMatch(/^bakery\.yum/);
    act(() => chains[n - 1].done());
    expect(chains[n].keys).toEqual(['bakery.ask']);
    // chưa nói xong câu hỏi thì khách cũ vẫn ở đó
    expect(screen.getByTestId('customer').getAttribute('data-animal')).toBe(first);
    act(() => chains[n].done());
    const next = screen.getByTestId('customer').getAttribute('data-animal');
    expect(next).not.toBe(first);
    expect(chains[n + 1].keys).toEqual([`animal.${next}`]);
    act(() => chains[n + 1].done());
    expect(chains[n + 2].keys[0]).toBe('bakery.order');
  });
});
