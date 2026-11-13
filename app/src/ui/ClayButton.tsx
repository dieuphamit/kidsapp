import { useState, type ReactNode, type CSSProperties } from 'react';
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
};

export function ClayButton({ color, label, onPress, children, size = 160, caption, style, selected, className }: Props) {
  const [pressed, setPressed] = useState(false);
  const release = () => setPressed(false);
  const px = `${Math.max(size, TOUCH_MIN_PX)}px`;
  return (
    <button
      type="button"
      aria-label={label}
      className={className ? `${styles.clay} ${className}` : styles.clay}
      aria-pressed={selected}
      style={{ ...style, width: px, height: px, background: `var(--clay-${color})` }}
      data-pressed={pressed ? '' : undefined}
      onPointerDown={() => { setPressed(true); onPress(); }}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
    >
      {children}
      {caption && <span className={styles.caption}>{caption}</span>}
    </button>
  );
}
