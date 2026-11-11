import { useEffect, useRef, useState } from 'react';
import styles from './GamePicker.module.css';
import { ClayButton } from './ClayButton';
import { BackHome } from './BackHome';
import { contentByKey } from '../core/content';
import type { GameManifest } from '../core/games';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';

const content = contentByKey();

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

  const placeText = content.get(placeKey)?.[lang] ?? '';

  const handleGamePress = (g: GameManifest) => {
    if (locked) return;
    setLocked(true);

    // Nói tên trò (dùng titleKey nếu có, không thì dùng place)
    const sayKey = g.titleKey ?? g.place;
    say(sayKey);

    // Mở trò sau ~400ms
    pendingTimeout.current = setTimeout(() => {
      onPick(g);
    }, 400);
  };

  return (
    <div className={styles.picker} data-testid="game-picker" data-last-say={lastSay || undefined}>
      {/* Tiêu đề */}
      <h1 className={styles.title}>{placeText}</h1>

      {/* Các nút trò chơi */}
      <div className={styles.games}>
        {games.map((g) => (
          <div key={g.id} data-testid={`pick-${g.id}`}>
          <ClayButton
            color={g.color}
            size={200}
            label={g.title[lang]}
            caption={g.title[lang]}
            onPress={() => handleGamePress(g)}
          >
            {g.icon}
          </ClayButton>
          </div>
        ))}
      </div>

      {/* Nút quay lại */}
      <BackHome onExit={onBack} label={content.get('ui.mascot-name')?.[lang]} />
    </div>
  );
}
