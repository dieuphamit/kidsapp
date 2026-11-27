import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { CUSTOMER_IDS, DISH_IDS, INGREDIENT_COUNT, STRANGER_COUNT, customerById, type CustomerId, type IngredientId } from './logic';
import type { Speaker } from '../../core/audio';

const sounds = { pop: vi.fn(), plop: vi.fn(), whoosh: vi.fn(), blub: vi.fn(), munch: vi.fn(), happy: vi.fn() };
vi.mock('./sounds', () => ({ createCookSounds: () => sounds }));

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

describe('Bếp nấu ăn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vào trò: chào, có khách thú thật, thẻ công thức, quầy đúng số nguyên liệu theo tuổi', () => {
    for (const [age, level] of [[26, 'easy'], [40, 'medium'], [60, 'hard']] as const) {
      const sp = speaker();
      const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={age} onExit={() => {}} />);
      expect(sp.say).toHaveBeenCalledWith('cook.hello');
      const c = screen.getByTestId('customer');
      expect(CUSTOMER_IDS).toContain(c.getAttribute('data-customer'));
      expect(DISH_IDS).toContain(screen.getByTestId('recipe').getAttribute('data-dish'));
      const n = INGREDIENT_COUNT[level];
      expect(document.querySelectorAll('[data-testid^="slot-"]')).toHaveLength(n);
      expect(document.querySelectorAll('[data-item]')).toHaveLength(n + STRANGER_COUNT[level]);
      expect(screen.getByTestId('game-cook')).toHaveAttribute('data-phase', 'gather');
      unmount();
    }
  });

  it('chạm khách: kêu ngay; chạm thẻ: đọc tên món; chạm nguyên liệu: có tiếng, nhả tại chỗ đọc tên', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={60} onExit={() => {}} />);
    const c = screen.getByTestId('customer');
    fireEvent.pointerDown(c);
    expect(sp.say).toHaveBeenLastCalledWith(customerById(c.getAttribute('data-customer') as CustomerId).sound);
    expect(c).toHaveAttribute('data-pressed', '');

    const card = screen.getByTestId('recipe');
    fireEvent.pointerDown(card);
    expect(sp.say).toHaveBeenLastCalledWith(`cook.dish.${card.getAttribute('data-dish')}`);

    const item = document.querySelector<HTMLElement>('[data-item]')!;
    fireEvent.pointerDown(item, { clientX: 10, clientY: 10 });
    expect(sounds.pop).toHaveBeenCalledTimes(1);
    expect(item).toHaveAttribute('data-pressed', '');
    fireEvent.pointerUp(item, { clientX: 10, clientY: 10 });
    expect(vi.mocked(sp.say).mock.calls.at(-1)?.[0]).toMatch(/^(cook\.food|feed\.food|fruit)\./);
  });

  it('bấm bếp khi chưa đủ: nhắc nhẹ, không đổi trạng thái; đủ rồi bấm thì nồi sôi', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(null, '', '/?e2e=1');
      const sp = speaker();
      render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
      const stove = screen.getByRole('button', { name: 'stove' });
      fireEvent.pointerDown(stove);
      expect(sp.say).toHaveBeenLastCalledWith('cook.notyet');
      expect(screen.getByTestId('game-cook')).toHaveAttribute('data-phase', 'gather');

      // Thả đủ nguyên liệu qua móc logic (kéo thật kiểm tra ở e2e)
      const need = [...document.querySelectorAll('[data-testid^="slot-"]')].map((el) => el.getAttribute('data-testid')!.slice(5) as IngredientId);
      for (const it of need) act(() => void window.__behocCook!.add(it));
      act(() => {
        vi.advanceTimersByTime(600);
      });
      expect(sounds.plop).toHaveBeenCalled();
      expect(screen.getByTestId('game-cook')).toHaveAttribute('data-phase', 'ready');
      for (const it of need) expect(screen.getByTestId(`slot-${it}`)).toHaveAttribute('data-done', '');

      fireEvent.pointerDown(screen.getByRole('button', { name: 'stove' }));
      expect(sounds.whoosh).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('game-cook')).toHaveAttribute('data-phase', 'stir');
      expect(screen.getByTestId('ladle')).toBeInTheDocument();
    } finally {
      window.history.replaceState(null, '', '/');
      vi.useRealTimers();
    }
  });
});

describe('Bếp nấu ăn: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  function chainSpeaker() {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
  }

  it('câu chào (~6,3s) đọc xong mới nói món khách muốn', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
    expect(chains.map((c) => c.keys)).toEqual([['cook.hello']]);
    expect(sp.say).not.toHaveBeenCalled();
    act(() => chains[0].done());
    const dish = screen.getByTestId('recipe').getAttribute('data-dish');
    expect(sp.say).toHaveBeenLastCalledWith(`cook.want.${dish}`);
  });

  it('thả đủ món: tên món cuối đọc xong mới nhắc bật bếp; bật bếp: "khuấy đi" không bị lời nhắc khuấy cắt', () => {
    vi.useFakeTimers();
    try {
      window.history.replaceState(null, '', '/?e2e=1');
      const { sp, chains } = chainSpeaker();
      render(<Game lang="vi" speaker={sp} ageMonths={26} onExit={() => {}} />);
      const need = [...document.querySelectorAll('[data-testid^="slot-"]')].map((el) => el.getAttribute('data-testid')!.slice(5) as IngredientId);
      for (const it of need) act(() => void window.__behocCook!.add(it));
      act(() => {
        vi.advanceTimersByTime(700);
      });
      const name = chains.at(-1)!;
      expect(name.keys[0]).toMatch(/\.(?:[a-z]+)$/);
      expect(sp.say).not.toHaveBeenCalledWith('cook.ready');
      act(() => name.done());
      expect(sp.say).toHaveBeenLastCalledWith('cook.ready');

      fireEvent.pointerDown(screen.getByRole('button', { name: 'stove' }));
      act(() => {
        vi.advanceTimersByTime(600);
      });
      const stir = chains.at(-1)!;
      expect(stir.keys).toEqual(['cook.stir']);
      const n = chains.length;
      // "khuấy đi" dài ~6,6s: quá giờ nhắc mà câu chưa xong thì không nhắc chen vào
      act(() => {
        vi.advanceTimersByTime(7000);
      });
      expect(chains).toHaveLength(n);
      act(() => stir.done());
      act(() => {
        vi.advanceTimersByTime(6100);
      });
      expect(chains.at(-1)!.keys).toEqual(['cook.stir']);
      expect(chains).toHaveLength(n + 1);
    } finally {
      window.history.replaceState(null, '', '/');
      vi.useRealTimers();
    }
  });
});
