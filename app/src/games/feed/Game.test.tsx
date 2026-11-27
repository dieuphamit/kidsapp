import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game from './Game';
import { ANIMAL_IDS, animalById, foodCountForAge, type AnimalId } from './logic';
import type { Speaker } from '../../core/audio';

const sounds = { munch: vi.fn(), pop: vi.fn(), happy: vi.fn() };
vi.mock('./sounds', () => ({ createFeedSounds: () => sounds }));

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

describe('Cho thú ăn', () => {
  beforeEach(() => vi.clearAllMocks());

  it('vào trò: chào, một con thú thật giữa màn, thanh no rỗng, khay đúng số món theo tuổi', () => {
    for (const age of [26, 40, 60]) {
      const sp = speaker();
      const { unmount } = render(<Game lang="vi" speaker={sp} ageMonths={age} onExit={() => {}} />);
      expect(sp.say).toHaveBeenCalledWith('feed.hello');
      const animal = screen.getByTestId('animal');
      const id = animal.getAttribute('data-animal') as AnimalId;
      expect(ANIMAL_IDS).toContain(id);
      expect(animal.querySelector('img')?.getAttribute('src')?.endsWith(`cards/${animalById(id).card}.png`)).toBe(true);
      expect(screen.getByTestId('fullness')).toHaveAttribute('data-bites', '0');
      const foods = document.querySelectorAll('[data-food]');
      expect(foods).toHaveLength(foodCountForAge(age));
      expect([...foods].map((f) => f.getAttribute('data-food'))).toContain(animalById(id).food);
      unmount();
    }
  });

  it('chạm thú: thú kêu ngay trong sự kiện pointerdown', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const animal = screen.getByTestId('animal');
    const id = animal.getAttribute('data-animal') as AnimalId;
    fireEvent.pointerDown(animal);
    expect(sp.say).toHaveBeenLastCalledWith(animalById(id).sound);
    expect(animal).toHaveAttribute('data-pressed', '');
  });

  it('chạm món: có tiếng và nhún ngay, nhả tay tại chỗ thì đọc tên món', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const food = document.querySelector<HTMLElement>('[data-food]')!;
    const id = food.getAttribute('data-food');
    fireEvent.pointerDown(food, { clientX: 10, clientY: 10 });
    expect(sounds.pop).toHaveBeenCalledTimes(1);
    expect(food).toHaveAttribute('data-pressed', '');
    fireEvent.pointerUp(food, { clientX: 10, clientY: 10 });
    expect(sp.say).toHaveBeenLastCalledWith(`feed.food.${id}`);
  });
});

describe('Cho thú ăn: câu chào đọc xong mới nói thú đói', () => {
  function chainSpeaker() {
    const chains: { keys: readonly string[]; done(): void }[] = [];
    const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
      keys.forEach((k, i) => opts?.onSay?.(k, i));
      chains.push({ keys, done: () => opts?.onDone?.() });
      return () => {};
    });
    return { sp: { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker, chains };
  }

  it('câu chào (~5,9s) đi một lượt sayThen; xong mới nói "bạn … đói"', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    expect(chains.map((c) => c.keys)).toEqual([['feed.hello']]);
    expect(sp.say).not.toHaveBeenCalled();
    act(() => chains[0].done());
    const id = screen.getByTestId('animal').getAttribute('data-animal');
    expect(sp.say).toHaveBeenLastCalledWith(`feed.hungry.${id}`);
  });

  it('bé chạm thú lúc câu chào chưa xong: không nói "đói" chen vào tiếng kêu', () => {
    const { sp, chains } = chainSpeaker();
    render(<Game lang="vi" speaker={sp} ageMonths={40} onExit={() => {}} />);
    const animal = screen.getByTestId('animal');
    const id = animal.getAttribute('data-animal') as AnimalId;
    fireEvent.pointerDown(animal);
    act(() => chains[0].done());
    expect(sp.say).toHaveBeenLastCalledWith(animalById(id).sound);
  });
});

