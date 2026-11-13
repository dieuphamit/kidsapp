import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { LEARN_HEX, type LearnColor } from '../../core/tokens';
import { playSetup } from '../../core/variety';
import { ClayButton } from '../../ui/ClayButton';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import {
  initial, pick, newRound, itemSayKey, helloKey, doneKey, itemLabel,
  type State, type Round, type CountKind,
} from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

// Fixed y offsets for natural look (seeded by fruit id)
const Y_OFFSETS = [0, 8, -6, 12, -4, 6, -10, 4, -8, 10];
/** Khoảng cách giữa các câu nói đầu lượt (ms). */
const SAY_GAP = 1600;
const DONE_DELAY = 1200;
const NEXT_DELAY = 3500;

/** Lượt vừa chơi, giữ qua các lần vào trò để lần sau ra món khác. */
let lastRound: Round | null = null;

interface FruitState {
  id: number;
  falling: boolean;
  visible: boolean;
  regrowing: boolean;
  wiggle: number;
}

const freshFruits = (n: number, regrowing: boolean): FruitState[] =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, falling: false, visible: true, regrowing, wiggle: 0 }));

/** Hình phẳng vẽ bằng SVG (màu học từ tokens). */
const SHAPE_PATHS: Record<string, string> = {
  circle: 'M50 8a42 42 0 1 0 0.01 0Z',
  square: 'M14 14h72v72h-72Z',
  triangle: 'M50 8L92 88H8Z',
  star: 'M50 6l12.4 27 29.6 3.2-22 20.2 6.1 29.1L50 70.8 23.9 85.5l6.1-29.1-22-20.2 29.6-3.2Z',
  heart: 'M50 88C20 66 6 50 6 32 6 18 17 8 30 8c9 0 16 5 20 12 4-7 11-12 20-12 13 0 24 10 24 24 0 18-14 34-44 56Z',
};

function ItemPicture({ kind, item, color, size }: { kind: CountKind; item: string; color: LearnColor | null; size: number }) {
  if (kind === 'shapes') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className={styles.shapeSvg}>
        <path d={SHAPE_PATHS[item] ?? SHAPE_PATHS.circle} fill={LEARN_HEX[color ?? 'red']} strokeLinejoin="round" />
      </svg>
    );
  }
  return <img src={`${BASE}cards/${item}.png`} alt="" draggable={false} width={size} height={size} className={styles.itemImg} />;
}

export default function Game({ speaker, ageMonths, options, onExit }: GameProps) {
  const [setup] = useState(() => playSetup(ageMonths, options));
  const [round, setRound] = useState<Round>(() => {
    const r = newRound(setup.level, setup.topic, lastRound);
    lastRound = r;
    return r;
  });
  const [state, setState] = useState<State>(() => initial(round.target));
  const [lastSay, setLastSay] = useState<string>('');
  const [fruits, setFruits] = useState<FruitState[]>(() => freshFruits(round.shown, false));
  const [basketFruits, setBasketFruits] = useState<number[]>([]);
  const [showStars, setShowStars] = useState(false);
  const doneHandled = useRef(false);
  const timers = useRef<number[]>([]);
  const introTimers = useRef<number[]>([]);
  const firstRound = useRef(true);

  const say = useCallback((key: string) => {
    speaker.say(key);
    setLastSay(key);
  }, [speaker]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  useEffect(() => {
    const list = timers.current;
    const intro = introTimers.current;
    return () => {
      list.forEach((t) => window.clearTimeout(t));
      intro.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // Đầu lượt: chào (lượt đầu) hoặc gọi tên món; mức khó thì nói thêm số cần lấy.
  useEffect(() => {
    const keys = [firstRound.current ? helloKey(round.kind) : itemSayKey(round.kind, round.item)];
    if (setup.level === 'hard') keys.push('count.ask', `number.${round.target}`);
    firstRound.current = false;
    say(keys[0]);
    keys.slice(1).forEach((k, i) => introTimers.current.push(window.setTimeout(() => say(k), SAY_GAP * (i + 1))));
  }, [round, say, setup.level]);

  const handlePick = useCallback((fruitId: number) => {
    const result = pick(state, fruitId);
    if (result.count === null) {
      // Đã đủ số: món còn lại chỉ lắc nhẹ, không âm báo.
      setFruits((prev) => prev.map((f) => (f.id === fruitId ? { ...f, wiggle: f.wiggle + 1 } : f)));
      return;
    }

    setState(result.state);
    // Bé đã bắt đầu hái: thôi nói phần giới thiệu còn lại
    introTimers.current.forEach((t) => window.clearTimeout(t));
    introTimers.current = [];

    // Start falling animation
    setFruits(prev => prev.map(f =>
      f.id === fruitId ? { ...f, falling: true } : f
    ));

    // Say the number
    say(`number.${result.count}`);

    // After fall animation, hide fruit and add to basket
    later(() => {
      setFruits(prev => prev.map(f =>
        f.id === fruitId ? { ...f, falling: false, visible: false } : f
      ));
      setBasketFruits(prev => [...prev, fruitId]);
    }, 600);
  }, [state, say, later]);

  // Handle done state
  useEffect(() => {
    if (state.done && !doneHandled.current) {
      doneHandled.current = true;
      later(() => {
        say(doneKey(round));
        setShowStars(true);

        later(() => {
          const next = newRound(setup.level, setup.topic, round);
          lastRound = next;
          setShowStars(false);
          setState(initial(next.target));
          setBasketFruits([]);
          setFruits(freshFruits(next.shown, true));
          setRound(next);
          // Remove regrowing class after animation
          later(() => {
            setFruits(prev => prev.map(f => ({ ...f, regrowing: false })));
          }, 500);
          doneHandled.current = false;
        }, NEXT_DELAY);
      }, DONE_DELAY);
    }
  }, [state.done, say, later, round, setup]);

  const isTree = round.kind === 'fruits';
  const asking = setup.level === 'hard';

  return (
    <div
      className={styles.scene}
      data-testid="game-counting"
      data-last-say={lastSay}
      data-level={setup.level}
      data-kind={round.kind}
      data-item={round.item}
      data-target={round.target}
      data-shown={round.shown}
    >
      {!isTree && <Scenery variant={round.kind === 'animals' ? 'farm' : 'meadow'} />}
      <BackHome onExit={onExit} />

      <div className={isTree ? styles.tree : styles.field} data-count={round.shown}>
        <div className={isTree ? styles.canopy : styles.panel}>
          <div className={styles.fruitGrid} style={{ gridTemplateColumns: `repeat(${Math.min(5, round.shown)}, 120px)` }}>
            {fruits.map((fruit, index) => (
              <div key={fruit.id} className={styles.fruitSlot} style={{ marginTop: Y_OFFSETS[index] }}>
                {fruit.visible && (
                  <div
                    key={`w-${fruit.wiggle}`}
                    className={`${styles.fruit} ${fruit.regrowing ? styles.regrow : ''}`}
                    data-falling={fruit.falling}
                    data-wiggle={fruit.wiggle > 0 ? '' : undefined}
                  >
                    <ClayButton
                      color={isTree ? 'peach' : round.kind === 'animals' ? 'butter' : 'mint'}
                      size={120}
                      label={itemLabel(round.kind, fruit.id)}
                      onPress={() => handlePick(fruit.id)}
                      style={{ borderRadius: '50%' }}
                    >
                      <ItemPicture kind={round.kind} item={round.item} color={round.color} size={92} />
                    </ClayButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {isTree && <div className={styles.trunk} />}
      </div>

      <div className={styles.basket} data-kind={round.kind} data-testid="count-basket">
        {/* Chấm chỗ trống: đủ chấm là đủ số, bé không cần biết đọc số */}
        <div className={styles.basketContent}>
          {Array.from({ length: round.target }, (_, i) => {
            const id = basketFruits[i];
            return (
              <span key={i} className={styles.spot} data-filled={id !== undefined ? '' : undefined}>
                {id !== undefined && (
                  <span className={styles.basketFruit}>
                    <ItemPicture kind={round.kind} item={round.item} color={round.color} size={round.target > 5 ? 32 : 40} />
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      <span className={styles.countDisplay} aria-hidden="true" data-asking={asking ? '' : undefined}>
        {asking ? `${basketFruits.length}/${round.target}` : basketFruits.length}
      </span>

      {showStars && (
        <div className={styles.stars}>
          {[...Array(8)].map((_, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${10 + i * 10 + (i % 3) * 2}%`,
                top: `${40 + (i % 4) * 5}%`,
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
