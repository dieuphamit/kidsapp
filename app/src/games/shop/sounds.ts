import { Howler } from 'howler';

/**
 * Tiếng tổng hợp bằng Web Audio cho trò Cửa hàng (không cần file, không gọi mạng), đều nhỏ và dịu:
 * - pick: tiếng "bóp" nhỏ khi nhấc món khỏi kệ;
 * - pop: món rơi vào giỏ;
 * - slide: giỏ trượt tới quầy;
 * - beep: máy tính tiền "bíp" một món;
 * - ding: "kính coong" khi tính tiền xong;
 * - boing: chạm vào đồ vật (giỏ, máy khi chưa tới lượt);
 * - happy: ba nốt chuông đi lên.
 * Không có AudioContext (jsdom, trình duyệt cũ) thì im lặng.
 */
export interface ShopSounds {
  pick(): void;
  pop(): void;
  slide(): void;
  beep(): void;
  ding(): void;
  boing(): void;
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

export function createShopSounds(getCtx: () => AudioContext | null = defaultCtx): ShopSounds {
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

  const hiss = (ctx: AudioContext, at: number, dur: number, freq: number, peak: number) => {
    const now = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + dur * 0.4);
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
    pick: play((ctx) => tone(ctx, 'sine', 420, 820, 0, 0.1, 0.16)),
    pop: play((ctx) => {
      tone(ctx, 'sine', 300, 760, 0, 0.13, 0.26);
      tone(ctx, 'sine', 760, 520, 0.09, 0.1, 0.1);
    }),
    slide: play((ctx) => {
      hiss(ctx, 0, 0.5, 700, 0.12);
      tone(ctx, 'triangle', 160, 260, 0.05, 0.4, 0.06);
    }),
    beep: play((ctx) => {
      tone(ctx, 'sine', 1174.7, 1174.7, 0, 0.16, 0.16);
      tone(ctx, 'triangle', 587.3, 587.3, 0, 0.14, 0.06);
    }),
    ding: play((ctx) => {
      tone(ctx, 'sine', 1568, 1568, 0, 0.5, 0.16);
      tone(ctx, 'sine', 2093, 2093, 0.14, 0.7, 0.14);
    }),
    boing: play((ctx) => {
      tone(ctx, 'sine', 240, 520, 0, 0.16, 0.2);
      tone(ctx, 'sine', 520, 330, 0.12, 0.16, 0.12);
    }),
    happy: play((ctx) => {
      [784, 988, 1318.5].forEach((f, i) => tone(ctx, 'sine', f, f * 1.01, i * 0.12, 0.45, 0.16));
    }),
  };
}
