import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './GamePicker.module.css';
import { ClayButton } from './ClayButton';
import { BackHome } from './BackHome';
import { contentByKey } from '../core/content';
import { buddyImageUrl } from '../core/buddy';
import { useBuddy, useFillName } from './buddyContext';
import { placeByKey } from '../core/places';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';

const content = contentByKey();

/** Chờ sau khi chạm thẻ rồi mở trò (để kịp nghe tên trò). */
export const PICK_DELAY_MS = 300;
/** Tối đa số thẻ trên một hàng. */
const PER_ROW = 5;

type Props = {
  placeKey: string;
  games: GameManifest[];
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
  onBack(): void;
};

export function GamePicker({ placeKey, games, lang, speaker, onPick, onBack }: Props) {
  const [lastSay, setLastSay] = useState('');
  const [locked, setLocked] = useState(false);
  const buddy = useBuddy();
  const fill = useFillName();
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  useEffect(() => {
    say('ui.pick-game');
    return () => {
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const place = placeByKey(placeKey);
  const placeText = fill(content.get(placeKey)?.[lang] ?? '', lang);
  const color = place?.color ?? 'lilac';

  const handleGamePress = (g: GameManifest) => {
    if (locked) return;
    setLocked(true);
    say(g.titleKey ?? g.place);
    pendingTimeout.current = setTimeout(() => onPick(g), PICK_DELAY_MS);
  };

  // Nhiều hơn 5 trò thì chia đều các hàng (6 trò → 2 hàng × 3) thay vì để một thẻ lẻ hàng dưới
  const rows = Math.max(1, Math.ceil(games.length / PER_ROW));
  const rowStyle = { '--per-row': Math.max(1, Math.ceil(games.length / rows)) } as CSSProperties;

  return (
    <div
      className={styles.picker}
      data-testid="game-picker"
      data-last-say={lastSay || undefined}
      style={{ '--place-color': `var(--clay-${color})` } as CSSProperties}
    >
      {/* Dải màu khu */}
      <div className={styles.band} aria-hidden="true" />

      {/* Bong bóng tên khu */}
      <h1 className={styles.title}>
        {place && <span className={styles.titleIcon} aria-hidden="true">{place.icon}</span>}
        <span>{placeText}</span>
      </h1>

      {/* Thẻ trò */}
      <div className={styles.games} style={rowStyle}>
        {games.map((g, i) => (
          <div
            key={g.id}
            className={styles.card}
            data-testid={`pick-${g.id}`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <ClayButton color={g.color} size={180} label={fill(g.title[lang], lang)} onPress={() => handleGamePress(g)}>
              <span className={styles.cardIcon} aria-hidden="true">{g.icon}</span>
              <span className={styles.cardName} aria-hidden="true">{fill(g.title[lang], lang)}</span>
            </ClayButton>
          </div>
        ))}
      </div>

      {/* Bạn đồng hành hỏi "Bé chơi trò nào?" */}
      <div className={styles.mascot} aria-hidden="true">
        <img className={styles.mascotImg} src={buddyImageUrl(buddy.character)} alt="" draggable={false} />
        <div className={styles.ask}>{content.get('ui.pick-game')?.[lang]}</div>
      </div>

      {/* Nút quay lại */}
      <BackHome onExit={onBack} label={fill(content.get('ui.mascot-name')?.[lang] ?? '', lang)} />
    </div>
  );
}
