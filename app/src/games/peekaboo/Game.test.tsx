import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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

describe('manifest', () => {
  it('có đúng thông tin', async () => {
    const { manifest } = await import('./manifest');
    expect(manifest.id).toBe('peekaboo');
    expect(manifest.place).toBe('place.zoo');
    expect(manifest.titleKey).toBe('game.peekaboo');
    expect(manifest.icon).toBe('🌳');
    expect(manifest.order).toBe(1);
    expect(manifest.minAge).toBe(24);
    expect(manifest.maxAge).toBe(60);
  });
});
