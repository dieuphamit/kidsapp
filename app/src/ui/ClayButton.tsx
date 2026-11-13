import { useRef, useState, type ReactNode, type CSSProperties, type PointerEvent } from 'react';
import styles from './ClayButton.module.css';
import { TOUCH_MIN_PX, type ClayColor } from '../core/tokens';

type Props = {
  color: ClayColor;
  label: string;
  onPress(): void;
  children: ReactNode;
  size?: number;
  caption?: string;
  style?: CSSProperties;
  /** Nút bật/tắt hoặc nút trong nhóm chọn một: đặt aria-pressed. */
  selected?: boolean;
  className?: string;
  /**
   * 'press' (mặc định, cho bé): kích hoạt ngay lúc chạm xuống.
   * 'release' (màn bố mẹ có cuộn): kích hoạt khi nhả tay mà không kéo; kéo để cuộn thì không bấm nhầm.
   * Cả hai đều lún nút ngay lúc chạm xuống (phản hồi trong 100ms).
   */
  activateOn?: 'press' | 'release';
};

/** Ngón tay xê dịch quá chừng này (px màn hình) thì coi là kéo/cuộn, không phải bấm. */
export const DRAG_CANCEL_PX = 12;

export function ClayButton({ color, label, onPress, children, size = 160, caption, style, selected, className, activateOn = 'press' }: Props) {
  const [pressed, setPressed] = useState(false);
  // điểm chạm xuống (chế độ release); null = đã huỷ (kéo, rời nút, pointercancel khi trình duyệt cuộn).
  // Chỉ dùng để đo quãng xê dịch, không tính toạ độ trong khung nên clientX/Y ở đây là được.
  const start = useRef<{ x: number; y: number } | null>(null);
  const release = () => { start.current = null; setPressed(false); };
  const onMove = (e: PointerEvent) => {
    const s = start.current;
    if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > DRAG_CANCEL_PX) release();
  };
  const px = `${Math.max(size, TOUCH_MIN_PX)}px`;
  return (
    <button
      type="button"
      aria-label={label}
      className={className ? `${styles.clay} ${className}` : styles.clay}
      aria-pressed={selected}
      style={{ ...style, width: px, height: px, background: `var(--clay-${color})` }}
      data-pressed={pressed ? '' : undefined}
      onPointerDown={(e) => {
        setPressed(true);
        if (activateOn === 'release') start.current = { x: e.clientX, y: e.clientY };
        else onPress();
      }}
      onPointerMove={activateOn === 'release' ? onMove : undefined}
      onPointerUp={() => {
        const fire = activateOn === 'release' && start.current !== null;
        release();
        if (fire) onPress();
      }}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {children}
      {caption && <span className={styles.caption}>{caption}</span>}
    </button>
  );
}
