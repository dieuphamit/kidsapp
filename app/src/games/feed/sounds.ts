import { Howler } from 'howler';

/**
 * Tiếng tổng hợp bằng Web Audio cho trò Cho thú ăn (không cần file, không gọi mạng):
 * - munch: "măm măm măm", ba nhịp nhai (tiếng giòn qua lọc dải + tiếng trầm ngắn);
 * - pop: tiếng "bóp" nhỏ khi nhấc món lên;
 * - happy: ba nốt chuông đi lên khi thú no.
 * Không có AudioContext (jsdom, trình duyệt cũ) thì im lặng.
 */
export interface FeedSounds {
  munch(): void;
  pop(): void;
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

export function createFeedSounds(getCtx: () => AudioContext | null = defaultCtx): FeedSounds {
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

  const crunch = (ctx: AudioContext, at: number) => {
    const now = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1100 + Math.random() * 600;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.22, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.13);
    src.connect(f).connect(g).connect(out(ctx));
    src.start(now, Math.random() * 0.5);
    src.stop(now + 0.16);
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
    g.gain.linearRampToValueAtTime(peak, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.connect(g).connect(out(ctx));
    o.start(now);
    o.stop(now + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  };

  return {
    munch() {
      const ctx = ready();
      if (!ctx) return;
      for (let i = 0; i < 3; i++) {
        const at = i * 0.27;
        // "m": tiếng trầm ngậm miệng, rồi "ăm": tiếng giòn
        tone(ctx, 'triangle', 190, 150, at, 0.16, 0.2);
        crunch(ctx, at + 0.07);
      }
    },
    pop() {
      const ctx = ready();
      if (!ctx) return;
      tone(ctx, 'sine', 420, 900, 0, 0.11, 0.2);
    },
    happy() {
      const ctx = ready();
      if (!ctx) return;
      [784, 988, 1318.5].forEach((f, i) => tone(ctx, 'sine', f, f * 1.01, i * 0.12, 0.45, 0.16));
    },
  };
}
