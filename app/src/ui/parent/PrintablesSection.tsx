import { useState } from 'react';
import { PrintablesPicker } from './PrintablesPicker';
import styles from './ParentExtras.module.css';

/** Nút mở màn "Bản in" (tranh tô màu, nối số, tô nét) trong khu phụ huynh. */
export function PrintablesSection() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className={`${styles.opt} ${styles.print}`} onClick={() => setOpen(true)}>🖨️ Bản in</button>
      {open && <PrintablesPicker onClose={() => setOpen(false)} />}
    </>
  );
}
