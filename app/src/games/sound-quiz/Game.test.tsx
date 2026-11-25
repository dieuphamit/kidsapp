import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { ROUND_SIZE } from './logic';
import { clearRecentPicks } from '../../core/gameOptions';
import type { Speaker } from '../../core/audio';

function speaker() {
  return { say: vi.fn(), sfx: vi.fn() } satisfies Speaker;
}
const answer = () => (window as Window & { __behocQuiz?: { answer(): string } }).__behocQuiz!.answer();
const said = (sp: ReturnType<typeof speaker>) => sp.say.mock.calls.map((c) => c[0] as string);

describe('Ai kêu đấy?', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearRecentPicks();
    window.history.pushState({}, '', '?e2e=1');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('vào trò: chào xong mới phát tiếng kêu của đáp án', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    expect(said(sp)).toEqual(['quiz.hello']);
    act(() => vi.advanceTimersByTime(1500));
    expect(said(sp)).toEqual(['quiz.hello', `animal.${answer()}-sound`]);
  });

  it('thoát trò ngay sau câu chào: không còn tiếng nào phát nữa', () => {
    const sp = speaker();
    const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    expect(sp.say).toHaveBeenCalledTimes(1);
    unmount();
    act(() => vi.advanceTimersByTime(30_000));
    expect(sp.say).toHaveBeenCalledTimes(1);
  });

  it('thoát trò giữa lúc khen / lúc nhắc nghe lại: không còn tiếng nào phát nữa', () => {
    for (const pick of ['right', 'wrong'] as const) {
      const sp = speaker();
      const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
      act(() => vi.advanceTimersByTime(2000));
      const a = answer();
      const cards = [...document.querySelectorAll('[data-testid^="card-"]')];
      const card = cards.find((c) => (c.getAttribute('data-testid') === `card-${a}`) === (pick === 'right'))!;
      fireEvent.pointerDown(card);
      expect(sp.say).toHaveBeenLastCalledWith(pick === 'right' ? `animal.${a}` : 'quiz.again');
      const n = sp.say.mock.calls.length;
      unmount();
      act(() => vi.advanceTimersByTime(30_000));
      expect(sp.say).toHaveBeenCalledTimes(n);
    }
  });

  it('không thoát thì chuỗi vẫn chạy: sai → nhắc rồi phát lại tiếng; đúng → tên, khen, câu mới', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    act(() => vi.advanceTimersByTime(2000));
    const a = answer();
    const wrong = [...document.querySelectorAll('[data-testid^="card-"]')].find((c) => c.getAttribute('data-testid') !== `card-${a}`)!;
    fireEvent.pointerDown(wrong);
    act(() => vi.advanceTimersByTime(1200));
    expect(said(sp).slice(-2)).toEqual(['quiz.again', `animal.${a}-sound`]);
    fireEvent.pointerDown(screen.getByTestId(`card-${a}`));
    act(() => vi.advanceTimersByTime(1200));
    expect(said(sp).slice(-2)).toEqual([`animal.${a}`, 'ui.great']);
    act(() => vi.advanceTimersByTime(3000));
    expect(answer()).not.toBe(a);
    expect(sp.say).toHaveBeenLastCalledWith(`animal.${answer()}-sound`);
    expect(screen.queryByTestId('party')).toBeNull();
  });

  it(`đúng ${ROUND_SIZE} câu: bạn đồng hành ăn mừng, rồi chơi tiếp câu mới; không có điểm số`, () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    act(() => vi.advanceTimersByTime(2000));
    for (let i = 1; i <= ROUND_SIZE; i++) {
      expect(screen.queryByTestId('party')).toBeNull();
      fireEvent.pointerDown(screen.getByTestId(`card-${answer()}`));
      act(() => vi.advanceTimersByTime(3000));
    }
    expect(screen.getByTestId('party')).toBeInTheDocument();
    expect(sp.say).toHaveBeenLastCalledWith('quiz.done');
    expect(screen.getByTestId('game-sound-quiz').textContent).not.toMatch(/\d/);
    // đang ăn mừng thì chạm thẻ không tính
    const n = sp.say.mock.calls.length;
    fireEvent.pointerDown(screen.getByTestId(`card-${answer()}`));
    expect(sp.say).toHaveBeenCalledTimes(n);
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.queryByTestId('party')).toBeNull();
    expect(sp.say).toHaveBeenLastCalledWith(`animal.${answer()}-sound`);
    // chơi tiếp bình thường
    fireEvent.pointerDown(screen.getByTestId(`card-${answer()}`));
    expect(sp.say.mock.calls.at(-1)![0]).toMatch(/^animal\.[a-z]+$/);
  });
});
