import { useEffect, useRef, useState } from 'react';
import styles from './WorldMap.module.css';
import { WorldMapScene } from './WorldMapScene';
import { ClayButton } from './ClayButton';
import { contentByKey } from '../core/content';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';
import type { ClayColor } from '../core/tokens';

const content = contentByKey();

type PlaceLook = {
  icon: string;
  color: ClayColor;
  posClass: string;
};

const PLACE_LOOK: Record<string, PlaceLook> = {
  'place.farm': { icon: '🐄', color: 'butter', posClass: styles.placeTopLeft },
  'place.pond': { icon: '🦆', color: 'mint', posClass: styles.placeBottomLeft },
  'place.orchard': { icon: '🍎', color: 'leaf', posClass: styles.placeTopRight },
  'place.music': { icon: '🎵', color: 'lilac', posClass: styles.placeBottomRight },
};

const DEFAULT_LOOK: PlaceLook = { icon: '⭐', color: 'peach', posClass: '' };

function getPlaces(lang: Lang) {
  const places: { key: string; text: string; look: PlaceLook }[] = [];
  for (const [key, item] of content) {
    if (key.startsWith('place.')) {
      const look = PLACE_LOOK[key] ?? DEFAULT_LOOK;
      places.push({ key, text: item[lang], look });
    }
  }
  return places;
}

type Props = {
  games: GameManifest[];
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
};

export function WorldMap({ games, lang, speaker, onPick }: Props) {
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

  const handlePlacePress = (placeKey: string, posClass: string) => {
    if (locked) return;

    say(placeKey);

    // Xác định hướng đi dựa vào vị trí nút
    let dir = 0;
    if (posClass.includes('Left')) dir = -1.6;
    else if (posClass.includes('Right')) dir = 1.6;
    setTarget(dir);

    const game = games.find((g) => g.place === placeKey);
    if (game) {
      setLocked(true);
      pendingTimeout.current = setTimeout(() => {
        onPick(game);
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

      {/* 4 địa điểm */}
      {places.map(({ key, text, look }) => (
        <div key={key} className={`${styles.place} ${look.posClass}`}>
          <ClayButton
            color={look.color}
            label={text}
            caption={text}
            size={168}
            onPress={() => handlePlacePress(key, look.posClass)}
          >
            {look.icon}
          </ClayButton>
        </div>
      ))}
    </div>
  );
}
