import { useEffect } from 'react';
import styles from './screens.module.css';
import type { Speaker } from '../core/audio';

export function SleepScreen({ speaker }: { speaker: Speaker }) {
  useEffect(() => { speaker.say('ui.sleep'); }, [speaker]);
  return <div className={`${styles.full} ${styles.sleep}`} data-testid="sleep">😴🐱🌙</div>;
}
