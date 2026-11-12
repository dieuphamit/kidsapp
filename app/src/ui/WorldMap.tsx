import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './WorldMap.module.css';
import { WorldMapScene, type Facing } from './WorldMapScene';
import { ClayButton } from './ClayButton';
import { contentByKey } from '../core/content';
import { gamesByPlace, type GameManifest } from '../core/games';
import { PLACES } from '../core/places';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';

const content = contentByKey();

/** Chờ sau khi chạm khu rồi mới mở màn trò (để kịp nghe tên khu). */
export const PLACE_DELAY_MS = 400;
/** Chờ sau khi chạm nút chơi lại. */
export const REPLAY_DELAY_MS = 300;
/** Số icon trò tối đa trong dải icon của một khu. */
const STRIP_MAX = 4;

// Bố cục: zoo trên trái, orchard trên phải, house dưới trái, puzzle dưới giữa, music dưới phải
const LAYOUT: Record<string, { posClass: string; facing: Facing }> = {
  'place.zoo': { posClass: styles.topLeft, facing: -1 },
  'place.orchard': { posClass: styles.topRight, facing: 1 },
  'place.house': { posClass: styles.bottomLeft, facing: -1 },
  'place.puzzle': { posClass: styles.bottomCenter, facing: 0 },
  'place.music': { posClass: styles.bottomRight, facing: 1 },
};

type Props = {
  games: GameManifest[]; // đã lọc theo tuổi
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
  onOpenPicker?(placeKey: string, placeGames: GameManifest[]): void;
  lastGameId?: string | null;
};

export function WorldMap({ games, lang, speaker, onPick, onOpenPicker, lastGameId }: Props) {
  const [lastSay, setLastSay] = useState('');
  const [facing, setFacing] = useState<Facing>(0);
  const [locked, setLocked] = useState(false);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  useEffect(() => {
    say('ui.where');
    return () => {
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gamesMap = useMemo(() => gamesByPlace(games), [games]);
  const visiblePlaces = PLACES.filter((p) => (gamesMap.get(p.key)?.length ?? 0) > 0);
  const lastGame = lastGameId ? games.find((g) => g.id === lastGameId) : undefined;

  const later = (fn: () => void, ms: number) => {
    setLocked(true);
    pendingTimeout.current = setTimeout(fn, ms);
  };

  const handlePlacePress = (placeKey: string) => {
    if (locked) return;
    say(placeKey);
    setFacing(LAYOUT[placeKey]?.facing ?? 0);
    const placeGames = gamesMap.get(placeKey) ?? [];
    if (placeGames.length === 1) {
      later(() => onPick(placeGames[0]), PLACE_DELAY_MS);
    } else if (placeGames.length >= 2) {
      later(() => onOpenPicker?.(placeKey, placeGames), PLACE_DELAY_MS);
    }
  };

  const handleReplay = (g: GameManifest) => {
    if (locked) return;
    say(g.titleKey ?? g.place);
    setFacing(1);
    later(() => onPick(g), REPLAY_DELAY_MS);
  };

  return (
    <div className={styles.world} data-testid="home" data-last-say={lastSay || undefined}>
      {/* Mây trôi */}
      <div className={`${styles.cloud} ${styles.cloud1}`} data-testid="cloud" />
      <div className={`${styles.cloud} ${styles.cloud2}`} data-testid="cloud" />
      <div className={`${styles.cloud} ${styles.cloud3}`} data-testid="cloud" />
      <div className={`${styles.cloud} ${styles.cloud4}`} data-testid="cloud" />

      {/* Đồi cỏ */}
      <div className={styles.hill} />

      {/* Bong bóng chữ */}
      <div className={styles.bubble} data-testid="bubble">
        {content.get('ui.where')?.[lang]}
      </div>

      {/* Đậu Đậu */}
      <div className={styles.mascot}>
        <WorldMapScene facing={facing} onTapDauDau={() => say('ui.hello')} />
      </div>

      {/* Nút chơi lại trò vừa chơi */}
      {lastGame && (
        <div className={styles.replay} data-testid="replay" data-game={lastGame.id}>
          <ClayButton
            color="butter"
            size={132}
            label={lastGame.title[lang]}
            onPress={() => handleReplay(lastGame)}
            style={{ borderRadius: '50%' }}
          >
            <span className={styles.replayIcon} aria-hidden="true">{lastGame.icon}</span>
            <span className={styles.replayBadge} aria-hidden="true">↻</span>
          </ClayButton>
        </div>
      )}

      {/* Các khu */}
      {visiblePlaces.map((p) => {
        const name = content.get(p.key)?.[lang] ?? '';
        const placeGames = gamesMap.get(p.key) ?? [];
        return (
          <div key={p.key} className={`${styles.place} ${LAYOUT[p.key]?.posClass ?? ''}`} data-testid={`place-${p.key.slice('place.'.length)}`}>
            <ClayButton color={p.color} label={name} size={200} onPress={() => handlePlacePress(p.key)}>
              <span className={styles.placeIcon} aria-hidden="true">{p.icon}</span>
              <span className={styles.placeName} aria-hidden="true">{name}</span>
              <span className={styles.strip} aria-hidden="true" data-testid="strip">
                {placeGames.slice(0, STRIP_MAX).map((g) => (
                  <span key={g.id} className={styles.stripIcon}>{g.icon}</span>
                ))}
              </span>
            </ClayButton>
          </div>
        );
      })}
    </div>
  );
}
