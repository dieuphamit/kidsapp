import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { clientToStage, stageRect } from '../../ui/Stage';
import { recentPicks, rememberPicks, type Topic } from '../../core/gameOptions';
import { pictureSayKey, pictureUrl } from '../../content/pictures';
import {
  newRound,
  drop,
  isDone,
  modeForRound,
  roundSize,
  HELLO_KEY,
  type State,
  type FruitColor,
  type SortMode,
} from './logic';
import styles from './Game.module.css';

/** Ván mới: chọn kiểu phân loại, cỡ ván theo tuổi, tránh hình của ván trước. */
function makeRound(topic: Topic, ageMonths: number, prevMode?: SortMode): State {
  const mode = modeForRound(topic, ageMonths, prevMode);
  const { basketCount, itemCount } = roundSize(mode, ageMonths);
  const state = newRound(basketCount, Date.now(), mode, { itemCount, avoid: recentPicks<string>('sort') });
  rememberPicks('sort', state.fruits.map((f) => f.id), 1);
  return state;
}

/** Câu nói khi thả đúng: màu quả, tên hình, hoặc "to quá / nhỏ xíu". */
function correctSayKey(state: State, id: string, bin: FruitColor): string {
  if (state.mode === 'colors') return `fruit.${id}-color`;
  if (state.mode === 'sizes') return bin === 'big' ? 'sort.big' : 'sort.small';
  return pictureSayKey(id);
}

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
      baskets(): FruitColor[];
      mode(): SortMode;
      sayFor(i: number): string;
      drop(i: number, color: FruitColor): void;
    };
  }
}

export default function Game({ speaker, ageMonths, options, onExit }: GameProps) {
  const topic = options?.topic ?? 'mix';
  const [state, setState] = useState<State>(() => makeRound(topic, ageMonths));
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

  // Nói cách xếp khi vào game và mỗi khi đổi kiểu phân loại
  useEffect(() => {
    say(HELLO_KEY[state.mode]);
  }, [say, state.mode]);

  // E2E API: expose qua ?e2e=1
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocSort = {
      fruits: () => state.fruits.map((f) => ({ id: f.id, color: f.color })),
      baskets: () => state.baskets.map((b) => b.color),
      mode: () => state.mode,
      sayFor: (i) => correctSayKey(state, state.fruits[i].id, state.fruits[i].color),
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
        // Nói màu quả / tên hình / to-nhỏ
        say(correctSayKey(state, fruit.id, basketColor));
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
          const newState = makeRound(topic, ageMonths, state.mode);
          setState(newState);
          setBasketStates(newState.baskets.map((b) => ({ color: b.color, fruits: [], bounce: false })));
          doneHandled.current = false;
        }, 3000);
      }, 500);
    }
  }, [state, topic, ageMonths, say]);

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
      say(pictureSayKey(fruit.id));
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

  return (
    <div
      className={styles.scene}
      data-testid="game-sort"
      data-last-say={lastSay}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Vườn cây ăn quả: đồi, cây trĩu quả */}
      <Scenery variant="orchard" />

      <BackHome onExit={onExit} />

      {/* Khu vực quả */}
      {/* Nhiều hình (8) thì xếp 5 + 3 cho gọn hai hàng, không chạm quai giỏ */}
      <div className={styles.orchard} data-many={state.fruits.length > 6 || undefined}>
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
                    src={pictureUrl(fruit.id)}
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
            src={pictureUrl(state.fruits[drag.fruitIdx].id)}
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
            {/* Giỏ mây đan: quai, khăn lót màu, thân đan, vành tết, thẻ quả mẫu */}
            <span className={styles.basketHandle} />
            <span className={styles.basketBody} />
            <span className={styles.basketCloth} />
            <div className={styles.basketContent}>
              {basket.fruits.map((id, i) => (
                <img
                  key={`${id}-${i}`}
                  src={pictureUrl(id)}
                  alt=""
                  className={styles.basketFruit}
                  draggable={false}
                />
              ))}
            </div>
            <span className={styles.basketRim} />
            <span className={styles.basketTag}>
              <img
                src={pictureUrl(state.baskets[idx]?.hint ?? '')}
                alt=""
                className={styles.basketHint}
                draggable={false}
              />
            </span>
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
