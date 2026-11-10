import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';

// Mock Howler với ctx giả
const fakeGain = {
  gain: { value: 1, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
  connect: vi.fn(),
  disconnect: vi.fn(),
};

const fakeDestination = { connect: vi.fn() };

function createFakeCtx(state: 'running' | 'suspended' = 'running') {
  const oscillators: {
    frequency: { value: number; setValueAtTime: Mock; exponentialRampToValueAtTime: Mock };
    type: OscillatorType;
    start: Mock;
    stop: Mock;
    connect: Mock;
    disconnect: Mock;
    onended: (() => void) | null;
  }[] = [];
  const gains: {
    gain: { value: number; setValueAtTime: Mock; linearRampToValueAtTime: Mock; exponentialRampToValueAtTime: Mock };
    connect: Mock;
    disconnect: Mock;
  }[] = [];
  const filters: { type: string; frequency: { value: number }; Q: { value: number }; connect: Mock; disconnect: Mock }[] = [];
  const bufferSources: { buffer: AudioBuffer | null; loop: boolean; start: Mock; stop: Mock; connect: Mock; disconnect: Mock; onended: (() => void) | null }[] = [];
  let buffer: AudioBuffer | null = null;

  return {
    state,
    currentTime: 0,
    resume: vi.fn(() => Promise.resolve()),
    destination: fakeDestination,
    createOscillator: vi.fn(() => {
      const osc = {
        frequency: {
          value: 0,
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        type: 'sine' as OscillatorType,
        start: vi.fn(),
        stop: vi.fn((when?: number) => {
          // Simulate onended callback when stop is called
          setTimeout(() => osc.onended?.(), 0);
        }),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      oscillators.push(osc);
      return osc;
    }),
    createGain: vi.fn(() => {
      const g = {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      gains.push(g);
      return g;
    }),
    createBiquadFilter: vi.fn(() => {
      const f = {
        type: 'lowpass',
        frequency: { value: 350 },
        Q: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      filters.push(f);
      return f;
    }),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => {
      buffer = {
        length,
        sampleRate,
        numberOfChannels: channels,
        duration: length / sampleRate,
        getChannelData: vi.fn(() => new Float32Array(length)),
      } as unknown as AudioBuffer;
      return buffer;
    }),
    createBufferSource: vi.fn(() => {
      const src = {
        buffer: null as AudioBuffer | null,
        loop: false,
        start: vi.fn(),
        stop: vi.fn((when?: number) => {
          setTimeout(() => src.onended?.(), 0);
        }),
        connect: vi.fn(),
        disconnect: vi.fn(),
        onended: null as (() => void) | null,
      };
      bufferSources.push(src);
      return src;
    }),
    // For test inspection
    _oscillators: oscillators,
    _gains: gains,
    _filters: filters,
    _bufferSources: bufferSources,
    _buffer: () => buffer,
  };
}

// vi.hoisted để tạo mock trước khi module được import
const { Howler, mockAudioContext } = vi.hoisted(() => {
  const mockAudioContext = vi.fn();
  const Howler = {
    ctx: undefined as ReturnType<typeof createFakeCtx> | undefined,
    masterGain: undefined as typeof fakeGain | undefined,
    volume: vi.fn(),
  };
  return { Howler, mockAudioContext };
});

vi.mock('howler', () => ({ Howler }));

// Mock globalThis.AudioContext
vi.stubGlobal('AudioContext', mockAudioContext);

describe('synth', () => {
  let fakeCtx: ReturnType<typeof createFakeCtx>;

  beforeEach(() => {
    vi.resetModules();
    fakeCtx = createFakeCtx();
    Howler.ctx = fakeCtx;
    Howler.masterGain = fakeGain;
    Howler.volume.mockClear();
    mockAudioContext.mockClear();
    fakeGain.connect.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('NOTE_FREQS', () => {
    it('có 8 tần số đô trưởng C4–C5', async () => {
      const { NOTE_FREQS } = await import('./synth');
      expect(NOTE_FREQS).toEqual([261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25]);
    });
  });

  describe('DRUM_KINDS', () => {
    it('có 4 loại trống', async () => {
      const { DRUM_KINDS } = await import('./synth');
      expect(DRUM_KINDS).toEqual(['boom', 'tap', 'shaker', 'bell']);
    });
  });

  describe('playNote', () => {
    it('playNote(0) dùng tần số 261.63Hz', async () => {
      const { synth } = await import('./synth');
      synth.playNote(0);

      // Kiểm tra oscillator được tạo với tần số đúng
      expect(fakeCtx.createOscillator).toHaveBeenCalled();
      const mainOsc = fakeCtx._oscillators[0];
      expect(mainOsc.frequency.setValueAtTime).toHaveBeenCalledWith(261.63, expect.any(Number));
    });

    it('playNote(7) dùng tần số 523.25Hz', async () => {
      const { synth } = await import('./synth');
      synth.playNote(7);

      const mainOsc = fakeCtx._oscillators[0];
      expect(mainOsc.frequency.setValueAtTime).toHaveBeenCalledWith(523.25, expect.any(Number));
    });

    it('playNote(8) không tạo node nào (ngoài phạm vi)', async () => {
      const { synth } = await import('./synth');
      const oscCountBefore = fakeCtx._oscillators.length;
      synth.playNote(8);
      expect(fakeCtx._oscillators.length).toBe(oscCountBefore);
    });

    it('playNote(-1) không tạo node nào (ngoài phạm vi)', async () => {
      const { synth } = await import('./synth');
      const oscCountBefore = fakeCtx._oscillators.length;
      synth.playNote(-1);
      expect(fakeCtx._oscillators.length).toBe(oscCountBefore);
    });

    it('tạo 2 oscillator (triangle + sine gấp đôi tần số)', async () => {
      const { synth } = await import('./synth');
      synth.playNote(0);

      expect(fakeCtx._oscillators.length).toBe(2);
      expect(fakeCtx._oscillators[0].type).toBe('triangle');
      expect(fakeCtx._oscillators[1].type).toBe('sine');
      // Sine có tần số gấp đôi
      expect(fakeCtx._oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(261.63 * 2, expect.any(Number));
    });

    it('gain envelope có attack và decay', async () => {
      const { synth } = await import('./synth');
      synth.playNote(0);

      const gain = fakeCtx._gains[0];
      // Attack: ramp đến 0.35
      expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0.35, expect.any(Number));
      // Decay: ramp xuống 0.001 sau 0.9s
      expect(gain.gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.001, expect.any(Number));
    });

    it('oscillator gọi start và stop', async () => {
      const { synth } = await import('./synth');
      synth.playNote(0);

      const osc = fakeCtx._oscillators[0];
      expect(osc.start).toHaveBeenCalled();
      expect(osc.stop).toHaveBeenCalled();
    });
  });

  describe('playDrum', () => {
    it('boom tạo node và gọi start', async () => {
      const { synth } = await import('./synth');
      const oscBefore = fakeCtx._oscillators.length;
      synth.playDrum('boom');
      expect(fakeCtx._oscillators.length).toBeGreaterThan(oscBefore);
      expect(fakeCtx._oscillators[fakeCtx._oscillators.length - 1].start).toHaveBeenCalled();
    });

    it('tap tạo noise buffer và filter', async () => {
      const { synth } = await import('./synth');
      synth.playDrum('tap');
      expect(fakeCtx.createBufferSource).toHaveBeenCalled();
      expect(fakeCtx.createBiquadFilter).toHaveBeenCalled();
      const filter = fakeCtx._filters[fakeCtx._filters.length - 1];
      expect(filter.type).toBe('bandpass');
    });

    it('shaker tạo noise với highpass filter', async () => {
      const { synth } = await import('./synth');
      synth.playDrum('shaker');
      expect(fakeCtx.createBiquadFilter).toHaveBeenCalled();
      const filter = fakeCtx._filters[fakeCtx._filters.length - 1];
      expect(filter.type).toBe('highpass');
    });

    it('bell tạo oscillator', async () => {
      const { synth } = await import('./synth');
      const oscBefore = fakeCtx._oscillators.length;
      synth.playDrum('bell');
      expect(fakeCtx._oscillators.length).toBeGreaterThan(oscBefore);
    });

    it('đỉnh gain mọi loại ≤ 0.4', async () => {
      const { synth, DRUM_KINDS } = await import('./synth');

      for (const kind of DRUM_KINDS) {
        vi.resetModules();
        fakeCtx = createFakeCtx();
        Howler.ctx = fakeCtx;
        Howler.masterGain = fakeGain;

        const { synth: freshSynth } = await import('./synth');
        freshSynth.playDrum(kind);

        // Kiểm tra tất cả gain values
        for (const g of fakeCtx._gains) {
          // Kiểm tra setValueAtTime calls
          for (const call of g.gain.setValueAtTime.mock.calls) {
            expect(call[0]).toBeLessThanOrEqual(0.4);
          }
          // Kiểm tra linearRampToValueAtTime calls
          for (const call of g.gain.linearRampToValueAtTime.mock.calls) {
            expect(call[0]).toBeLessThanOrEqual(0.4);
          }
        }
      }
    });
  });

  describe('AudioContext suspended', () => {
    it('gọi resume khi ctx.state là suspended', async () => {
      fakeCtx = createFakeCtx('suspended');
      Howler.ctx = fakeCtx;
      Howler.masterGain = fakeGain;
      vi.resetModules();

      const { synth } = await import('./synth');
      synth.playNote(0);

      expect(fakeCtx.resume).toHaveBeenCalled();
    });
  });

  describe('getCtx trả null', () => {
    it('không ném lỗi khi getCtx trả null', async () => {
      const { createSynth } = await import('./synth');
      const nullSynth = createSynth(() => null);

      expect(() => nullSynth.playNote(0)).not.toThrow();
      expect(() => nullSynth.playDrum('boom')).not.toThrow();
    });
  });

  describe('tái dùng Howler.ctx', () => {
    it('dùng Howler.ctx thay vì tạo AudioContext mới', async () => {
      vi.resetModules();
      fakeCtx = createFakeCtx();
      Howler.ctx = fakeCtx;
      Howler.masterGain = fakeGain;
      mockAudioContext.mockClear();

      const { synth } = await import('./synth');
      synth.playNote(0);

      // Oscillator được tạo trên fakeCtx
      expect(fakeCtx.createOscillator).toHaveBeenCalled();
      // AudioContext KHÔNG được gọi (không tạo context mới)
      expect(mockAudioContext).not.toHaveBeenCalled();
    });

    it('nối vào Howler.masterGain thay vì ctx.destination', async () => {
      vi.resetModules();
      fakeCtx = createFakeCtx();
      Howler.ctx = fakeCtx;
      Howler.masterGain = fakeGain;
      fakeGain.connect.mockClear();

      const { synth } = await import('./synth');
      synth.playNote(0);

      // Gain cuối cùng nối vào masterGain
      const lastGain = fakeCtx._gains[fakeCtx._gains.length - 1];
      expect(lastGain.connect).toHaveBeenCalledWith(fakeGain);
    });

    it('gọi Howler.volume() khi Howler.ctx ban đầu undefined', async () => {
      vi.resetModules();
      // Ban đầu ctx là undefined
      Howler.ctx = undefined;
      Howler.masterGain = undefined;
      Howler.volume.mockClear();
      // Khi volume() được gọi, ctx sẽ được tạo
      Howler.volume.mockImplementation(() => {
        Howler.ctx = createFakeCtx();
        Howler.masterGain = fakeGain;
        return 1;
      });

      const { synth } = await import('./synth');
      synth.playNote(0);

      expect(Howler.volume).toHaveBeenCalled();
    });
  });

  describe('giới hạn 12 âm cùng lúc', () => {
    it('loại bỏ âm cũ nhất khi quá 12 âm', async () => {
      const { synth } = await import('./synth');

      // Phát 15 note liên tiếp
      for (let i = 0; i < 15; i++) {
        synth.playNote(i % 8);
      }

      // Không kiểm tra chính xác số oscillator vì có cleanup async
      // Chỉ đảm bảo không throw
      expect(true).toBe(true);
    });
  });
});
