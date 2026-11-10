import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { ClayButton } from '../../ui/ClayButton';
import { BackHome } from '../../ui/BackHome';
import { initial, pick, reset, type State } from './logic';
import styles from './Game.module.css';

// Fixed y offsets for natural look (seeded by fruit id)
const Y_OFFSETS = [0, 8, -6, 12, -4, 6, -10, 4, -8, 10];

interface FruitState {
  id: number;
  falling: boolean;
  visible: boolean;
  regrowing: boolean;
}

export default function Game({ speaker, onExit }: GameProps) {
  const [state, setState] = useState<State>(initial);
  const [lastSay, setLastSay] = useState<string>('');
  const [fruits, setFruits] = useState<FruitState[]>(
    () => Array.from({ length: 10 }, (_, i) => ({ id: i + 1, falling: false, visible: true, regrowing: false }))
  );
  const [basketFruits, setBasketFruits] = useState<number[]>([]);
  const [showStars, setShowStars] = useState(false);
  const doneHandled = useRef(false);

  const say = useCallback((key: string) => {
    speaker.say(key);
    setLastSay(key);
  }, [speaker]);

  useEffect(() => {
    say('count.hello');
  }, [say]);

  const handlePick = useCallback((fruitId: number) => {
    const result = pick(state, fruitId);
    if (result.count === null) return;

    setState(result.state);

    // Start falling animation
    setFruits(prev => prev.map(f =>
      f.id === fruitId ? { ...f, falling: true } : f
    ));

    // Say the number
    say(`number.${result.count}`);

    // After fall animation, hide fruit and add to basket
    setTimeout(() => {
      setFruits(prev => prev.map(f =>
        f.id === fruitId ? { ...f, falling: false, visible: false } : f
      ));
      setBasketFruits(prev => [...prev, fruitId]);
    }, 600);
  }, [state, say]);

  // Handle done state
  useEffect(() => {
    if (state.done && !doneHandled.current) {
      doneHandled.current = true;
      setTimeout(() => {
        say('count.done');
        setShowStars(true);

        // Reset after 4 seconds
        setTimeout(() => {
          setShowStars(false);
          setState(reset());
          setBasketFruits([]);
          setFruits(
            Array.from({ length: 10 }, (_, i) => ({ id: i + 1, falling: false, visible: true, regrowing: true }))
          );
          // Remove regrowing class after animation
          setTimeout(() => {
            setFruits(prev => prev.map(f => ({ ...f, regrowing: false })));
          }, 500);
          doneHandled.current = false;
        }, 4000);
      }, 1200);
    }
  }, [state.done, say]);

  return (
    <div className={styles.scene} data-testid="game-counting" data-last-say={lastSay}>
      <BackHome onExit={onExit} />

      <div className={styles.tree}>
        <div className={styles.canopy}>
          <div className={styles.fruitGrid}>
            {fruits.map((fruit, index) => (
              <div key={fruit.id} className={styles.fruitSlot} style={{ marginTop: Y_OFFSETS[index] }}>
                {fruit.visible && (
                  <div
                    className={`${styles.fruit} ${fruit.regrowing ? styles.regrow : ''}`}
                    data-falling={fruit.falling}
                  >
                    <ClayButton
                      color="peach"
                      size={120}
                      label={`Quả ${fruit.id}`}
                      onPress={() => handlePick(fruit.id)}
                      style={{ borderRadius: '50%' }}
                    >
                      <span className={styles.fruitEmoji}>🍎</span>
                    </ClayButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.trunk} />
      </div>

      <div className={styles.basket}>
        <div className={styles.basketContent}>
          {basketFruits.map((id, idx) => (
            <span key={`${id}-${idx}`} className={styles.basketFruit}>🍎</span>
          ))}
        </div>
      </div>
      <span className={styles.countDisplay} aria-hidden="true">
        {basketFruits.length}
      </span>

      {showStars && (
        <div className={styles.stars}>
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${10 + i * 10 + Math.random() * 5}%`,
                top: `${40 + Math.random() * 20}%`,
                animationDelay: `${i * 100}ms`,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
