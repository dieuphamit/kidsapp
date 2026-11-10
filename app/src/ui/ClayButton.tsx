import type { ReactNode, CSSProperties } from 'react';
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
};

export function ClayButton({ color, label, onPress, children, size = 160, caption, style }: Props) {
  const px = `${Math.max(size, TOUCH_MIN_PX)}px`;
  return (
    <button
      type="button"
      aria-label={label}
      className={styles.clay}
      style={{ width: px, height: px, background: `var(--clay-${color})`, ...style }}
      onPointerDown={onPress}
    >
      {children}
      {caption && <span className={styles.caption}>{caption}</span>}
    </button>
  );
}
