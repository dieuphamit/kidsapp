import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
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
});
