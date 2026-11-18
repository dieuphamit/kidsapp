import { Howler } from 'howler';

/**
 * Tiếng tắm tổng hợp bằng Web Audio (không cần file, không gọi mạng):
 * - pop: bong bóng nổ "lóc" (sine trượt lên), phát ngay lúc chạm xuống;
 * - scrub: tiếng chà sột soạt (nhiễu qua lọc dải), phát thưa khi kéo;
 * - shower: tiếng nước xối ~1,6 giây (nhiễu qua lọc thấp, to dần rồi nhỏ dần);
 * - sparkle: ba nốt chuông lấp lánh khi sạch bong.
 * Không có AudioContext (jsdom, trình duyệt cũ) thì im lặng.
 */
export interface BathSounds {
  pop(): void;
  scrub(): void;
  shower(): void;
  sparkle(): void;
}

function defaultCtx(): AudioContext | null {
  try {
    if (!Howler.ctx) Howler.volume();
    return Howler.ctx ?? null;
  } catch {
    return null;
  }
}

export function createBathSounds(getCtx: () => AudioContext | null = defaultCtx): BathSounds {
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
      noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noise;
  };

  const noiseBurst = (ctx: AudioContext, type: BiquadFilterType, freq: number, q: number, peak: number, attack: number, dur: number) => {
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(f).connect(g).connect(out(ctx));
    src.start(now, Math.random() * 0.5);
    src.stop(now + dur + 0.05);
    src.onended = () => {
      src.disconnect();
      f.disconnect();
      g.disconnect();
    };
  };

  const tone = (ctx: AudioContext, from: number, to: number, at: number, dur: number, peak: number) => {
    const now = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(to, now + dur * 0.7);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(peak, now + 0.008);
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
    pop() {
      const ctx = ready();
      if (!ctx) return;
      const base = 380 + Math.random() * 260;
      tone(ctx, base, base * 2.6, 0, 0.12, 0.28);
    },
    scrub() {
      const ctx = ready();
      if (!ctx) return;
      noiseBurst(ctx, 'bandpass', 900 + Math.random() * 700, 0.9, 0.16, 0.03, 0.16);
      if (Math.random() < 0.45) tone(ctx, 500 + Math.random() * 500, 1500 + Math.random() * 600, 0.04, 0.09, 0.12);
    },
    shower() {
      const ctx = ready();
      if (!ctx) return;
      noiseBurst(ctx, 'lowpass', 2600, 0.4, 0.3, 0.25, 1.7);
      noiseBurst(ctx, 'highpass', 5200, 0.3, 0.07, 0.25, 1.6);
    },
    sparkle() {
      const ctx = ready();
      if (!ctx) return;
      [1318.5, 1568, 2093].forEach((f, i) => tone(ctx, f, f * 1.01, i * 0.11, 0.5, 0.16));
    },
  };
}
