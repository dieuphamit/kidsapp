import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import type { Speaker } from '../../core/audio';
import { soundKey } from './logic';

function setup(ageMonths = 48) {
  const speaker: Speaker = { say: vi.fn(), sfx: vi.fn() };
  render(<Game lang="vi" speaker={speaker} ageMonths={ageMonths} onExit={() => {}} />);
  const game = screen.getByTestId('game-words');
  const said = () => (speaker.say as ReturnType<typeof vi.fn>).mock.calls.map((c) => c[0] as string);
  const last = () => game.getAttribute('data-last-say');
  return { game, said, last };
}

const tick = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });
const press = (el: Element) => act(() => { fireEvent.pointerDown(el); });

describe('Đồ vật quanh bé', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.history.pushState({}, '', '/?e2e=1');
  });
  afterEach(() => {
    vi.useRealTimers();
    window.history.pushState({}, '', '/');
  });

  it('chào và hiện 4 nút chủ đề', () => {
    const { said, game } = setup();
    expect(said()[0]).toBe('words.hello');
    expect(game.getAttribute('data-phase')).toBe('topics');
    for (const t of ['clothes', 'kitchen', 'vehicles', 'home']) expect(screen.getByRole('button', { name: `topic-${t}` })).toBeInTheDocument();
  });

  it('chọn chủ đề: nói tên chủ đề, rồi đọc tên thẻ đầu; chạm thẻ đọc lại tên', () => {
    const { last, game } = setup();
    press(screen.getByRole('button', { name: 'topic-kitchen' }));
    expect(last()).toBe('words.topic.kitchen');
    expect(game.getAttribute('data-phase')).toBe('view');
    const card = window.__behocWords!.card()!;
    tick(1300);
    expect(last()).toBe(`words.${card}`);
    tick(3000);
    press(screen.getByTestId('card'));
    expect(last()).toBe(`words.${card}`);
    expect(screen.getByTestId('card').getAttribute('data-pressed')).toBe('');
  });

  it('xe cộ: đọc tên rồi phát tiếng thật', () => {
    const { last } = setup();
    press(screen.getByRole('button', { name: 'topic-vehicles' }));
    tick(1200);
    const card = window.__behocWords!.card()!;
    expect(last()).toBe(`words.${card}`);
    const s = soundKey(card);
    tick(1300);
    if (s) expect(last()).toBe(s);
  });

  it('nút sau/trước đổi thẻ và đọc tên', () => {
    const { last } = setup(24);
    press(screen.getByRole('button', { name: 'topic-home' }));
    const first = window.__behocWords!.card();
    press(screen.getByRole('button', { name: 'Thẻ sau' }));
    const second = window.__behocWords!.card();
    expect(second).not.toBe(first);
    expect(last()).toBe(`words.${second}`);
    press(screen.getByRole('button', { name: 'Thẻ trước' }));
    expect(window.__behocWords!.card()).toBe(first);
  });

  it('dưới 36 tháng không xen câu đố', () => {
    const { game } = setup(24);
    press(screen.getByRole('button', { name: 'topic-home' }));
    for (let i = 0; i < 10; i++) press(screen.getByRole('button', { name: 'Thẻ sau' }));
    expect(game.getAttribute('data-phase')).toBe('view');
  });

  it('≥36 tháng: sau 3 thẻ xen câu đố; chạm sai thì thẻ nói tên mình, thẻ đúng gợi ý; chạm đúng thì khen và về xem thẻ', () => {
    const { game, last, said } = setup(48);
    press(screen.getByRole('button', { name: 'topic-clothes' }));
    press(screen.getByRole('button', { name: 'Thẻ sau' }));
    press(screen.getByRole('button', { name: 'Thẻ sau' }));
    press(screen.getByRole('button', { name: 'Thẻ sau' }));
    expect(game.getAttribute('data-phase')).toBe('quiz');
    expect(last()).toBe('words.find');
    const q = window.__behocWords!.quiz()!;
    expect(q.choices).toHaveLength(3);
    tick(1800);
    expect(last()).toBe(`words.ask.${q.target}`);

    const wrong = q.choices.find((c) => c !== q.target)!;
    press(screen.getByTestId(`choice-${wrong}`));
    expect(last()).toBe(`words.this.${wrong}`);
    expect(said()).not.toContain('sfx.wrong');
    tick(1700);
    expect(last()).toBe(`words.ask.${q.target}`);
    expect(screen.getByTestId(`choice-${q.target}`).querySelector('[data-hint]')).not.toBeNull();

    press(screen.getByTestId(`choice-${q.target}`));
    expect(last()).toBe(`words.yes.${q.target}`);
    expect(screen.getByTestId(`choice-${q.target}`).hasAttribute('data-win')).toBe(true);
    expect(screen.getByTestId('sparkles')).toBeInTheDocument();
    tick(3400);
    expect(game.getAttribute('data-phase')).toBe('view');
    expect(last()).toBe(`words.${window.__behocWords!.card()}`);
  });

  it('nút chủ đề đưa về màn chọn chủ đề', () => {
    const { game } = setup();
    press(screen.getByRole('button', { name: 'topic-vehicles' }));
    press(screen.getByRole('button', { name: 'Chọn chủ đề' }));
    expect(game.getAttribute('data-phase')).toBe('topics');
  });
});

describe('Đồ vật quanh bé: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  beforeEach(() => window.history.pushState({}, '', '/?e2e=1'));
  afterEach(() => window.history.pushState({}, '', '/'));

  function chainSetup(ageMonths = 48) {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
    render(<Game lang="vi" speaker={sp} ageMonths={ageMonths} onExit={() => {}} />);
    return { chains, game: screen.getByTestId('game-words') };
  }

  it('chọn chủ đề xe: tên chủ đề đọc xong mới tới tên thẻ + tiếng thật (chung một lượt)', () => {
    const { chains } = chainSetup();
    press(screen.getByRole('button', { name: 'topic-vehicles' }));
    expect(chains.map((c) => c.keys)).toEqual([['words.topic.vehicles']]);
    act(() => chains[0].done());
    const card = window.__behocWords!.card()!;
    const s = soundKey(card);
    expect(chains[1].keys).toEqual(s ? [`words.${card}`, s] : [`words.${card}`]);
  });

  it('câu đố: "tìm thẻ" đọc xong mới hỏi; chạm sai: tên thẻ đọc xong mới hỏi lại; đúng: khen xong mới về thẻ', () => {
    const { chains, game } = chainSetup();
    press(screen.getByRole('button', { name: 'topic-clothes' }));
    for (let i = 0; i < 3; i++) press(screen.getByRole('button', { name: 'Thẻ sau' }));
    const q = window.__behocWords!.quiz()!;
    expect(chains.at(-1)!.keys).toEqual(['words.find']);
    act(() => chains.at(-1)!.done());
    expect(chains.at(-1)!.keys).toEqual([`words.ask.${q.target}`]);

    const wrong = q.choices.find((c) => c !== q.target)!;
    press(screen.getByTestId(`choice-${wrong}`));
    expect(chains.at(-1)!.keys).toEqual([`words.this.${wrong}`]);
    expect(screen.getByTestId(`choice-${q.target}`).querySelector('[data-hint]')).toBeNull();
    act(() => chains.at(-1)!.done());
    expect(chains.at(-1)!.keys).toEqual([`words.ask.${q.target}`]);

    press(screen.getByTestId(`choice-${q.target}`));
    expect(chains.at(-1)!.keys[0]).toBe(`words.yes.${q.target}`);
    expect(game.getAttribute('data-phase')).toBe('quiz');
    act(() => chains.at(-1)!.done());
    expect(game.getAttribute('data-phase')).toBe('view');
    expect(chains.at(-1)!.keys[0]).toBe(`words.${window.__behocWords!.card()}`);
  });
});

