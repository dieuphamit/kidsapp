import { useEffect, useRef, useState } from 'react';
import type { Pt } from './layout';

/** Thời gian trượt của bạn thú và dụng cụ (móc, phao, giỏ) giữa hai chỗ. */
export const GLIDE_MS = 900;

/** Gần đúng cubic-bezier(0.3, 0.1, 0.3, 1) mà CSS cũ dùng: êm đầu, chậm dần về cuối. */
export function glideEase(t: number): number {
  const u = Math.min(1, Math.max(0, t));
  return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
}

/**
 * Điểm trượt êm tới `target` trong GLIDE_MS bằng requestAnimationFrame (không dùng CSS transition):
 * mọi thứ cần khớp nhau (bạn thú, móc, đầu dây) đọc cùng một toạ độ ở cùng khung hình, nên đầu dây
 * luôn dính vào móc và móc luôn bám đúng chỗ trên thân con vật. `instant` (đang kéo) thì theo ngay.
 */
export function useGlide(target: Pt | null, instant: boolean): Pt | null {
  /** Khung hình đang trượt tới (tx, ty); khung của đích cũ bị bỏ qua. */
  const [frame, setFrame] = useState<{ p: Pt; tx: number; ty: number } | null>(null);
  /** Chỗ đang hiện (cập nhật mỗi khung) để lần trượt sau bắt đầu từ đó. */
  const at = useRef<Pt | null>(target);
  const tx = target?.x;
  const ty = target?.y;
  useEffect(() => {
    if (tx === undefined || ty === undefined) {
      at.current = null;
      if (typeof requestAnimationFrame !== 'function') return;
      const raf = requestAnimationFrame(() => setFrame(null));
      return () => cancelAnimationFrame(raf);
    }
    const to = { x: tx, y: ty };
    const from = at.current;
    if (typeof requestAnimationFrame !== 'function') {
      at.current = to;
      return;
    }
    let raf = 0;
    if (instant || !from || (from.x === tx && from.y === ty)) {
      // không trượt: chỉ ghi nhận chỗ hiện tại (khung kế) để lần trượt sau bắt đầu đúng chỗ
      at.current = to;
      raf = requestAnimationFrame(() => setFrame({ p: to, tx, ty }));
      return () => cancelAnimationFrame(raf);
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      const e = glideEase((now - t0) / GLIDE_MS);
      const p = { x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
      at.current = p;
      setFrame({ p, tx, ty });
      if (e < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [tx, ty, instant]);
  if (!target || instant) return target;
  // đích vừa đổi mà khung đầu chưa tới: giữ chỗ đang hiện (không nhảy một khung)
  return frame?.p ?? target;
}
