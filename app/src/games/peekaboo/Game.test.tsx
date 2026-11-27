import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Game from './Game';
import type { Speaker } from '../../core/audio';

// Mock CSS module
vi.mock('./Game.module.css', () => ({
  default: {
    container: 'container',
    grass: 'grass',
    bushArea: 'bushArea',
    bushContainer: 'bushContainer',
    bush: 'bush',
    shake: 'shake',
    wiggle: 'wiggle',
    split: 'split',
    animal: 'animal',
    animalEmoji: 'animalEmoji',
    animalJump: 'animalJump',
    hint: 'hint',
    hintEmoji: 'hintEmoji',
  },
}));

// Mock BackHome
vi.mock('../../ui/BackHome', () => ({
  BackHome: ({ onExit }: { onExit: () => void }) => (
    <button onClick={onExit} aria-label="Về nhà">
      🏠
    </button>
  ),
}));

function createMockSpeaker(): Speaker {
  return {
    say: vi.fn(),
    sfx: vi.fn(),
  };
}

describe('Game component', () => {
  it('renders với data-testid="game-peekaboo"', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
    expect(screen.getByTestId('game-peekaboo')).toBeInTheDocument();
  });

  it('gọi say("peek.hello") khi vào game', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
    expect(speaker.say).toHaveBeenCalledWith('peek.hello');
  });

  it('hiển thị 3 bụi cho bé < 36 tháng', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
    expect(screen.getByTestId('bush-0')).toBeInTheDocument();
    expect(screen.getByTestId('bush-1')).toBeInTheDocument();
    expect(screen.getByTestId('bush-2')).toBeInTheDocument();
    expect(screen.queryByTestId('bush-3')).not.toBeInTheDocument();
  });

  it('hiển thị 4 bụi cho bé 36-47 tháng', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={40} onExit={() => {}} />);
    expect(screen.getByTestId('bush-0')).toBeInTheDocument();
    expect(screen.getByTestId('bush-1')).toBeInTheDocument();
    expect(screen.getByTestId('bush-2')).toBeInTheDocument();
    expect(screen.getByTestId('bush-3')).toBeInTheDocument();
    expect(screen.queryByTestId('bush-4')).not.toBeInTheDocument();
  });

  it('hiển thị 5 bụi cho bé >= 48 tháng', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={50} onExit={() => {}} />);
    expect(screen.getByTestId('bush-0')).toBeInTheDocument();
    expect(screen.getByTestId('bush-1')).toBeInTheDocument();
    expect(screen.getByTestId('bush-2')).toBeInTheDocument();
    expect(screen.getByTestId('bush-3')).toBeInTheDocument();
    expect(screen.getByTestId('bush-4')).toBeInTheDocument();
  });

  it('có nút Về nhà', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
    expect(screen.getByLabelText('Về nhà')).toBeInTheDocument();
  });

  it('gọi onExit khi chạm nút Về nhà', async () => {
    const speaker = createMockSpeaker();
    const onExit = vi.fn();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={onExit} />);

    await userEvent.click(screen.getByLabelText('Về nhà'));
    expect(onExit).toHaveBeenCalled();
  });

  it('cập nhật data-last-say sau khi say', () => {
    const speaker = createMockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
    const container = screen.getByTestId('game-peekaboo');
    // Khi vào game, say('peek.hello') được gọi
    expect(container).toHaveAttribute('data-last-say', 'peek.hello');
  });
});

describe('tìm thấy thú', () => {
  it('phóng to thú ra giữa màn hình, nói tên rồi phát tiếng kêu thật, sau đó sang ván mới', () => {
    vi.useFakeTimers();
    try {
      const speaker = createMockSpeaker();
      render(<Game lang="vi" speaker={speaker} ageMonths={30} onExit={() => {}} />);
      expect(screen.queryByTestId('peek-reveal')).not.toBeInTheDocument();

      // Chạm lần lượt từng bụi tới khi thấy thú (bụi trống chỉ lắc)
      for (let i = 0; i < 3 && !screen.queryByTestId('peek-reveal'); i++) {
        fireEvent.pointerDown(screen.getByTestId(`bush-${i}`));
      }
      const reveal = screen.getByTestId('peek-reveal');
      const id = reveal.getAttribute('data-animal');
      expect(id).toBeTruthy();
      expect(speaker.say).toHaveBeenLastCalledWith('peek.found');

      act(() => vi.advanceTimersByTime(900));
      expect(speaker.say).toHaveBeenLastCalledWith(`animal.${id}`);

      act(() => vi.advanceTimersByTime(1300));
      expect(speaker.say).toHaveBeenLastCalledWith(`animal.${id}-sound`);
      expect(screen.getByTestId('peek-reveal')).toBeInTheDocument();

      act(() => vi.advanceTimersByTime(2800));
      expect(screen.queryByTestId('peek-reveal')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('manifest', () => {
  it('có đúng thông tin', async () => {
    const { manifest } = await import('./manifest');
    expect(manifest.id).toBe('peekaboo');
    expect(manifest.place).toBe('place.pond');
    expect(manifest.titleKey).toBe('game.peekaboo');
    expect(manifest.icon).toBe('🌳');
    expect(manifest.order).toBe(1);
    expect(manifest.minAge).toBe(24);
    expect(manifest.maxAge).toBe(60);
  });
});

describe('Ú òa: lời nói nối tiếp, câu sau không cắt câu trước', () => {
  it('tìm thấy: "Ú òa" đọc xong mới tới tên + tiếng kêu; kêu xong (và hết giờ lộ diện) mới sang ván mới', () => {
    vi.useFakeTimers();
    try {
      const chains: { keys: readonly string[]; done(): void }[] = [];
      const sayThen = vi.fn((keys: readonly string[], opts?: { onSay?(k: string, i: number): void; onDone?(): void }) => {
        keys.forEach((k, i) => opts?.onSay?.(k, i));
        chains.push({ keys, done: () => opts?.onDone?.() });
        return () => {};
      });
      const sp = { say: vi.fn(), sfx: vi.fn(), sayThen } satisfies Speaker;
      render(<Game lang="vi" speaker={sp} ageMonths={30} onExit={() => {}} />);
      for (let i = 0; i < 3 && !screen.queryByTestId('peek-reveal'); i++) {
        fireEvent.pointerDown(screen.getByTestId(`bush-${i}`));
      }
      const id = screen.getByTestId('peek-reveal').getAttribute('data-animal');
      expect(chains.map((c) => c.keys)).toEqual([['peek.found']]);
      act(() => chains[0].done());
      expect(chains[1].keys).toEqual([`animal.${id}`, `animal.${id}-sound`]);
      // hết giờ lộ diện nhưng thú còn đang kêu: chưa sang ván mới
      act(() => vi.advanceTimersByTime(6000));
      expect(screen.getByTestId('peek-reveal')).toBeInTheDocument();
      act(() => chains[1].done());
      expect(screen.queryByTestId('peek-reveal')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});

