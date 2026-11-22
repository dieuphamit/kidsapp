import { Howler } from 'howler';

/**
 * Tiếng tổng hợp bằng Web Audio cho trò Bếp nấu ăn (không cần file, không gọi mạng):
 * - pop: tiếng "bóp" nhỏ khi nhấc nguyên liệu;
 * - plop: tiếng "tõm" khi rơi vào nồi (nốt trầm trượt lên + bọt nước);
 * - whoosh: bật bếp, lửa phụt nhẹ;
 * - blub: vài tiếng "lục bục" của nồi sôi;
 * - munch: khách ăn "măm măm";
 * - happy: ba nốt chuông đi lên.
 * Không có AudioContext (jsdom, trình duyệt cũ) thì im lặng.
 */
export interface CookSounds {
  pop(): void;
  plop(): void;
  whoosh(): void;
  blub(): void;
  munch(): void;
  happy(): void;
}

function defaultCtx(): AudioContext | null {
  try {
    if (!Howler.ctx) Howler.volume();
    return Howler.ctx ?? null;
  } catch {
    return null;
  }
}

export function createCookSounds(getCtx: () => AudioContext | null = defaultCtx): CookSounds {
  let noise: AudioBuffer | null = null;

  const ready = (): AudioContext | null => {
    const ctx = getCtx();
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  };
  const out = (ctx: AudioContext): AudioNode => Howler.masterGain ?? ctx.destination;
  const noiseBuffer = (ctx: AudioContext) => {
    if (!noise) {
      noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  };

  const hiss = (ctx: AudioContext, at: number, dur: number, freq: number, peak: number, type: BiquadFilterType = 'bandpass') => {
    const now = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + dur * 0.3);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f).connect(g).connect(out(ctx));
    src.start(now, Math.random() * 0.5);
    src.stop(now + dur + 0.02);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  };

  const tone = (ctx: AudioContext, type: OscillatorType, from: number, to: number, at: number, dur: number, peak: number) => {
    const now = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(to, now + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(out(ctx));
    o.start(now);
    o.stop(now + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  };

  const play = (fn: (ctx: AudioContext) => void) => () => {
    const ctx = ready();
    if (ctx) fn(ctx);
  };

  return {
    pop: play((ctx) => tone(ctx, 'sine', 420, 900, 0, 0.11, 0.2)),
    plop: play((ctx) => {
      // "tõm": giọt to rơi xuống nước, rồi vài bọt nhỏ
      tone(ctx, 'sine', 180, 620, 0, 0.18, 0.32);
      hiss(ctx, 0.02, 0.22, 900, 0.12);
      [0.16, 0.24, 0.31].forEach((at, i) => tone(ctx, 'sine', 500 + i * 160, 900 + i * 200, at, 0.07, 0.08));
    }),
    whoosh: play((ctx) => {
      hiss(ctx, 0, 0.55, 500, 0.22, 'lowpass');
      tone(ctx, 'triangle', 90, 140, 0.05, 0.4, 0.08);
    }),
    blub: play((ctx) => {
      for (let i = 0; i < 4; i++) {
        const f = 220 + Math.random() * 180;
        tone(ctx, 'sine', f, f * 2.2, i * 0.13 + Math.random() * 0.05, 0.09, 0.14);
      }
    }),
    munch: play((ctx) => {
      for (let i = 0; i < 3; i++) {
        const at = i * 0.27;
        tone(ctx, 'triangle', 190, 150, at, 0.16, 0.2);
        hiss(ctx, at + 0.07, 0.13, 1100 + Math.random() * 600, 0.2);
      }
    }),
    happy: play((ctx) => {
      [784, 988, 1318.5].forEach((f, i) => tone(ctx, 'sine', f, f * 1.01, i * 0.12, 0.45, 0.16));
    }),
  };
}
