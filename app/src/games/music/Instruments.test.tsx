import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { Instruments } from './Instruments';

describe('Instruments', () => {
  it('pointerDown "Phím 1" gọi playNote(0)', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const key1 = getByLabelText('Phím 1');
    fireEvent.pointerDown(key1);

    expect(mockSynth.playNote).toHaveBeenCalledWith(0);
  });

  it('pointerDown "Phím 8" gọi playNote(7)', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const key8 = getByLabelText('Phím 8');
    fireEvent.pointerDown(key8);

    expect(mockSynth.playNote).toHaveBeenCalledWith(7);
  });

  it('pointerDown "Trống to" gọi playDrum("boom")', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const boom = getByLabelText('Trống to');
    fireEvent.pointerDown(boom);

    expect(mockSynth.playDrum).toHaveBeenCalledWith('boom');
  });

  it('pointerDown "Trống nhỏ" gọi playDrum("tap")', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const tap = getByLabelText('Trống nhỏ');
    fireEvent.pointerDown(tap);

    expect(mockSynth.playDrum).toHaveBeenCalledWith('tap');
  });

  it('pointerDown "Cái lắc" gọi playDrum("shaker")', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const shaker = getByLabelText('Cái lắc');
    fireEvent.pointerDown(shaker);

    expect(mockSynth.playDrum).toHaveBeenCalledWith('shaker');
  });

  it('pointerDown "Cái chuông" gọi playDrum("bell")', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    const bell = getByLabelText('Cái chuông');
    fireEvent.pointerDown(bell);

    expect(mockSynth.playDrum).toHaveBeenCalledWith('bell');
  });

  it('có đúng 8 phím đàn', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    for (let i = 1; i <= 8; i++) {
      expect(getByLabelText(`Phím ${i}`)).toBeDefined();
    }
  });

  it('có đúng 4 trống', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { getByLabelText } = render(<Instruments synth={mockSynth} />);

    expect(getByLabelText('Trống to')).toBeDefined();
    expect(getByLabelText('Trống nhỏ')).toBeDefined();
    expect(getByLabelText('Cái lắc')).toBeDefined();
    expect(getByLabelText('Cái chuông')).toBeDefined();
  });

  it('mức dễ: 5 phím, 2 trống (trống to, chuông)', () => {
    const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
    const { queryByLabelText, getByLabelText } = render(<Instruments synth={mockSynth} level="easy" />);
    for (let i = 1; i <= 5; i++) expect(getByLabelText(`Phím ${i}`)).toBeDefined();
    expect(queryByLabelText('Phím 6')).toBeNull();
    expect(getByLabelText('Trống to')).toBeDefined();
    expect(getByLabelText('Cái chuông')).toBeDefined();
    expect(queryByLabelText('Trống nhỏ')).toBeNull();
  });

  it('bài dẫn: nói tên bài, phím sáng là nốt kế; chạm đúng thì tiến, chạm hết bài thì khen', () => {
    vi.useFakeTimers();
    try {
      const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
      const say = vi.fn();
      const { getByLabelText, getByTestId } = render(<Instruments synth={mockSynth} level="easy" say={say} />);
      const box = getByTestId('instruments');
      const song = box.getAttribute('data-song');
      expect(say).toHaveBeenCalledWith(`song.${song}`);
      const length = Number(box.getAttribute('data-length'));
      expect(length).toBeGreaterThan(2);

      // phím khác phím sáng: vẫn kêu, không tiến, không âm báo sai
      const next = Number(box.getAttribute('data-next-key'));
      const other = (next + 1) % 5;
      fireEvent.pointerDown(getByLabelText(`Phím ${other + 1}`));
      expect(mockSynth.playNote).toHaveBeenCalledWith(other);
      expect(box.getAttribute('data-pos')).toBe('0');

      for (let i = 0; i < length; i++) {
        const k = Number(box.getAttribute('data-next-key'));
        fireEvent.pointerDown(getByLabelText(`Phím ${k + 1}`));
      }
      expect(box.getAttribute('data-pos')).toBe(String(length));
      expect(box).toHaveAttribute('data-cheer');
      act(() => {
        vi.advanceTimersByTime(700);
      });
      expect(say).toHaveBeenCalledWith('music.song-done');
      // sau khi đàn lại mẫu: sang bài khác
      act(() => {
        vi.advanceTimersByTime(20000);
      });
      expect(box.getAttribute('data-song')).not.toBe(song);
      expect(box.getAttribute('data-pos')).toBe('0');
    } finally {
      vi.useRealTimers();
    }
  });

  it('nút Bài khác đổi bài; Nghe mẫu đàn cả câu', () => {
    vi.useFakeTimers();
    try {
      const mockSynth = { playNote: vi.fn(), playDrum: vi.fn() };
      const { getByLabelText, getByTestId } = render(<Instruments synth={mockSynth} level="medium" />);
      const box = getByTestId('instruments');
      const song = box.getAttribute('data-song');
      fireEvent.pointerDown(getByLabelText('Nghe mẫu'));
      act(() => {
        vi.advanceTimersByTime(30000);
      });
      expect(mockSynth.playNote.mock.calls.length).toBe(Number(box.getAttribute('data-length')));
      fireEvent.pointerDown(getByLabelText('Bài khác'));
      expect(box.getAttribute('data-song')).not.toBe(song);
    } finally {
      vi.useRealTimers();
    }
  });
});
