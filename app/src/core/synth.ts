import { Howler } from 'howler';

/** 8 tần số đô trưởng C4–C5 */
export const NOTE_FREQS = [261.63, 293.66, 329.63, 349.23, 392.0, 440.0, 493.88, 523.25] as const;

/** 4 loại trống: trống cái, trống con, lắc, chuông */
export type DrumKind = 'boom' | 'tap' | 'shaker' | 'bell';
export const DRUM_KINDS: DrumKind[] = ['boom', 'tap', 'shaker', 'bell'];

/** Giới hạn tối đa số âm cùng lúc */
const MAX_VOICES = 12;

export interface Synth {
  playNote(i: number): void;
  playDrum(kind: DrumKind): void;
}

/** Lấy AudioContext từ Howler, tạo nếu chưa có (qua Howler.volume()) */
function defaultCtx(): AudioContext | null {
  if (!Howler.ctx) {
    // Gọi volume() để trigger setupAudioContext() trong Howler
    Howler.volume();
  }
  return Howler.ctx ?? null;
}

/** Lấy destination từ Howler.masterGain hoặc ctx.destination */
function defaultDest(ctx: AudioContext): AudioNode {
  return Howler.masterGain ?? ctx.destination;
}

/**
 * Tạo synth với AudioContext và destination tùy chỉnh
 * @param getCtx - Hàm trả AudioContext hoặc null (môi trường không có Web Audio)
 * @param getDest - Hàm trả AudioNode để nối đầu ra
 */
export function createSynth(
  getCtx: () => AudioContext | null,
  getDest: (ctx: AudioContext) => AudioNode = (ctx) => ctx.destination,
): Synth {
  // Danh sách các âm đang phát để giới hạn số lượng
  const activeVoices: { stop: () => void; startTime: number }[] = [];
  // Noise buffer tái sử dụng cho drum
  let noiseBuffer: AudioBuffer | null = null;

  function ensureCtxRunning(ctx: AudioContext): void {
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
  }

  function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (noiseBuffer) return noiseBuffer;
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 0.5; // 0.5 giây noise
    noiseBuffer = ctx.createBuffer(1, length, sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
  }

  function addVoice(voice: { stop: () => void; startTime: number }): void {
    activeVoices.push(voice);
    // Nếu quá giới hạn, dừng âm cũ nhất
    while (activeVoices.length > MAX_VOICES) {
      const oldest = activeVoices.shift();
      if (oldest) {
        try {
          oldest.stop();
        } catch {
          // Ignore errors from already stopped nodes
        }
      }
    }
  }

  function removeVoice(voice: { stop: () => void; startTime: number }): void {
    const idx = activeVoices.indexOf(voice);
    if (idx !== -1) {
      activeVoices.splice(idx, 1);
    }
  }

  function playNote(i: number): void {
    // Bỏ qua index ngoài phạm vi
    if (i < 0 || i > 7) return;

    const ctx = getCtx();
    if (!ctx) return;

    ensureCtxRunning(ctx);

    const freq = NOTE_FREQS[i];
    const dest = getDest(ctx);
    const now = ctx.currentTime;

    // Tạo gain chung cho cả 2 oscillator
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0, now);
    // Attack: 5ms đến 0.35
    gainNode.gain.linearRampToValueAtTime(0.35, now + 0.005);
    // Decay: giảm về 0.001 sau 0.9s
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    gainNode.connect(dest);

    // Oscillator chính: triangle
    const oscMain = ctx.createOscillator();
    oscMain.type = 'triangle';
    oscMain.frequency.setValueAtTime(freq, now);
    oscMain.connect(gainNode);
    oscMain.start(now);
    oscMain.stop(now + 0.9);

    // Oscillator phụ: sine gấp đôi tần số, gain nhỏ hơn
    const gainHarmonic = ctx.createGain();
    gainHarmonic.gain.setValueAtTime(0, now);
    gainHarmonic.gain.linearRampToValueAtTime(0.15, now + 0.005);
    gainHarmonic.gain.exponentialRampToValueAtTime(0.001, now + 0.9);
    gainHarmonic.connect(dest);

    const oscHarmonic = ctx.createOscillator();
    oscHarmonic.type = 'sine';
    oscHarmonic.frequency.setValueAtTime(freq * 2, now);
    oscHarmonic.connect(gainHarmonic);
    oscHarmonic.start(now);
    oscHarmonic.stop(now + 0.9);

    // Theo dõi voice
    const voice = {
      stop: () => {
        try {
          oscMain.stop();
          oscHarmonic.stop();
        } catch {
          // Already stopped
        }
      },
      startTime: now,
    };
    addVoice(voice);

    // Cleanup khi kết thúc
    oscMain.onended = () => {
      oscMain.disconnect();
      gainNode.disconnect();
      oscHarmonic.disconnect();
      gainHarmonic.disconnect();
      removeVoice(voice);
    };
  }

  function playDrum(kind: DrumKind): void {
    const ctx = getCtx();
    if (!ctx) return;

    ensureCtxRunning(ctx);

    const dest = getDest(ctx);
    const now = ctx.currentTime;

    switch (kind) {
      case 'boom': {
        // Sine 140Hz trượt xuống 50Hz trong 0.25s
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.25);

        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        osc.connect(gain);
        gain.connect(dest);
        osc.start(now);
        osc.stop(now + 0.25);

        const voice = { stop: () => { try { osc.stop(); } catch { /* */ } }, startTime: now };
        addVoice(voice);
        osc.onended = () => {
          osc.disconnect();
          gain.disconnect();
          removeVoice(voice);
        };
        break;
      }

      case 'tap': {
        // Noise qua bandpass ~1800Hz, 0.15s
        const buffer = createNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        source.start(now);
        source.stop(now + 0.15);

        const voice = { stop: () => { try { source.stop(); } catch { /* */ } }, startTime: now };
        addVoice(voice);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          removeVoice(voice);
        };
        break;
      }

      case 'shaker': {
        // Noise qua highpass ~6000Hz, 0.12s
        const buffer = createNoiseBuffer(ctx);
        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 6000;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(dest);
        source.start(now);
        source.stop(now + 0.12);

        const voice = { stop: () => { try { source.stop(); } catch { /* */ } }, startTime: now };
        addVoice(voice);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
          removeVoice(voice);
        };
        break;
      }

      case 'bell': {
        // Sine 880Hz + 1320Hz, decay 1.2s
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        gain.connect(dest);

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc1.connect(gain);
        osc1.start(now);
        osc1.stop(now + 1.2);

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1320, now);

        const gain2 = ctx.createGain();
        gain2.gain.setValueAtTime(0.15, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
        gain2.connect(dest);
        osc2.connect(gain2);
        osc2.start(now);
        osc2.stop(now + 1.2);

        const voice = {
          stop: () => {
            try {
              osc1.stop();
              osc2.stop();
            } catch { /* */ }
          },
          startTime: now,
        };
        addVoice(voice);
        osc1.onended = () => {
          osc1.disconnect();
          osc2.disconnect();
          gain.disconnect();
          gain2.disconnect();
          removeVoice(voice);
        };
        break;
      }
    }
  }

  return { playNote, playDrum };
}

/** Instance mặc định dùng Howler.ctx */
export const synth = createSynth(defaultCtx, defaultDest);
