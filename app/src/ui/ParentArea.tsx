import { useState } from 'react';
import styles from './screens.module.css';
import type { Settings } from '../core/settings';

type Props = { settings: Settings; onSave(s: Settings): void; onUnlock(): void; onClose(): void };

export function ParentArea({ settings, onSave, onUnlock, onClose }: Props) {
  const [s, setS] = useState(settings);
  return (
    <div className={styles.dialog} role="dialog" aria-label="Cài đặt phụ huynh">
      <div className={styles.card}>
        <label>Ngôn ngữ{' '}
          <select aria-label="Ngôn ngữ" value={s.lang} onChange={(e) => setS({ ...s, lang: e.target.value as Settings['lang'] })}>
            <option value="vi">Tiếng Việt</option>
            <option value="ja">日本語</option>
          </select>
        </label>
        <label>Tuổi (tháng){' '}
          <input aria-label="Tuổi (tháng)" type="number" min={18} max={84} value={s.ageMonths}
            onChange={(e) => setS({ ...s, ageMonths: Number(e.target.value) })} />
        </label>
        <label>Phút mỗi phiên{' '}
          <input aria-label="Phút mỗi phiên" type="number" min={5} max={60} value={s.sessionMinutes}
            onChange={(e) => setS({ ...s, sessionMinutes: Number(e.target.value) })} />
        </label>
        <button type="button" onClick={() => { onSave(s); onUnlock(); onClose(); }}>Lưu và cho bé chơi tiếp</button>
        <button type="button" onClick={onClose}>Đóng</button>
      </div>
    </div>
  );
}
