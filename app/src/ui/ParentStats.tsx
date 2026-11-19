import { useEffect, useState } from 'react';
import styles from './ParentStats.module.css';
import { ClayButton } from './ClayButton';
import { useFillName } from './buddyContext';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import { SKILLS, SKILL_INFO, skillsOf } from '../core/skills';
import { loadPlayLog, toMinutes, weeklyByGame, weeklyBySkill, weeklyTotal, type PlayLog } from '../core/playTime';

// Chữ cho bố mẹ (không đọc thành tiếng), theo ngôn ngữ đang chọn.
const TEXT: Record<Lang, {
  title: string; done: string; total: (m: string) => string; local: string; none: string;
  skills: string; overlap: string; games: string; min: string; notPlayed: string;
}> = {
  vi: {
    title: '📊 Tuần này', done: 'Xong', total: (m) => `7 ngày qua: bé chơi ${m}`, local: 'Chỉ lưu trên máy này, không gửi đi đâu.',
    none: 'Tuần này bé chưa chơi trò nào.', skills: 'Thời gian theo kỹ năng',
    overlap: 'Một trò có thể rèn hai kỹ năng, nên cộng các dòng có thể nhiều hơn tổng thời gian.',
    games: 'Mỗi trò rèn gì', min: 'phút', notPlayed: 'chưa chơi',
  },
  ja: {
    title: '📊 こんしゅう', done: 'もどる', total: (m) => `この7日間: ${m} あそびました`, local: 'この端末だけに保存され、外部には送信されません。',
    none: 'こんしゅうは まだ あそんで いません。', skills: 'ちから べつの じかん',
    overlap: '1つのゲームで2つのちからを育てるので、合計より多くなることがあります。',
    games: 'ゲームと 育つ ちから', min: '分', notPlayed: 'まだ',
  },
  en: {
    title: '📊 This week', done: 'Done', total: (m) => `Last 7 days: ${m} of play`, local: 'Stored on this device only, never sent anywhere.',
    none: 'No games played this week yet.', skills: 'Time by skill',
    overlap: 'A game can train two skills, so the rows may add up to more than the total.',
    games: 'What each game trains', min: 'min', notPlayed: 'not yet',
  },
};

type Props = {
  games: GameManifest[];
  lang: Lang;
  onClose(): void;
  /** Đọc log thời gian chơi (test truyền dữ liệu giả). */
  load?: () => Promise<PlayLog>;
  now?: () => number;
};

/** Mục "Tuần này" trong khu bố mẹ: phút chơi theo kỹ năng 7 ngày qua và mỗi trò rèn kỹ năng gì. */
export function ParentStats({ games, lang, onClose, load = loadPlayLog, now = Date.now }: Props) {
  const [log, setLog] = useState<PlayLog | null>(null);
  const fill = useFillName();
  const t = TEXT[lang];

  useEffect(() => {
    let alive = true;
    void load().then((l) => { if (alive) setLog(l); });
    return () => { alive = false; };
  }, [load]);

  const at = now();
  const bySkill = weeklyBySkill(log ?? {}, at);
  const byGame = weeklyByGame(log ?? {}, at);
  const total = weeklyTotal(log ?? {}, at);
  const maxSkill = Math.max(1, ...SKILLS.map((s) => bySkill[s]));
  const minutes = (ms: number) => `${toMinutes(ms)} ${t.min}`;
  // trò chơi nhiều trước, chưa chơi thì theo tên
  const sorted = [...games].sort((a, b) => (byGame[b.id] ?? 0) - (byGame[a.id] ?? 0) || a.title[lang].localeCompare(b.title[lang]));

  return (
    <div className={styles.screen} role="dialog" aria-label="Tuần này" data-testid="parent-stats" data-loaded={log ? 'true' : undefined}>
      <div className={styles.header}>
        <ClayButton color="butter" label="Xong" size={120} activateOn="release" onPress={onClose} caption={t.done}>
          ↩️
        </ClayButton>
        <div>
          <h2 className={styles.title}>{t.title}</h2>
          <p className={styles.hint} data-testid="stats-total">{total > 0 ? t.total(minutes(total)) : t.none}</p>
          <p className={styles.hint}>🔒 {t.local}</p>
        </div>
      </div>
      <div className={styles.list}>
        <section className={styles.card} aria-label={t.skills}>
          <h3 className={styles.cardTitle}>{t.skills}</h3>
          {SKILLS.map((s) => {
            const info = SKILL_INFO[s];
            const ms = bySkill[s];
            return (
              <div key={s} className={styles.barRow} data-testid={`skill-bar-${s}`} data-minutes={toMinutes(ms)}>
                <span className={styles.barLabel}><span aria-hidden="true">{info.icon}</span> {info[lang]}</span>
                <span className={styles.track}>
                  <span className={styles.fill} style={{ width: `${(ms / maxSkill) * 100}%`, background: info.color }} />
                </span>
                <span className={styles.barValue}>{minutes(ms)}</span>
              </div>
            );
          })}
          <p className={styles.note}>{t.overlap}</p>
        </section>
        <section className={styles.card} aria-label={t.games}>
          <h3 className={styles.cardTitle}>{t.games}</h3>
          <ul className={styles.games}>
            {sorted.map((g) => {
              const ms = byGame[g.id] ?? 0;
              return (
                <li key={g.id} className={styles.gameRow} data-testid={`game-skills-${g.id}`}>
                  <span className={styles.gameIcon} aria-hidden="true">{g.icon}</span>
                  <span className={styles.gameName}>{fill(g.title[lang], lang)}</span>
                  <span className={styles.chips}>
                    {skillsOf(g.id).map((s) => (
                      <span key={s} className={styles.chip} data-skill={s} style={{ background: SKILL_INFO[s].color }}>
                        {SKILL_INFO[s].icon} {SKILL_INFO[s][lang]}
                      </span>
                    ))}
                  </span>
                  <span className={ms > 0 ? styles.gameTime : `${styles.gameTime} ${styles.muted}`}>{ms > 0 ? minutes(ms) : t.notPlayed}</span>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
