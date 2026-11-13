import { useState } from 'react';
import styles from './screens.module.css';
import type { Settings } from '../core/settings';
import { ALL_GAMES } from '../core/games';
import { ClayButton } from './ClayButton';
import { GameSettings } from './GameSettings';
import { BuddySettings } from './BuddySettings';
import type { Speaker } from '../core/audio';

const LANGS: [Settings['lang'], string][] = [['vi', '🇻🇳 Tiếng Việt'], ['ja', '🇯🇵 日本語'], ['en', '🇬🇧 English']];

const MENUS: [Settings['menuStyle'], string][] = [['map', '🗺️ Bản đồ / ちず'], ['shelf', '🧸 Kệ đồ chơi / たな']];

type Props = { settings: Settings; speaker: Speaker; onSave(s: Settings): void; onUnlock(): void; onClose(): void };

export function ParentArea({ settings, speaker, onSave, onUnlock, onClose }: Props) {
  const [s, setS] = useState(settings);
  const [gamesOpen, setGamesOpen] = useState(false);
  const [buddyOpen, setBuddyOpen] = useState(false);
  if (buddyOpen) {
    return (
      <BuddySettings
        value={s.buddy}
        lang={s.lang}
        speaker={speaker}
        onChange={(buddy) => { const next = { ...s, buddy }; setS(next); onSave(next); }}
        onClose={() => setBuddyOpen(false)}
      />
    );
  }
  if (gamesOpen) {
    return (
      <GameSettings
        games={ALL_GAMES}
        value={s.games}
        onChange={(games) => { const next = { ...s, games }; setS(next); onSave(next); }}
        onClose={() => setGamesOpen(false)}
      />
    );
  }
  return (
    <div className={styles.dialog} role="dialog" aria-label="Cài đặt phụ huynh">
      <div className={styles.card}>
        <span className={styles.sectionTitle}>Ngôn ngữ / ことば / Language</span>
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
        <div className={styles.langRow}>
          <div className={styles.clayRow}>
          <ClayButton color="lilac" label="Trò chơi" size={120} caption="Trò chơi / ゲーム" onPress={() => setGamesOpen(true)}>
            🎮
          </ClayButton>
          <ClayButton color="peach" label="Bạn đồng hành" size={120} caption="Bạn / ともだち" onPress={() => setBuddyOpen(true)}>
            🐾
          </ClayButton>
          </div>
          <div className={styles.parentFields}>
            <label>Tuổi (tháng){' '}
              <input aria-label="Tuổi (tháng)" type="number" min={18} max={84} value={s.ageMonths}
                onChange={(e) => setS({ ...s, ageMonths: Number(e.target.value) })} />
            </label>
            <label>Phút mỗi phiên{' '}
              <input aria-label="Phút mỗi phiên" type="number" min={5} max={60} value={s.sessionMinutes}
                onChange={(e) => setS({ ...s, sessionMinutes: Number(e.target.value) })} />
            </label>
          </div>
        </div>
        <button type="button" onClick={() => { onSave(s); onUnlock(); onClose(); }}>Lưu và cho bé chơi tiếp</button>
        <button type="button" onClick={onClose}>Đóng</button>
        <small className={styles.credits}>
          Ảnh thẻ con vật, trái cây: ảnh chụp từ Wikimedia Commons (CC0, public domain, CC BY, CC BY-SA; tác giả từng ảnh xem cards/CREDITS.md). Hình con vật 3D: Poly by Google (CC-BY 3.0, poly.pizza). Trái cây, khối: Kenney (CC0); kiwi: Jarlan Perez, việt quất: sirkitree, đào: jeremy (CC-BY 3.0, poly.pizza), bơ: Quaternius (CC0). Giọng đọc: Microsoft Edge TTS.
        </small>
      </div>
    </div>
  );
}
