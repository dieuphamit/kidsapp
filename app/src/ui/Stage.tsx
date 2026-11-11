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

function readFit(): StageFit {
  return fitStage(window.innerWidth, window.innerHeight);
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
