import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { CUSTOMER_IDS, SHELF_SIZE, customerById, type CustomerId, type ItemId } from './logic';
import type { Speaker } from '../../core/audio';

const sounds = { pick: vi.fn(), pop: vi.fn(), slide: vi.fn(), beep: vi.fn(), ding: vi.fn(), boing: vi.fn(), happy: vi.fn() };
vi.mock('./sounds', () => ({ createShopSounds: () => sounds }));

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

const said = (sp: Speaker) => vi.mocked(sp.say).mock.calls.map((c) => c[0]);
const wants = () => [...document.querySelectorAll('[data-testid^="want-"]')].map((el) => el.getAttribute('data-item') as ItemId);

describe('Cửa hàng', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vào trò: chào, có khách thú, bong bóng hình, kệ đúng số món theo tuổi', () => {
    for (const [age, level] of [[26, 'easy'], [40, 'medium'], [60, 'hard']] as const) {
      const sp = speaker();
      const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={age} onExit={() => {}} />);
      expect(sp.say).toHaveBeenCalledWith('shop.hello');
      expect(CUSTOMER_IDS).toContain(screen.getByTestId('customer').getAttribute('data-customer'));
      expect(document.querySelectorAll('[data-testid^="item-"]')).toHaveLength(SHELF_SIZE[level]);
      const n = wants().length;
      if (level === 'easy') expect(n).toBe(1);
      else if (level === 'medium') expect(n).toBe(3);
      else expect(n).toBeGreaterThan(new Set(wants()).size); // có món cần nhiều cái
      expect(screen.getByTestId('game-shop')).toHaveAttribute('data-phase', 'shop');
      expect(screen.getByTestId('game-shop')).toHaveAttribute('data-level', level);
      unmount();
    }
  });

  it('chạm khách: kêu tiếng thật ngay; chạm món: có tiếng, nhả tại chỗ thì đọc tên; chạm chủ tiệm: nhắc danh sách', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const c = screen.getByTestId('customer');
    fireEvent.pointerDown(c);
    expect(sp.say).toHaveBeenLastCalledWith(customerById(c.getAttribute('data-customer') as CustomerId).sound);
    expect(c).toHaveAttribute('data-pressed', '');

    const item = document.querySelector<HTMLElement>('[data-testid^="item-"]')!;
    fireEvent.pointerDown(item, { clientX: 10, clientY: 10 });
    expect(sounds.pick).toHaveBeenCalledTimes(1);
    expect(item).toHaveAttribute('data-pressed', '');
    fireEvent.pointerUp(item, { clientX: 10, clientY: 10 });
    expect(said(sp).at(-1)).toMatch(/^(fruit|feed\.food|cook\.food|words)\./);

    fireEvent.pointerDown(screen.getByTestId('keeper'));
    expect(said(sp).at(-1)).toBe('shop.want');
  });

  it('bé ngừng 6 giây: món cần lấy nhấp nháy, không có lời mới', () => {
    vi.useFakeTimers();
    try {
      const sp = speaker();
      render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
      expect(document.querySelector('[data-hint]')).toBeNull();
      act(() => {
        vi.advanceTimersByTime(6100);
      });
      const need = wants()[0];
      expect(screen.getByTestId(`item-${need}`)).toHaveAttribute('data-hint', '');
      expect(screen.getByTestId(`want-${need}-0`)).toHaveAttribute('data-hint', '');
      expect(said(sp).every((k) => k === 'shop.hello' || k === 'shop.want' || /^(fruit|feed\.food|cook\.food|words)\./.test(k))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('món lạ: không âm báo sai, lời khích lệ, món cần nhấp nháy; đủ món → bấm máy → bíp và đếm từng món → khách vui → khách kế', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(null, '', '/?e2e=1');
      const sp = speaker();
      render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
      const game = screen.getByTestId('game-shop');
      const first = window.__behocShop!.snapshot()!;
      const need = first.need.map((w) => w.item);
      const odd = first.shelf.find((x) => !need.includes(x))!;

      // bấm máy khi chưa đủ: nhắc nhẹ
      fireEvent.pointerDown(screen.getByRole('button', { name: 'register' }));
      expect(sp.say).toHaveBeenLastCalledWith('shop.notyet');
      expect(game).toHaveAttribute('data-phase', 'shop');

      act(() => void window.__behocShop!.add(odd));
      expect(sp.say).toHaveBeenLastCalledWith('shop.nope');
      expect(sounds.pop).not.toHaveBeenCalled();
      expect(screen.getByTestId('basket')).toHaveAttribute('data-count', '0');
      expect(screen.getByTestId(`item-${need[0]}`)).toHaveAttribute('data-hint', '');

      act(() => void window.__behocShop!.add(need[0]));
      expect(sp.say).toHaveBeenLastCalledWith(`shop.got.${need[0]}`); // khen đúng hành động
      expect(sounds.pop).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId(`want-${need[0]}-0`)).toHaveAttribute('data-done', '');
      expect(screen.queryByTestId(`item-${need[0]}`)).toBeNull(); // mỗi món 1 cái: đã rời kệ
      expect(screen.getByTestId('customer')).toHaveAttribute('data-mood', '1');
      act(() => void window.__behocShop!.add(need[1]));
      act(() => void window.__behocShop!.add(need[2]));
      expect(game).toHaveAttribute('data-phase', 'checkout');
      expect(screen.getByTestId('basket')).toHaveAttribute('data-place', 'desk');
      expect(screen.getByTestId('customer')).toHaveAttribute('data-mood', '2');
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(sp.say).toHaveBeenLastCalledWith('shop.pay');

      fireEvent.pointerDown(screen.getByRole('button', { name: 'register' }));
      expect(game).toHaveAttribute('data-phase', 'scan');
      act(() => {
        vi.advanceTimersByTime(3200);
      });
      expect(sounds.beep).toHaveBeenCalledTimes(3);
      expect(said(sp).slice(-3)).toEqual(['number.1', 'number.2', 'number.3']);
      expect(game).toHaveAttribute('data-phase', 'paid');

      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(sounds.ding).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('bag')).toHaveAttribute('data-state', 'given');
      expect(screen.getByTestId('happy')).toBeInTheDocument();
      expect(screen.getByTestId('customer')).toHaveAttribute('data-mood', '3');
      expect(sp.say).toHaveBeenLastCalledWith(customerById(first.customer).sound);
      act(() => {
        vi.advanceTimersByTime(1600);
      });
      expect(sp.say).toHaveBeenLastCalledWith('shop.thanks');

      act(() => {
        vi.advanceTimersByTime(3500);
      });
      const next = window.__behocShop!.snapshot()!;
      expect(next.index).toBe(1);
      expect(next.customer).not.toBe(first.customer);
      expect(game).toHaveAttribute('data-phase', 'shop');
      expect(said(sp).lastIndexOf('shop.want')).toBeGreaterThan(said(sp).lastIndexOf('shop.thanks'));
    } finally {
      window.history.replaceState(null, '', '/');
      vi.useRealTimers();
    }
  });

  it('hết khách: ăn mừng, có nút chơi lại; bấm thì lượt mới', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(null, '', '/?e2e=1');
      const sp = speaker();
      render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
      const count = window.__behocShop!.snapshot()!.count;
      expect(count).toBe(3);
      for (let i = 0; i < count; i++) {
        const s = window.__behocShop!.snapshot()!;
        expect(s.index).toBe(i);
        for (const w of s.need) act(() => void window.__behocShop!.add(w.item));
        act(() => void window.__behocShop!.pay());
        act(() => {
          vi.advanceTimersByTime(10_000);
        });
      }
      expect(screen.getByTestId('party')).toBeInTheDocument();
      expect(sp.say).toHaveBeenLastCalledWith('shop.done');
      expect(screen.getByTestId('game-shop')).toHaveAttribute('data-phase', 'party');
      // các khách vừa phục vụ đứng thành hàng; chạm con nào thì con đó kêu
      const guests = document.querySelectorAll<HTMLElement>('[data-testid^="guest-"]');
      expect(guests).toHaveLength(3);
      expect(new Set([...guests].map((g) => g.getAttribute('data-customer'))).size).toBe(3);
      fireEvent.pointerDown(guests[1]);
      expect(sp.say).toHaveBeenLastCalledWith(customerById(guests[1].getAttribute('data-customer') as CustomerId).sound);
      expect(guests[1].querySelector('[data-bounce]')).not.toBeNull();
      expect(screen.getByTestId('party-buddy')).toBeInTheDocument();
      // không tự chơi lại: chờ bé bấm
      act(() => {
        vi.advanceTimersByTime(20_000);
      });
      expect(screen.getByTestId('party')).toBeInTheDocument();
      fireEvent.pointerDown(screen.getByRole('button', { name: 'replay' }));
      expect(screen.queryByTestId('party')).toBeNull();
      expect(window.__behocShop!.snapshot()!.index).toBe(0);
      expect(screen.getByTestId('game-shop')).toHaveAttribute('data-phase', 'shop');
    } finally {
      window.history.replaceState(null, '', '/');
      vi.useRealTimers();
    }
  });
});

describe('Siêu thị: quầy tính tiền nói nối tiếp, câu sau không cắt câu trước', () => {
  it('đếm từng món: số sau chờ số trước đọc xong; kêu → cảm ơn → khách kế, mỗi câu chờ câu trước', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(null, '', '/?e2e=1');
      const chains: { keys: readonly string[]; done(): void }[] = [];
      const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
        keys.forEach((k, i) => opts?.onSay?.(k, i));
        chains.push({ keys, done: () => opts?.onDone?.() });
        return () => {};
      });
      const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
      render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
      const first = window.__behocShop!.snapshot()!;
      for (const w of first.need) act(() => void window.__behocShop!.add(w.item));
      act(() => void window.__behocShop!.pay());
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const n = first.need.length;
      for (let i = 1; i <= n; i++) {
        const c = chains.at(-1)!;
        expect(c.keys).toEqual([`number.${i}`]);
        expect(sounds.beep).toHaveBeenCalledTimes(i);
        // chưa đọc xong thì chưa đếm số kế, dù đã quá nhịp cũ 950ms
        act(() => {
          vi.advanceTimersByTime(2000);
        });
        expect(chains.at(-1)).toBe(c);
        act(() => c.done());
      }
      act(() => {
        vi.advanceTimersByTime(900);
      });
      const sound = chains.at(-1)!;
      expect(sound.keys).toEqual([customerById(first.customer).sound]);
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(chains.at(-1)).toBe(sound);
      act(() => sound.done());
      const thanks = chains.at(-1)!;
      expect(thanks.keys).toEqual(['shop.thanks']);
      act(() => {
        vi.advanceTimersByTime(8000);
      });
      expect(window.__behocShop!.snapshot()!.index).toBe(0);
      act(() => thanks.done());
      act(() => {
        vi.advanceTimersByTime(800);
      });
      expect(window.__behocShop!.snapshot()!.index).toBe(1);
    } finally {
      window.history.replaceState(null, '', '/');
      vi.useRealTimers();
    }
  });
});
