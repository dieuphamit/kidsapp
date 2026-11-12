import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Game, { LOOP_START_MS } from './Game';
import type { Speaker } from '../../core/audio';

vi.mock('../../ui/BackHome', () => ({
  BackHome: ({ onExit }: { onExit: () => void }) => (
    <button onClick={onExit} aria-label="Về nhà">
      🏠
    </button>
  ),
}));

type SayMock = ReturnType<typeof vi.fn<(key: string) => void>>;

function mockSpeaker(): Speaker & { say: SayMock } {
  return { say: vi.fn<(key: string) => void>(), sfx: vi.fn() };
}

const sounds = (s: { say: SayMock }) =>
  s.say.mock.calls.map((c) => c[0] as string).filter((k) => k.endsWith('-sound'));

describe('Ban nhạc thú', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('vào game nói band.hello, có sẵn dog ở ô 1', () => {
    const speaker = mockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    expect(speaker.say).toHaveBeenCalledWith('band.hello');
    const game = screen.getByTestId('game-band');
    expect(game).toHaveAttribute('data-last-say', 'band.hello');
    expect(screen.getByTestId('slot-0')).toHaveAttribute('data-animal', 'dog');
    expect(screen.getByTestId('slot-1')).not.toHaveAttribute('data-animal');
  });

  it('vòng lặp 4 nhịp: nhịp có con vật thì phát tiếng kêu, ô trống là nghỉ', () => {
    const speaker = mockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    const game = screen.getByTestId('game-band');
    act(() => {
      vi.advanceTimersByTime(LOOP_START_MS);
    });
    // nhịp 0: dog
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(game).toHaveAttribute('data-beat', '0');
    expect(sounds(speaker)).toEqual(['animal.dog-sound']);
    // nhịp 1, 2, 3: nghỉ
    act(() => {
      vi.advanceTimersByTime(650 * 3);
    });
    expect(game).toHaveAttribute('data-beat', '3');
    expect(sounds(speaker)).toEqual(['animal.dog-sound']);
    // vòng 2: dog lại
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(game).toHaveAttribute('data-beat', '0');
    expect(sounds(speaker)).toEqual(['animal.dog-sound', 'animal.dog-sound']);
  });

  it('vòng lặp dừng khi sân khấu trống', () => {
    const speaker = mockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(LOOP_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(sounds(speaker)).toHaveLength(1);
    // chạm dog trên sân khấu → về khay
    fireEvent.pointerDown(screen.getByLabelText('Ô 1: dog'));
    expect(screen.getByTestId('slot-0')).not.toHaveAttribute('data-animal');
    act(() => {
      vi.advanceTimersByTime(650 * 8);
    });
    expect(sounds(speaker)).toHaveLength(1);
    expect(screen.getByTestId('game-band')).not.toHaveAttribute('data-beat');
  });

  it('tempo: rùa chậm 900ms, chạm lại về bình thường', () => {
    const speaker = mockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    fireEvent.pointerDown(screen.getByLabelText('Chậm'));
    expect(speaker.say).toHaveBeenLastCalledWith('band.slow');
    act(() => {
      vi.advanceTimersByTime(LOOP_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(sounds(speaker)).toHaveLength(0);
    act(() => {
      vi.advanceTimersByTime(250);
    });
    expect(sounds(speaker)).toEqual(['animal.dog-sound']);
    fireEvent.pointerDown(screen.getByLabelText('Nhanh'));
    expect(speaker.say).toHaveBeenLastCalledWith('band.fast');
    expect(screen.getByTestId('tempo-fast')).toHaveAttribute('data-active');
    expect(screen.getByTestId('tempo-slow')).not.toHaveAttribute('data-active');
    fireEvent.pointerDown(screen.getByLabelText('Nhanh'));
    expect(screen.getByTestId('tempo-fast')).not.toHaveAttribute('data-active');
    expect(screen.getByTestId('game-band')).toHaveAttribute('data-tempo', 'normal');
  });

  it('speaker có note(): nhịp phát bằng note, không cắt lời nói qua say()', () => {
    const speaker = { ...mockSpeaker(), note: vi.fn<(name: string) => void>() };
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    act(() => {
      vi.advanceTimersByTime(LOOP_START_MS);
    });
    act(() => {
      vi.advanceTimersByTime(650);
    });
    expect(speaker.note).toHaveBeenCalledWith('animal-dog');
    expect(sounds(speaker)).toEqual([]);
    expect(screen.getByTestId('game-band')).toHaveAttribute('data-last-say', 'animal.dog-sound');
  });

  it('chạm con vật ở khay (không kéo) → nghe tiếng kêu một lần', () => {
    const speaker = mockSpeaker();
    render(<Game lang="vi" speaker={speaker} ageMonths={36} onExit={() => {}} />);
    const cow = screen.getByTestId('tray-cow');
    fireEvent.pointerDown(cow, { clientX: 100, clientY: 100, pointerId: 1 });
    fireEvent.pointerUp(cow, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(sounds(speaker)).toEqual(['animal.cow-sound']);
    expect(screen.getByTestId('game-band')).toHaveAttribute('data-last-say', 'animal.cow-sound');
  });
});
