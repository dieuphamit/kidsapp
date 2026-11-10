import { useState } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { DrawPad } from './DrawPad';
import styles from './Game.module.css';

export default function Game({ lang, speaker, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  return (
    <div className={styles.game} data-testid="game-music" data-last-say={lastSay || undefined}>
      <BackHome onExit={onExit} />
      <DrawPad say={say} lang={lang} />
    </div>
  );
}
