import { Howler } from 'howler';

/**
 * Tiếng "bụp" vui khi đổ màu: một nốt sine trượt xuống thật nhanh (Web Audio của Howler, không cần file).
 * step đổi cao độ một chút cho mỗi lần tô để nghe như chuỗi nốt; sparkle thêm một tiếng "ting" cao.
 */
export function playPop(step = 0, sparkle = false): void {
  try {
    if (!Howler.ctx) Howler.volume();
    const ctx = Howler.ctx;
    if (!ctx) return;
    if (ctx.state === 'suspended') void ctx.resume();
    const out: AudioNode = Howler.masterGain ?? ctx.destination;
    const t = ctx.currentTime;
    const base = 480 + (step % 6) * 55;
    tone(ctx, out, t, base, base * 0.35, 0.16, 0.45);
    if (sparkle) {
      tone(ctx, out, t + 0.06, 1568, 1568, 0.18, 0.18);
      tone(ctx, out, t + 0.14, 2093, 2093, 0.22, 0.14);
    }
  } catch {
    // Không có Web Audio thì thôi, hình vẫn nảy
  }
}

function tone(ctx: AudioContext, out: AudioNode, t: number, from: number, to: number, dur: number, vol: number) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.85);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(out);
  o.start(t);
  o.stop(t + dur + 0.02);
}
