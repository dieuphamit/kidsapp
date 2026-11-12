import { useState } from 'react';
import styles from './screens.module.css';
import type { Settings } from '../core/settings';

const LANGS: [Settings['lang'], string][] = [['vi', '🇻🇳 Tiếng Việt'], ['ja', '🇯🇵 日本語']];

const MENUS: [Settings['menuStyle'], string][] = [['map', '🗺️ Bản đồ / ちず'], ['shelf', '🧸 Kệ đồ chơi / たな']];

type Props ={ settings: Settings; onSave(s: Settings): void; onUnlock(): void; onClose(): void };

export function ParentArea({ settings, onSave, onUnlock, onClose }: Props) {
  const [s, setS] = useState(settings);
  return (
    <div className={styles.dialog} role="dialog" aria-label="Cài đặt phụ huynh">
      <div className={styles.card}>
        <span className={styles.sectionTitle}>Ngôn ngữ / ことば</span>
        <div className={styles.langRow} role="group" aria-label="Ngôn ngữ">
          {LANGS.map(([lang, text]) => (
            <button
              key={lang}
              type="button"
              className={styles.langBtn}
              aria-pressed={s.lang === lang}
              onClick={() => {
                const next = { ...s, lang };
                setS(next);
                onSave(next); // đổi ngay, không cần bấm Lưu
              }}
            >
              {text}
            </button>
          ))}
        </div>
        <span className={styles.sectionTitle}>Kiểu menu / メニュー</span>
        <div className={styles.langRow} role="group" aria-label="Kiểu menu">
          {MENUS.map(([menuStyle, text]) => (
            <button
              key={menuStyle}
              type="button"
              className={styles.langBtn}
              aria-pressed={s.menuStyle === menuStyle}
              onClick={() => {
                const next = { ...s, menuStyle };
                setS(next);
                onSave(next); // đổi ngay, không cần bấm Lưu
              }}
            >
              {text}
            </button>
          ))}
        </div>
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
        <small className={styles.credits}>
          Ảnh thẻ con vật, trái cây: ảnh chụp từ Wikimedia Commons (CC0, public domain, CC BY, CC BY-SA; tác giả từng ảnh xem cards/CREDITS.md). Hình con vật 3D: Poly by Google (CC-BY 3.0, poly.pizza). Trái cây, khối: Kenney (CC0); kiwi: Jarlan Perez, việt quất: sirkitree, đào: jeremy (CC-BY 3.0, poly.pizza), bơ: Quaternius (CC0). Giọng đọc: Microsoft Edge TTS.
        </small>
      </div>
    </div>
  );
}
