import { SeasonSettings } from './SeasonSettings';
import { PrintablesSection } from './PrintablesSection';
import styles from './ParentExtras.module.css';

/** Một cột nhỏ trong khu phụ huynh (cạnh ô tuổi, phút): trang trí theo mùa và bản in (component riêng để ParentArea chỉ thêm một dòng). */
export function ParentExtras() {
  return (
    <div className={styles.col}>
      <SeasonSettings />
      <PrintablesSection />
    </div>
  );
}
