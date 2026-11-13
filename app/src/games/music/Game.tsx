import { useCallback, useState } from 'react';
import type { GameProps } from '../../core/games';
import { playSetup } from '../../core/variety';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { DrawPad } from './DrawPad';
import { Instruments } from './Instruments';
import styles from './Game.module.css';

type Mode = 'draw' | 'play';

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [mode, setMode] = useState<Mode>('draw');
  const [{ level }] = useState(() => playSetup(ageMonths, options));

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  return (
    <div className={styles.game} data-testid="game-music" data-level={level} data-last-say={lastSay || undefined}>
      <BackHome onExit={onExit} />

      {/* Nút chuyển chế độ ở giữa mép trên */}
      <div className={styles.modeToggle}>
        <div className={`${styles.modeBtn} ${mode === 'draw' ? styles.active : ''}`}>
          <ClayButton color="peach" size={120} label="Vẽ" onPress={() => setMode('draw')}>
            🖍️
          </ClayButton>
        </div>
        <div className={`${styles.modeBtn} ${mode === 'play' ? styles.active : ''}`}>
          <ClayButton color="mint" size={120} label="Nhạc" onPress={() => setMode('play')}>
            🎹
          </ClayButton>
        </div>
      </div>

      {/* DrawPad: giữ mounted để lưu bức vẽ, ẩn bằng CSS */}
      <div className={styles.content} style={{ display: mode === 'draw' ? 'flex' : 'none' }}>
        <DrawPad say={say} lang={lang} />
      </div>

      {/* Instruments: chỉ hiện khi chế độ play */}
      {mode === 'play' && (
        <div className={styles.content}>
          <Instruments level={level} say={say} />
        </div>
      )}
    </div>
  );
}
