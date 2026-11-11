import { useEffect, useState, type ReactNode } from 'react';
import styles from './Stage.module.css';

/** Khung thiết kế: iPad Pro 11" nằm ngang. Mọi màn hình, luật UX (nút ≥120px…) tính theo khung này. */
export const STAGE_W = 1194;
export const STAGE_H = 834;
const MAX_SCALE = 1.6;

export type StageFit = { scale: number; rotate: boolean };

/**
 * Tính cách đặt khung vào cửa sổ: co giãn giữ tỉ lệ, chừa viền (letterbox).
 * Cửa sổ dọc (điện thoại cầm đứng, kể cả khi khóa xoay) thì xoay khung 90° để dùng hết màn hình.
 */
export function fitStage(vw: number, vh: number): StageFit {
  const rotate = vh > vw;
  const [w, h] = rotate ? [vh, vw] : [vw, vh];
  const scale = Math.min(w / STAGE_W, h / STAGE_H, MAX_SCALE);
  return { scale, rotate };
}

let current: StageFit & { vw: number; vh: number } = { scale: 1, rotate: false, vw: STAGE_W, vh: STAGE_H };

/**
 * Đổi toạ độ màn hình (clientX/clientY của sự kiện) sang toạ độ trong khung 1194×834.
 * Dùng cho kéo thả: KHÔNG lấy clientX trừ getBoundingClientRect, vì khung bị co giãn/xoay.
 */
export function clientToStage(clientX: number, clientY: number, fit = current): { x: number; y: number } {
  const dx = (clientX - fit.vw / 2) / fit.scale;
  const dy = (clientY - fit.vh / 2) / fit.scale;
  // rotate(90deg) theo chiều kim đồng hồ: (x, y) → (−y, x); ngược lại: (x, y) → (y, −x)
  const [lx, ly] = fit.rotate ? [dy, -dx] : [dx, dy];
  return { x: lx + STAGE_W / 2, y: ly + STAGE_H / 2 };
}

/** Hình chữ nhật của phần tử trong toạ độ khung (để so vùng thả với điểm từ clientToStage). */
export function stageRect(el: Element, fit = current): { left: number; top: number; right: number; bottom: number; width: number; height: number } {
  const r = el.getBoundingClientRect();
  const a = clientToStage(r.left, r.top, fit);
  const b = clientToStage(r.right, r.bottom, fit);
  const left = Math.min(a.x, b.x), right = Math.max(a.x, b.x), top = Math.min(a.y, b.y), bottom = Math.max(a.y, b.y);
  return { left, top, right, bottom, width: right - left, height: bottom - top };
}

function readFit(): StageFit {
  const fit = fitStage(window.innerWidth, window.innerHeight);
  current = { ...fit, vw: window.innerWidth, vh: window.innerHeight };
  return fit;
}

export function Stage({ children }: { children: ReactNode }) {
  const [fit, setFit] = useState(readFit);

  useEffect(() => {
    const update = () => setFit(readFit());
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
    };
  }, []);

  const transform = `translate(-50%, -50%)${fit.rotate ? ' rotate(90deg)' : ''} scale(${fit.scale})`;
  return (
    <div className={styles.outer}>
      <div
        className={styles.stage}
        data-testid="stage"
        data-rotated={fit.rotate ? 'true' : undefined}
        style={{ width: STAGE_W, height: STAGE_H, transform }}
      >
        {children}
      </div>
    </div>
  );
}
