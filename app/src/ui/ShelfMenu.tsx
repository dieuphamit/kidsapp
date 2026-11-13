import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './ShelfMenu.module.css';
import { ClayButton } from './ClayButton';
import { contentByKey } from '../core/content';
import { buddyImageUrl } from '../core/buddy';
import { useBuddy, useFillName } from './buddyContext';
import { placeByKey, placeOrder } from '../core/places';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';

const content = contentByKey();

/** Chờ sau khi chạm thẻ rồi mở trò (để kịp nghe tên trò). */
export const SHELF_PICK_DELAY_MS = 300;
/** Quá số trò này thì thu nhỏ thẻ và thêm cột để vẫn vừa khung. */
const ROOMY_MAX = 18;

/** Xếp trò theo thứ tự khu (PLACES), rồi `order`, rồi id. */
export function shelfOrder(games: GameManifest[]): GameManifest[] {
  return [...games].sort(
    (a, b) =>
      placeOrder(a.place) - placeOrder(b.place) ||
      (a.order ?? 0) - (b.order ?? 0) ||
      a.id.localeCompare(b.id),
  );
}

type Props = {
  games: GameManifest[];
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
};

/** Menu kiểu kệ đồ chơi: mọi trò hợp tuổi trên một màn, một chạm là vào. */
export function ShelfMenu({ games, lang, speaker, onPick }: Props) {
  const [lastSay, setLastSay] = useState('');
  const buddy = useBuddy();
  const fill = useFillName();
  const locked = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  useEffect(() => {
    say('ui.pick-game');
    return () => {
      if (pending.current) clearTimeout(pending.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sorted = shelfOrder(games);
  const roomy = sorted.length <= ROOMY_MAX;
  const cols = roomy ? 6 : 7;
  const size = roomy ? 132 : 120;
  const rows: GameManifest[][] = [];
  for (let i = 0; i < sorted.length; i += cols) rows.push(sorted.slice(i, i + cols));

  const press = (g: GameManifest) => {
    if (locked.current) return;
    locked.current = true;
    say(g.titleKey ?? g.place);
    pending.current = setTimeout(() => onPick(g), SHELF_PICK_DELAY_MS);
  };

  return (
    <div
      className={styles.shelf}
      data-testid="shelf"
      data-cols={cols}
      data-last-say={lastSay || undefined}
      style={{ '--card': `${size}px`, '--cols': cols } as CSSProperties}
    >
      {/* Bạn đồng hành góc trên trái hỏi "Bé chơi trò nào?" */}
      <div className={styles.mascot} aria-hidden="true">
        <img className={styles.mascotImg} src={buddyImageUrl(buddy.character)} alt="" draggable={false} />
        <div className={styles.ask}>{content.get('ui.pick-game')?.[lang]}</div>
      </div>

      {/* Các tầng kệ, mỗi tầng một tấm gỗ dưới hàng thẻ */}
      <div className={styles.rows}>
        {rows.map((row, r) => (
          <div key={r} className={styles.row}>
            <div className={styles.cards}>
              {row.map((g, i) => (
                <div
                  key={g.id}
                  className={styles.card}
                  data-testid={`shelf-card-${g.id}`}
                  style={{ animationDelay: `${(r * cols + i) * 40}ms` }}
                >
                  <ClayButton
                    color={placeByKey(g.place)?.color ?? g.color}
                    size={size}
                    label={fill(g.title[lang], lang)}
                    onPress={() => press(g)}
                  >
                    <span className={styles.icon} aria-hidden="true">{g.icon}</span>
                  </ClayButton>
                </div>
              ))}
            </div>
            <div className={styles.plank} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}
