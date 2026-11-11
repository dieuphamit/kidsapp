import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './WorldMap.module.css';
import { WorldMapScene } from './WorldMapScene';
import { ClayButton } from './ClayButton';
import { contentByKey } from '../core/content';
import { gamesByPlace, type GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';
import type { ClayColor } from '../core/tokens';

const content = contentByKey();

type PlaceLook = {
  icon: string;
  color: ClayColor;
  posClass: string;
  direction: 'left' | 'right' | 'center';
};

// Bố cục 3 cột x 2 hàng, Đậu Đậu ở giữa
const PLACE_LOOK: Record<string, PlaceLook> = {
  'place.farm': { icon: '🐄', color: 'butter', posClass: styles.placeTopLeft, direction: 'left' },
  'place.pond': { icon: '🦆', color: 'mint', posClass: styles.placeBottomLeft, direction: 'left' },
  'place.orchard': { icon: '🍎', color: 'leaf', posClass: styles.placeTopRight, direction: 'right' },
  'place.music': { icon: '🎵', color: 'lilac', posClass: styles.placeBottomRight, direction: 'right' },
  'place.zoo': { icon: '🦁', color: 'peach', posClass: styles.placeTopCenter, direction: 'center' },
  'place.house': { icon: '🏠', color: 'lilac', posClass: styles.placeBottomCenter, direction: 'center' },
};

function getPlaces(lang: Lang) {
  const places: { key: string; text: string; look: PlaceLook }[] = [];
  for (const [key, item] of content) {
    if (key.startsWith('place.') && PLACE_LOOK[key]) {
      places.push({ key, text: item[lang], look: PLACE_LOOK[key] });
    }
  }
  return places;
}

type Props = {
  games: GameManifest[];
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
  onOpenPicker(placeKey: string, placeGames: GameManifest[]): void;
};

export function WorldMap({ games, lang, speaker, onPick, onOpenPicker }: Props) {
  const [lastSay, setLastSay] = useState('');
  const [target, setTarget] = useState(0);
  const [locked, setLocked] = useState(false);
  const pendingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const returnTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  useEffect(() => {
    say('ui.where');
    return () => {
      if (pendingTimeout.current) clearTimeout(pendingTimeout.current);
      if (returnTimeout.current) clearTimeout(returnTimeout.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const places = getPlaces(lang);
  const gamesMap = useMemo(() => gamesByPlace(games), [games]);

  // Chỉ hiện địa điểm có ít nhất 1 game
  const visiblePlaces = places.filter((p) => {
    const list = gamesMap.get(p.key);
    return list && list.length > 0;
  });

  const handlePlacePress = (placeKey: string, direction: 'left' | 'right' | 'center') => {
    if (locked) return;

    say(placeKey);

    // Xác định hướng đi
    let dir = 0;
    if (direction === 'left') dir = -1.6;
    else if (direction === 'right') dir = 1.6;
    setTarget(dir);

    const placeGames = gamesMap.get(placeKey) ?? [];
    if (placeGames.length === 1) {
      // Chỉ 1 trò → vào thẳng như cũ
      setLocked(true);
      pendingTimeout.current = setTimeout(() => {
        onPick(placeGames[0]);
      }, 800);
    } else if (placeGames.length >= 2) {
      // Nhiều trò → mở picker
      setLocked(true);
      pendingTimeout.current = setTimeout(() => {
        onOpenPicker(placeKey, placeGames);
      }, 800);
    } else {
      // Không có game, về giữa sau 1.5s
      returnTimeout.current = setTimeout(() => {
        setTarget(0);
      }, 1500);
    }
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
        <WorldMapScene target={target} onTapDauDau={() => say('ui.hello')} />
      </div>

      {/* 6 địa điểm */}
      {visiblePlaces.map(({ key, text, look }) => (
        <div key={key} className={`${styles.place} ${look.posClass}`}>
          <ClayButton
            color={look.color}
            label={text}
            caption={text}
            size={168}
            onPress={() => handlePlacePress(key, look.direction)}
          >
            {look.icon}
          </ClayButton>
        </div>
      ))}
    </div>
  );
}
