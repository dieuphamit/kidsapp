import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SHEETS, type Sheet, type SheetKind } from '../../core/printables';
import { SheetArt } from './SheetArt';
import styles from './Printables.module.css';

const KIND_LABEL: Record<SheetKind, string> = {
  color: 'Tô màu / ぬりえ',
  dots: 'Nối số / てんつなぎ',
  trace: 'Tô nét / なぞりがき',
};

/**
 * Các trang A4 để in. Gắn thẳng vào <body> (ngoài khung Stage co giãn/xoay), ẩn trên màn hình,
 * chỉ hiện khi in (@media print ẩn #root).
 */
export function PrintPages({ sheets }: { sheets: readonly Sheet[] }) {
  return createPortal(
    <div className={styles.printRoot} data-testid="print-pages">
      {sheets.map((s) => (
        <section key={s.id} className={styles.page} data-testid="print-page" data-sheet={s.id}>
          <header className={styles.pageHead}>
            <span>{KIND_LABEL[s.kind]} · {s.title}</span>
            <span className={styles.nameLine}>Tên / なまえ: </span>
          </header>
          <SheetArt sheet={s} className={styles.pageArt} />
          <footer className={styles.pageFoot}>Bé Học · Đậu Đậu</footer>
        </section>
      ))}
    </div>,
    document.body,
  );
}

type Props = { onClose(): void; print?: () => void };

/** Màn chọn tờ in cho bố mẹ (trong khu phụ huynh). */
export function PrintablesPicker({ onClose, print = () => window.print() }: Props) {
  const [picked, setPicked] = useState<string[]>([]);
  const chosen = SHEETS.filter((s) => picked.includes(s.id));
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  // Tiêu đề trang thành tên file PDF khi "Lưu thành PDF"
  useEffect(() => {
    const old = document.title;
    document.title = 'Bé Học - bản in';
    return () => { document.title = old; };
  }, []);

  return (
    <div className={styles.picker} role="dialog" aria-label="Bản in" data-testid="printables">
      <div className={styles.head}>
        <span className={styles.title}>🖨️ Bản in / プリント</span>
        <button type="button" className={styles.headBtn} onClick={() => setPicked(picked.length === SHEETS.length ? [] : SHEETS.map((s) => s.id))}>
          {picked.length === SHEETS.length ? 'Bỏ chọn / けす' : 'Chọn hết / ぜんぶ'}
        </button>
        <button type="button" className={`${styles.headBtn} ${styles.printBtn}`} disabled={chosen.length === 0} onClick={print}>
          {chosen.length === 0 ? 'Chọn tờ để in' : `In ${chosen.length} tờ / いんさつ`}
        </button>
        <button type="button" className={styles.headBtn} onClick={onClose}>Đóng</button>
      </div>
      <div className={styles.grid} role="group" aria-label="Chọn tờ in">
        {SHEETS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={styles.sheetCard}
            aria-pressed={picked.includes(s.id)}
            aria-label={s.title}
            data-testid={`sheet-${s.id}`}
            onClick={() => toggle(s.id)}
          >
            <span className={styles.thumb}><SheetArt sheet={s} /></span>
            <span className={styles.cardKind}>{s.icon} {KIND_LABEL[s.kind].split(' / ')[0]}</span>
            <span className={styles.cardTitle}>{s.title.split(' / ')[0]}</span>
            <span className={styles.check} aria-hidden="true">✓</span>
          </button>
        ))}
      </div>
      <PrintPages sheets={chosen} />
    </div>
  );
}
