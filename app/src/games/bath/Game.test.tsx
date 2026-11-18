import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Game from './Game';
import { BATH_ANIMALS } from './logic';
import type { Speaker } from '../../core/audio';

const sounds = { pop: vi.fn(), scrub: vi.fn(), shower: vi.fn(), sparkle: vi.fn() };
vi.mock('./sounds', () => ({ createBathSounds: () => sounds }));

function speaker(): Speaker {
  return { say: vi.fn(), sfx: vi.fn() };
}

describe('Tắm cho thú', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom không có canvas 2D: getContext trả null (Game bỏ qua phần vẽ)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  });

  it('vào trò: có khung thú, nói câu giới thiệu đúng con đang tắm', () => {
    const sp = speaker();
    render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
    expect(screen.getByTestId('game-bath')).toBeInTheDocument();
    const tub = screen.getByTestId('bath-tub');
    const animal = tub.getAttribute('data-animal')!;
    expect(BATH_ANIMALS).toContain(animal);
    expect(tub).toHaveAttribute('data-phase', 'scrub');
    expect(sp.say).toHaveBeenCalledWith(`bath.dirty.${animal}`);
    expect(screen.getByTestId('game-bath')).toHaveAttribute('data-last-say', `bath.dirty.${animal}`);
  });

  it('ảnh thú là ảnh thật lớn cards/bath/<id>.png', () => {
    const { container } = render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={() => {}} />);
    const animal = screen.getByTestId('bath-tub').getAttribute('data-animal');
    expect(container.querySelector('img')?.getAttribute('src')?.endsWith(`cards/bath/${animal}.png`)).toBe(true);
  });

  it('chạm xuống thú có tiếng bong bóng ngay (trong cùng sự kiện pointerdown)', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={() => {}} />);
    fireEvent.pointerDown(screen.getByTestId('bath-canvas'), { pointerId: 1 });
    expect(sounds.pop).toHaveBeenCalledTimes(1);
  });

  it('chưa sạch thì chưa có vòi sen; không có nút nào khác ngoài Về nhà', () => {
    render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={() => {}} />);
    expect(screen.queryByTestId('bath-shower')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Về nhà']);
  });

  it('nút Về nhà thoát trò', () => {
    const onExit = vi.fn();
    render(<Game lang="vi" speaker={speaker()} ageMonths={30} onExit={onExit} />);
    fireEvent.pointerDown(screen.getByLabelText('Về nhà'));
    expect(onExit).toHaveBeenCalled();
  });
});
