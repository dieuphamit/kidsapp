import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
