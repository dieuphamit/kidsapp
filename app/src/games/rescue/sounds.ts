import { Howler } from 'howler';

/**
 * Tiếng tổng hợp bằng Web Audio cho trò Đội cứu hộ (không cần file, không gọi mạng). Tất cả đều dịu:
 * - bell: chuông báo "ting ting" nhẹ; horn: còi xe "bíp bíp" tròn tiếng; vroom: nổ máy;
 * - siren: một nhịp còi "nee-naw" êm (gọi lặp lại lúc xe chạy);
 * - pop: nhấc dụng cụ; ding: xong một bước; spray: tia nước; fizz: lửa tắt xèo; wipe: lau;
 * - happy: ba nốt chuông đi lên khi cứu xong.
 * Không có AudioContext (jsdom, trình duyệt cũ) thì im lặng.
 */
export interface RescueSounds {
  bell(): void;
  horn(): void;
  vroom(): void;
  siren(): void;
  pop(): void;
  ding(): void;
  spray(): void;
  fizz(): void;
  wipe(): void;
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

export function createRescueSounds(getCtx: () => AudioContext | null = defaultCtx): RescueSounds {
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

  /** Một nốt: lên nhanh trong `attack` giây rồi tắt dần. */
  const tone = (ctx: AudioContext, type: OscillatorType, from: number, to: number, at: number, dur: number, peak: number, attack = 0.012) => {
    const now = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(to, now + dur * 0.8);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
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
    bell: play((ctx) => {
      [0, 0.22, 0.44].forEach((at) => {
        tone(ctx, 'sine', 1046.5, 1046.5, at, 0.5, 0.13);
        tone(ctx, 'sine', 1568, 1568, at, 0.32, 0.05);
      });
    }),
    horn: play((ctx) => {
      [0, 0.2].forEach((at) => {
        tone(ctx, 'triangle', 392, 392, at, 0.16, 0.2, 0.02);
        tone(ctx, 'triangle', 494, 494, at, 0.16, 0.12, 0.02);
      });
    }),
    vroom: play((ctx) => {
      tone(ctx, 'triangle', 70, 150, 0, 0.6, 0.16, 0.08);
      hiss(ctx, 0, 0.5, 260, 0.08, 'lowpass');
    }),
    siren: play((ctx) => {
      // "nee-naw": hai nốt sine tròn, nhỏ tiếng, vào và ra đều êm
      tone(ctx, 'sine', 659.3, 659.3, 0, 0.42, 0.07, 0.08);
      tone(ctx, 'sine', 523.3, 523.3, 0.45, 0.42, 0.07, 0.08);
    }),
    pop: play((ctx) => tone(ctx, 'sine', 420, 900, 0, 0.11, 0.2)),
    ding: play((ctx) => {
      tone(ctx, 'sine', 880, 880, 0, 0.4, 0.15);
      tone(ctx, 'sine', 1318.5, 1318.5, 0.1, 0.5, 0.13);
    }),
    spray: play((ctx) => hiss(ctx, 0, 0.3, 2200, 0.07, 'highpass')),
    fizz: play((ctx) => {
      hiss(ctx, 0, 0.5, 3200, 0.14, 'highpass');
      tone(ctx, 'sine', 700, 240, 0, 0.3, 0.08);
    }),
    wipe: play((ctx) => hiss(ctx, 0, 0.2, 1200, 0.08)),
    happy: play((ctx) => {
      [784, 988, 1318.5].forEach((f, i) => tone(ctx, 'sine', f, f * 1.01, i * 0.12, 0.45, 0.16));
    }),
  };
}
