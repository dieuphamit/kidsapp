import type { Sheet } from '../../core/printables';
import styles from './Printables.module.css';

/** Vẽ một tờ in: nét đen trên nền trắng (màu --print-ink / --print-paper). */
export function SheetArt({ sheet, className }: { sheet: Sheet; className?: string }) {
  const { w, h } = sheet.viewBox;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={`${styles.art} ${className ?? ''}`} aria-hidden="true" data-sheet={sheet.id}>
      {sheet.strokes.map((s, i) => (
        <path key={i} d={s.d} className={s.dashed ? styles.dashed : s.thin ? styles.thin : styles.line} />
      ))}
      {sheet.dots?.map((d) => (
        <g key={d.n}>
          <circle cx={d.x} cy={d.y} r={d.n === 1 ? 3.6 : 2.4} className={styles.dot} />
          <text x={d.label.x} y={d.label.y} className={d.n === 1 ? `${styles.num} ${styles.numFirst}` : styles.num}>
            {d.n}
          </text>
        </g>
      ))}
    </svg>
  );
}
