import { useEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import styles from './WorldMap.module.css';
import { Scene3D } from './Scene3D';
import { DauDau } from './DauDau';
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

type WalkerProps = {
  target: number;
  children: React.ReactNode;
};

function Walker({ target, children }: WalkerProps) {
  const ref = useRef<Group>(null);
  const bouncePhase = useRef(0);

  useFrame((_, dt) => {
    const g = ref.current;
    if (!g) return;

    const speed = 2.5;
    const diff = target - g.position.x;

    if (Math.abs(diff) > 0.02) {
      const dir = Math.sign(diff);
      const step = Math.min(Math.abs(diff), speed * dt) * dir;
      g.position.x += step;

      // Nảy 2 nhịp khi di chuyển
      bouncePhase.current += dt * 12;
      g.position.y = Math.abs(Math.sin(bouncePhase.current)) * 0.4;

      // Xoay mặt về hướng đi
      g.rotation.y = dir > 0 ? -0.4 : 0.4;
    } else {
      g.position.x = target;
      g.position.y = 0;
      bouncePhase.current = 0;
      // Giữ hướng cuối cùng hoặc về trước
      if (Math.abs(target) < 0.1) {
        g.rotation.y = 0;
      }
    }
  });

  return <group ref={ref}>{children}</group>;
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
      <div className={styles.bubble}>{content.get('ui.where')?.[lang]}</div>

      {/* Đậu Đậu */}
      <div className={styles.mascot}>
        <Scene3D label="Đậu Đậu">
          <Walker target={target}>
            <DauDau onTap={() => say('ui.hello')} />
          </Walker>
        </Scene3D>
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
