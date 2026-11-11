import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { clientToStage, stageRect } from '../../ui/Stage';
import { newRound, drop, isDone, type State, type FruitColor } from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

/** Quả mẫu cho mỗi màu giỏ. */
const HINT_FRUIT: Record<FruitColor, string> = {
  red: 'apple',
  yellow: 'banana',
  green: 'pear',
};

interface DragState {
  fruitIdx: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
}

interface BasketState {
  color: FruitColor;
  fruits: string[]; // ids of fruits placed
  bounce: boolean;
}

// E2E API
declare global {
  interface Window {
    __behocSort?: {
      fruits(): { id: string; color: FruitColor }[];
      drop(i: number, color: FruitColor): void;
    };
  }
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const basketCount = ageMonths < 36 ? 2 : 3;
  const [state, setState] = useState<State>(() => newRound(basketCount as 2 | 3));
  const [lastSay, setLastSay] = useState<string>('');
  const [drag, setDrag] = useState<DragState | null>(null);
  const [basketStates, setBasketStates] = useState<BasketState[]>(() =>
    state.baskets.map((b) => ({ color: b.color, fruits: [], bounce: false }))
  );
  const [showStars, setShowStars] = useState(false);
  const [returning, setReturning] = useState<number | null>(null);

  const basketRefs = useRef<(HTMLDivElement | null)[]>([]);
  const fruitRefs = useRef<(HTMLDivElement | null)[]>([]);
  const doneHandled = useRef(false);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  // Nói lời chào khi vào game
  useEffect(() => {
    say('sort.hello');
  }, [say]);

  // E2E API: expose qua ?e2e=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocSort = {
      fruits: () => state.fruits.map((f) => ({ id: f.id, color: f.color })),
      drop: (i, color) => handleDrop(i, color),
    };
    return () => {
      delete window.__behocSort;
    };
  });

  const handleDrop = useCallback(
    (fruitIdx: number, basketColor: FruitColor) => {
      const result = drop(state, fruitIdx, basketColor);
      if (result === 'ok') {
        const fruit = state.fruits[fruitIdx];
        // Cập nhật giỏ
        setBasketStates((prev) =>
          prev.map((bs) =>
            bs.color === basketColor
              ? { ...bs, fruits: [...bs.fruits, fruit.id], bounce: true }
              : bs
          )
        );
        // Reset bounce sau animation
        setTimeout(() => {
          setBasketStates((prev) =>
            prev.map((bs) => (bs.color === basketColor ? { ...bs, bounce: false } : bs))
          );
        }, 300);
        // Nói màu quả
        say(`fruit.${fruit.id}-color`);
        // Force re-render để xóa quả khỏi remaining
        setState({ ...state });
      }
      return result;
    },
    [state, say]
  );

  // Xử lý done
  useEffect(() => {
    if (isDone(state) && !doneHandled.current) {
      doneHandled.current = true;
      setTimeout(() => {
        say('sort.done');
        setShowStars(true);
        // Reset sau 3s
        setTimeout(() => {
          setShowStars(false);
          const newState = newRound(basketCount as 2 | 3);
          setState(newState);
          setBasketStates(newState.baskets.map((b) => ({ color: b.color, fruits: [], bounce: false })));
          doneHandled.current = false;
        }, 3000);
      }, 500);
    }
  }, [state, basketCount, say]);

  // Pointer handlers
  const handlePointerDown = (e: React.PointerEvent, fruitIdx: number) => {
    if (returning !== null) return;
    const target = e.currentTarget as HTMLElement;
    target.setPointerCapture(e.pointerId);
    const pt = clientToStage(e.clientX, e.clientY);
    setDrag({
      fruitIdx,
      x: pt.x,
      y: pt.y,
      startX: pt.x,
      startY: pt.y,
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const pt = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: pt.x, y: pt.y });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!drag) return;

    const pt = clientToStage(e.clientX, e.clientY);
    const moved = Math.abs(pt.x - drag.startX) > 20 || Math.abs(pt.y - drag.startY) > 20;

    // Nếu không di chuyển nhiều, coi như chạm → nói tên quả
    if (!moved) {
      const fruit = state.fruits[drag.fruitIdx];
      say(`fruit.${fruit.id}`);
      setDrag(null);
      return;
    }

    // Kiểm tra thả vào giỏ nào
    let dropped = false;
    for (let i = 0; i < basketRefs.current.length; i++) {
      const el = basketRefs.current[i];
      if (!el) continue;
      const rect = stageRect(el);
      if (pt.x >= rect.left && pt.x <= rect.right && pt.y >= rect.top && pt.y <= rect.bottom) {
        const basket = state.baskets[i];
        const result = handleDrop(drag.fruitIdx, basket.color);
        if (result === 'wrong') {
          // Trôi về
          setReturning(drag.fruitIdx);
          setTimeout(() => setReturning(null), 400);
        }
        dropped = true;
        break;
      }
    }

    if (!dropped) {
      // Thả ngoài giỏ, trôi về
      setReturning(drag.fruitIdx);
      setTimeout(() => setReturning(null), 400);
    }

    setDrag(null);
  };

  // Vị trí gốc của quả (để trôi về)
  const getFruitOriginalPos = (idx: number) => {
    const el = fruitRefs.current[idx];
    if (!el) return { x: 0, y: 0 };
    const rect = stageRect(el);
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  };

  return (
    <div
      className={styles.scene}
      data-testid="game-sort"
      data-last-say={lastSay}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <BackHome onExit={onExit} />

      {/* Khu vực quả */}
      <div className={styles.orchard}>
        {state.fruits.map((fruit, idx) => {
          const visible = state.remaining.includes(idx);
          if (!visible) return <div key={idx} className={styles.fruitSlot} />;

          const isDragging = drag?.fruitIdx === idx;
          const isReturning = returning === idx;

          return (
            <div
              key={idx}
              ref={(el) => { fruitRefs.current[idx] = el; }}
              className={styles.fruitSlot}
            >
              {!isDragging && (
                <div
                  className={`${styles.fruit} ${isReturning ? styles.returning : ''}`}
                  onPointerDown={(e) => handlePointerDown(e, idx)}
                  data-pressed={undefined}
                  aria-label={`Quả ${idx + 1}`}
                >
                  <img
                    src={`${BASE}cards/${fruit.id}.png`}
                    alt={fruit.id}
                    className={styles.fruitImg}
                    draggable={false}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Quả đang kéo */}
      {drag && (
        <div
          className={`${styles.fruit} ${styles.dragging}`}
          style={{
            left: drag.x - 70,
            top: drag.y - 70,
            width: 140,
            height: 140,
          }}
        >
          <img
            src={`${BASE}cards/${state.fruits[drag.fruitIdx].id}.png`}
            alt=""
            className={styles.fruitImg}
            draggable={false}
          />
        </div>
      )}

      {/* Giỏ */}
      <div className={styles.baskets}>
        {basketStates.map((basket, idx) => (
          <div
            key={basket.color}
            ref={(el) => { basketRefs.current[idx] = el; }}
            className={styles.basket}
            data-color={basket.color}
            data-bounce={basket.bounce || undefined}
          >
            <img
              src={`${BASE}cards/${HINT_FRUIT[basket.color]}.png`}
              alt=""
              className={styles.basketHint}
              draggable={false}
            />
            <div className={styles.basketContent}>
              {basket.fruits.map((id, i) => (
                <img
                  key={`${id}-${i}`}
                  src={`${BASE}cards/${id}.png`}
                  alt=""
                  className={styles.basketFruit}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sao bay */}
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
