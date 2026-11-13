import { useState } from 'react';
import styles from './GameSettings.module.css';
import { ClayButton } from './ClayButton';
import type { GameManifest } from '../core/games';
import {
  DIFFICULTIES,
  gameSetting,
  type Difficulty,
  type GameSetting,
  type Topic,
} from '../core/gameOptions';
import type { ClayColor } from '../core/tokens';
import { useFillName } from './buddyContext';

// Khu bố mẹ hiện chữ song ngữ vi / ja như ParentArea; không đọc thành tiếng.
const DIFF_TEXT: Record<Difficulty, { icon: string; vi: string; ja: string }> = {
  auto: { icon: '🎂', vi: 'Theo tuổi', ja: 'としに あわせる' },
  easy: { icon: '🐣', vi: 'Dễ', ja: 'かんたん' },
  medium: { icon: '🐥', vi: 'Vừa', ja: 'ふつう' },
  hard: { icon: '🦅', vi: 'Khó', ja: 'むずかしい' },
};

const TOPIC_TEXT: Record<Topic, { icon: string; vi: string; ja: string }> = {
  mix: { icon: '🎲', vi: 'Trộn', ja: 'まぜる' },
  animals: { icon: '🐶', vi: 'Con vật', ja: 'どうぶつ' },
  fruits: { icon: '🍎', vi: 'Trái cây', ja: 'くだもの' },
  shapes: { icon: '🔺', vi: 'Hình & màu', ja: 'かたち・いろ' },
  colors: { icon: '🎨', vi: 'Theo màu', ja: 'いろで' },
  kinds: { icon: '🐾', vi: 'Thú / quả', ja: 'なかま' },
  sizes: { icon: '🐘', vi: 'To / nhỏ', ja: 'おおきさ' },
};

type Props = {
  games: GameManifest[];
  value: Record<string, GameSetting> | undefined;
  onChange(next: Record<string, GameSetting>): void;
  onClose(): void;
};

/** Mục "Trò chơi" trong khu bố mẹ: bật/tắt, độ khó, chủ đề từng trò. Đổi là lưu ngay. */
export function GameSettings({ games, value, onChange, onClose }: Props) {
  const [cur, setCur] = useState<Record<string, GameSetting>>(value ?? {});
  const [needOne, setNeedOne] = useState(false);
  const fill = useFillName();

  const update = (id: string, patch: Partial<GameSetting>) => {
    const next = { ...cur, [id]: { ...gameSetting(cur, id), ...patch } };
    setCur(next);
    onChange(next);
  };

  const enabledCount = games.filter((g) => gameSetting(cur, g.id).enabled).length;

  const toggle = (id: string) => {
    const s = gameSetting(cur, id);
    // Không cho tắt trò cuối cùng còn bật, để bé luôn có trò chơi
    if (s.enabled && enabledCount <= 1) {
      setNeedOne(true);
      return;
    }
    setNeedOne(false);
    update(id, { enabled: !s.enabled });
  };

  return (
    <div className={styles.screen} role="dialog" aria-label="Trò chơi" data-testid="game-settings">
      <div className={styles.header}>
        <ClayButton color="butter" label="Xong" size={120} activateOn="release" onPress={onClose} caption="Xong / もどる">
          ↩️
        </ClayButton>
        <div>
          <h2 className={styles.title}>🎮 Trò chơi / ゲーム</h2>
          <p className={styles.hint} role="status">
            {needOne ? 'Cần giữ ít nhất một trò / 1つは のこしてね' : 'Đổi là lưu ngay / すぐ ほぞん されます'}
          </p>
        </div>
      </div>
      <div className={styles.list}>
        {games.map((g) => {
          const s = gameSetting(cur, g.id);
          const topics = g.options?.topics ?? [];
          const color: ClayColor = g.color;
          const titleVi = fill(g.title.vi, 'vi');
          return (
            <div key={g.id} className={styles.row} data-testid={`opt-${g.id}`} data-enabled={s.enabled}>
              <div className={styles.line}>
                <div className={styles.name}>
                  <span className={styles.icon} aria-hidden="true">{g.icon}</span>
                  <span className={styles.names}>
                    {titleVi}
                    <small>{fill(g.title.ja, 'ja')}</small>
                  </span>
                </div>
                <ClayButton
                  color={s.enabled ? 'leaf' : 'peach'}
                  label={`${titleVi}: ${s.enabled ? 'Đang bật' : 'Đang tắt'}`}
                  size={120}
                  activateOn="release"
                  selected={s.enabled}
                  className={styles.opt}
                  onPress={() => toggle(g.id)}
                >
                  <span className={styles.optIcon} aria-hidden="true">{s.enabled ? '✅' : '⛔'}</span>
                  {s.enabled ? 'Bật / オン' : 'Tắt / オフ'}
                </ClayButton>
                {g.options?.difficulty && (
                  <div
                    className={`${styles.group} ${s.enabled ? '' : styles.off}`}
                    role="group"
                    aria-label={`${titleVi}: độ khó`}
                  >
                    {DIFFICULTIES.map((d) => (
                      <ClayButton
                        key={d}
                        color={s.difficulty === d ? 'butter' : color}
                        label={`${titleVi}: ${DIFF_TEXT[d].vi}`}
                        size={120}
                        activateOn="release"
                        selected={s.difficulty === d}
                        className={styles.opt}
                        onPress={() => update(g.id, { difficulty: d })}
                      >
                        <span className={styles.optIcon} aria-hidden="true">{DIFF_TEXT[d].icon}</span>
                        {DIFF_TEXT[d].vi}
                        <small>{DIFF_TEXT[d].ja}</small>
                      </ClayButton>
                    ))}
                  </div>
                )}
              </div>
              {topics.length > 0 && (
                <div className={`${styles.line} ${s.enabled ? '' : styles.off}`}>
                  <span className={styles.groupLabel}>Chủ đề / テーマ</span>
                  <div className={styles.group} role="group" aria-label={`${titleVi}: chủ đề`}>
                    {(['mix', ...topics.filter((t) => t !== 'mix')] as Topic[]).map((t) => (
                      <ClayButton
                        key={t}
                        color={s.topic === t ? 'butter' : color}
                        label={`${titleVi}: ${TOPIC_TEXT[t].vi}`}
                        size={120}
                        activateOn="release"
                        selected={s.topic === t}
                        className={styles.opt}
                        onPress={() => update(g.id, { topic: t })}
                      >
                        <span className={styles.optIcon} aria-hidden="true">{TOPIC_TEXT[t].icon}</span>
                        {TOPIC_TEXT[t].vi}
                        <small>{TOPIC_TEXT[t].ja}</small>
                      </ClayButton>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
