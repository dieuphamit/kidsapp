import { useEffect } from 'react';
import { loadSeasonPref, saveSeasonPref, useSeasonPref, type SeasonPref } from '../../core/seasonPref';
import styles from './ParentExtras.module.css';

const OPTIONS: [SeasonPref, string][] = [['auto', 'Tự động / じどう'], ['off', 'Tắt / オフ']];

/** "Trang trí theo mùa": tự động theo ngày (Tết, Trung thu, Giáng Sinh) hoặc tắt. Đổi là lưu ngay. */
export function SeasonSettings() {
  const pref = useSeasonPref();
  useEffect(() => { void loadSeasonPref(); }, []);
  return (
    <>
      <span className={styles.label}>🏮 Trang trí theo mùa / きせつ</span>
      <div className={styles.opts} role="group" aria-label="Trang trí theo mùa">
        {OPTIONS.map(([value, text]) => (
          <button
            key={value}
            type="button"
            className={styles.opt}
            aria-pressed={pref === value}
            onClick={() => void saveSeasonPref(value)}
          >
            {text}
          </button>
        ))}
      </div>
    </>
  );
}
