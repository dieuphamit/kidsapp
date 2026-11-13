import { useState } from 'react';
import styles from './BuddySettings.module.css';
import { ClayButton } from './ClayButton';
import { BuddyPreview } from './BuddyPreview';
import { BUDDY_CHARACTERS, BUDDY_NAMES, buddyImageUrl, buddyName, type Buddy, type BuddyCharacter } from '../core/buddy';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';
import type { ClayColor } from '../core/tokens';

// Khu bố mẹ hiện chữ song ngữ vi / ja như ParentArea; chỉ câu chào thử của nhân vật được đọc.
const CHARACTER_TEXT: Record<BuddyCharacter, { vi: string; ja: string; color: ClayColor }> = {
  cat: { vi: 'Mèo', ja: 'ねこ', color: 'butter' },
  dog: { vi: 'Cún', ja: 'いぬ', color: 'peach' },
  bunny: { vi: 'Thỏ', ja: 'うさぎ', color: 'lilac' },
  bear: { vi: 'Gấu', ja: 'くま', color: 'leaf' },
};

/** Câu nhân vật nói thử sau mỗi lần chọn ("Chào bé, tớ là {name}!"). */
export const BUDDY_HELLO_KEY = 'buddy.hello';

type Props = {
  value: Buddy;
  lang: Lang;
  speaker: Speaker;
  onChange(next: Buddy): void;
  onClose(): void;
};

/**
 * Mục "Bạn đồng hành" trong khu bố mẹ: chọn con vật (4) và tên (8), độc lập.
 * Đổi là lưu ngay; nhân vật vẫy tay và nói thử bằng tên mới.
 */
export function BuddySettings({ value, lang, speaker, onChange, onClose }: Props) {
  const [cur, setCur] = useState<Buddy>(value);
  const [wave, setWave] = useState(0);
  const [lastSay, setLastSay] = useState('');

  const greet = () => {
    speaker.say(BUDDY_HELLO_KEY);
    setLastSay(BUDDY_HELLO_KEY);
    setWave((w) => w + 1);
  };

  const pick = (patch: Partial<Buddy>) => {
    const next = { ...cur, ...patch };
    setCur(next);
    onChange(next); // App đổi tên cho speaker ngay trong onChange, nên câu chào dưới đây đã đúng tên mới
    greet();
  };

  const shownName = buddyName(cur.name, lang);

  return (
    <div
      className={styles.screen}
      role="dialog"
      aria-label="Bạn đồng hành"
      data-testid="buddy-settings"
      data-character={cur.character}
      data-name={cur.name}
      data-last-say={lastSay || undefined}
    >
      <div className={styles.header}>
        <ClayButton color="butter" label="Xong" size={120} activateOn="release" onPress={onClose} caption="Xong / もどる">
          ↩️
        </ClayButton>
        <div>
          <h2 className={styles.title}>🐾 Bạn đồng hành / ともだち</h2>
          <p className={styles.hint}>Chạm để chọn, đổi là lưu ngay / タッチで えらんでね</p>
        </div>
      </div>
      <div className={styles.body}>
        <div className={styles.preview} data-testid="buddy-preview">
          <BuddyPreview character={cur.character} wave={wave} label={shownName} onTap={greet} />
          <div className={styles.nameTag}>{shownName}</div>
        </div>
        <div className={styles.choices}>
          <span className={styles.groupLabel}>Con vật / どうぶつ</span>
          <div className={styles.group} role="group" aria-label="Con vật">
            {BUDDY_CHARACTERS.map((c) => (
              <ClayButton
                key={c}
                color={CHARACTER_TEXT[c].color}
                label={`Con vật: ${CHARACTER_TEXT[c].vi}`}
                size={150}
                activateOn="release"
                selected={cur.character === c}
                className={styles.opt}
                onPress={() => pick({ character: c })}
              >
                <img className={styles.charImg} src={buddyImageUrl(c)} alt="" draggable={false} />
                <span>{CHARACTER_TEXT[c].vi}</span>
                <small>{CHARACTER_TEXT[c].ja}</small>
              </ClayButton>
            ))}
          </div>
          <span className={styles.groupLabel}>Tên / なまえ</span>
          <div className={`${styles.group} ${styles.names}`} role="group" aria-label="Tên">
            {BUDDY_NAMES.map((n) => (
              <ClayButton
                key={n.id}
                color={cur.name === n.id ? 'butter' : 'mint'}
                label={`Tên: ${n.vi}`}
                size={150}
                activateOn="release"
                selected={cur.name === n.id}
                className={styles.opt}
                onPress={() => pick({ name: n.id })}
              >
                <span className={styles.nameVi}>{n.vi}</span>
                <small>{n.ja} · {n.en}</small>
              </ClayButton>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
