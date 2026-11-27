import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { useSayThen } from '../../ui/useSayThen';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { clientToStage, stageRect } from '../../ui/Stage';
import { useBuddyLook } from '../../ui/buddyContext';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import {
  newRound,
  currentTurn,
  feed,
  advance,
  isDone,
  animalById,
  FOODS,
  hungryKey,
  likesKey,
  hintKey,
  fullKey,
  foodKey,
  soundKey,
  HELLO_KEY,
  DONE_KEY,
  type AnimalId,
  type FoodId,
  type FeedResult,
  type State,
} from './logic';
import { animalBox, layoutFoods, trayBox, mouthPoint, FOOD_SIZE } from './layout';
import { createFeedSounds } from './sounds';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const card = (id: string) => `${BASE}cards/${id}.png`;

/** Chờ sau câu chào rồi mới nói thú đầu tiên đói. */
const HELLO_MS = 2800;
/** Món bay vào miệng mất bao lâu. */
const FLY_MS = 420;
/** Sau khi nhai thì khen "Thỏ thích cà rốt!". */
const LIKES_MS = 1150;
/** Miếng cuối: nhai xong mới vui, kêu tiếng thật. */
const HAPPY_MS = 1300;
/** Tiếng kêu phát hết mới nói "Thỏ no căng bụng rồi!"; số này chỉ dùng khi loa không báo được lúc hết tiếng. */
const FULL_SAY_MS = 1500;
/** Nói xong "no rồi" (câu dài ~4,4s) thì nghỉ chừng này rồi sang con kế. */
const FULL_REST_MS = 400;
/** Ăn mừng cuối lượt. */
const PARTY_MS = 4200;
/** Kéo quá chừng này (px khung) mới tính là kéo, không thì là chạm. */
const MOVE_PX = 16;

type Phase = 'ask' | 'full' | 'party';

interface Drag {
  food: FoodId;
  startX: number;
  startY: number;
  /** Độ lệch từ điểm chạm tới góc trái trên của món. */
  dx: number;
  dy: number;
  x: number;
  y: number;
}

declare global {
  interface Window {
    __behocFeed?: {
      turn(): { animal: AnimalId; foods: FoodId[]; bites: number; need: number } | null;
      index(): number;
      offer(food: FoodId): FeedResult;
    };
  }
}

function makeRound(ageMonths: number): State {
  const s = newRound(ageMonths, Math.random, recentPicks<AnimalId>('feed'));
  rememberPicks('feed', s.turns.map((t) => t.animal), 1);
  return s;
}

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const sounds = useMemo(() => createFeedSounds(), []);
  const [state, setState] = useState<State>(() => makeRound(ageMonths));
  const [phase, setPhase] = useState<Phase>('ask');
  const [drag, setDrag] = useState<Drag | null>(null);
  /** Món đang bay vào miệng (n để chạy lại hiệu ứng). */
  const [flying, setFlying] = useState<{ food: FoodId; n: number } | null>(null);
  /** Món vừa bị chê đang trôi về khay. */
  const [returning, setReturning] = useState<FoodId | null>(null);
  /** Món đã ăn mọc lại trên khay (đổi key để chạy hiệu ứng hiện ra). */
  const [refill, setRefill] = useState<Partial<Record<FoodId, number>>>({});
  const [lastSay, setLastSay] = useState('');
  const [chew, setChew] = useState(0);
  const [shake, setShake] = useState(0);
  const [bounce, setBounce] = useState(0);
  const [hop, setHop] = useState<{ food: FoodId; n: number } | null>(null);
  /** Bé đưa nhầm từ hai lần trở lên: món đúng trên khay nhún gợi ý. */
  const [hint, setHint] = useState(false);
  const [animalPressed, setAnimalPressed] = useState(false);
  const nopes = useRef(0);

  const animalRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Câu nói gần nhất (cả câu trong chuỗi): biết câu chào đã bị bé chạm chen ngang hay chưa. */
  const lastKey = useRef('');
  const markSay = useCallback((key: string) => {
    lastKey.current = key;
    setLastSay(key);
  }, []);
  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      markSay(key);
    },
    [speaker, markSay],
  );
  const sayAll = useSayThen(speaker, markSay);

  const live = useRef({ state, phase });
  live.current = { state, phase };

  const turn = currentTurn(state);
  const animal = turn ? animalById(turn.animal) : null;
  const foods = turn?.foods ?? [];
  const slots = layoutFoods(foods.length);
  const box = animalBox();
  const mouth = animal ? mouthPoint(box, animal.mouth) : { x: 0, y: 0 };

  // Câu chào khi vào trò, rồi nói thú đầu tiên đói
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Câu chào dài ~5,9s: "bạn … đói" chờ câu chào đọc xong (trước đây hẹn 2800ms nên cắt câu chào)
    sayAll([HELLO_KEY], {
      fallbackMs: HELLO_MS,
      onDone: () => {
        // bé đã kịp chạm/cho ăn (có câu khác chen vào) thì thôi không nói chen vào
        const { state: s, phase: p } = live.current;
        const t = currentTurn(s);
        if (t && lastKey.current === HELLO_KEY && s.index === 0 && s.bites === 0 && p === 'ask') say(hungryKey(t.animal));
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTurn = useCallback(
    (s: State) => {
      nopes.current = 0;
      setHint(false);
      setState(s);
      setPhase('ask');
      say(hungryKey(currentTurn(s)!.animal));
    },
    [say],
  );

  const nextAnimal = useCallback(
    (s: State) => {
      const next = advance(s);
      if (isDone(next)) {
        setState(next);
        setPhase('party');
        sounds.happy();
        // ăn mừng ~4,6s đọc xong mới sang ván mới (trước đây PARTY_MS 4200 nên cắt câu mừng)
        sayAll([DONE_KEY], { fallbackMs: PARTY_MS, onDone: () => startTurn(makeRound(ageMonths)) });
        return;
      }
      startTurn(next);
    },
    [ageMonths, sayAll, sounds, startTurn],
  );

  /** Đưa món `food` cho thú (null = thả ra ngoài, món về khay). */
  const offer = useCallback(
    (food: FoodId | null): FeedResult => {
      setDrag(null);
      const t = currentTurn(state);
      if (!t || phase !== 'ask') return 'nope';
      if (food === null) {
        return 'nope';
      }
      const { state: s, result } = feed(state, food);
      if (result === 'nope') {
        // Không âm báo sai: thú lắc đầu nhẹ, món trôi về khay
        nopes.current += 1;
        setShake(Date.now());
        setReturning(food);
        later(() => setReturning(null), 500);
        if (nopes.current >= 2) {
          setHint(true);
          say(hintKey(t.animal));
        } else {
          say(`feed.nope.${t.animal}`);
        }
        return result;
      }
      setState(s);
      setFlying({ food, n: Date.now() });
      later(() => {
        setChew(Date.now());
        sounds.munch();
      }, FLY_MS - 60);
      later(() => {
        setFlying(null);
        setRefill((r) => ({ ...r, [food]: (r[food] ?? 0) + 1 }));
      }, FLY_MS + 80);
      if (result === 'yum') {
        later(() => say(likesKey(t.animal)), LIKES_MS);
      } else {
        setPhase('full');
        later(() => {
          sounds.happy();
          setBounce(Date.now());
          // tiếng kêu phát hết rồi mới nói "no rồi"; nói xong mới sang bạn kế
          sayAll([soundKey(t.animal), fullKey(t.animal)], {
            fallbackMs: FULL_SAY_MS,
            onDone: () => later(() => nextAnimal(s), FULL_REST_MS),
          });
        }, HAPPY_MS);
      }
      return result;
    },
    [state, phase, later, say, sayAll, sounds, nextAnimal],
  );

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocFeed = {
      turn: () => {
        const t = currentTurn(state);
        return t ? { animal: t.animal, foods: [...t.foods], bites: state.bites, need: state.need } : null;
      },
      index: () => state.index,
      offer: (f) => offer(f),
    };
    return () => {
      delete window.__behocFeed;
    };
  });

  const onFoodDown = (food: FoodId, i: number, e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'ask' || drag || flying?.food === food) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    const s = slots[i];
    sounds.pop();
    setHop({ food, n: Date.now() });
    setDrag({ food, startX: p.x, startY: p.y, dx: p.x - s.x, dy: p.y - s.y, x: p.x, y: p.y });
  };

  const onFoodMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
  };

  const onFoodUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - drag.startX, p.y - drag.startY) > MOVE_PX;
    if (!moved) {
      // Chạm món: đọc tên món
      setDrag(null);
      say(foodKey(drag.food));
      return;
    }
    // Tâm món đang kéo có nằm trên thú không (nới rộng một chút cho tay bé)
    const cx = p.x - drag.dx + FOOD_SIZE / 2;
    const cy = p.y - drag.dy + FOOD_SIZE / 2;
    const el = animalRef.current;
    let hit = false;
    if (el) {
      const r = stageRect(el);
      const pad = 30;
      hit = cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad;
    }
    offer(hit ? drag.food : null);
  };

  const onAnimalDown = () => {
    if (!turn) return;
    setAnimalPressed(true);
    setBounce(Date.now());
    say(soundKey(turn.animal));
  };

  const party = phase === 'party';
  const tray = trayBox(Math.max(foods.length, 1));
  const fullHearts = phase === 'full';

  return (
    <div className={styles.scene} data-testid="game-feed" data-last-say={lastSay} data-phase={phase} data-turn={state.index}>
      <Scenery variant="farm" />
      <BackHome onExit={onExit} />

      {/* Thanh no bụng: tim đầy dần, không bao giờ vơi */}
      {turn && !party && (
        <div className={styles.fullness} data-testid="fullness" data-bites={state.bites} data-need={state.need} aria-hidden="true">
          {Array.from({ length: state.need }, (_, k) => (
            <span key={`${state.index}-${k}`} className={styles.heart} data-on={k < state.bites ? '' : undefined}>
              <span className={styles.heartEmpty}>🤍</span>
              {k < state.bites && <span className={styles.heartFull}>❤️</span>}
            </span>
          ))}
        </div>
      )}

      {/* Con thú đói */}
      {turn && animal && !party && (
        <div
          key={`animal-${state.index}`}
          ref={animalRef}
          className={styles.animal}
          style={{ left: box.x, top: box.y, width: box.size, height: box.size }}
          role="button"
          aria-label={`animal-${turn.animal}`}
          data-testid="animal"
          data-animal={turn.animal}
          data-pressed={animalPressed ? '' : undefined}
          onPointerDown={onAnimalDown}
          onPointerUp={() => setAnimalPressed(false)}
          onPointerLeave={() => setAnimalPressed(false)}
          onPointerCancel={() => setAnimalPressed(false)}
        >
          <span className={styles.shadow} aria-hidden="true" />
          <div key={`s${shake}`} className={styles.shakeMove} data-shake={shake ? '' : undefined}>
            <div key={`b${bounce}`} className={styles.bounceMove} data-bounce={bounce ? '' : undefined}>
              <div
                key={`c${chew}`}
                className={styles.chewMove}
                data-chew={chew ? '' : undefined}
                data-testid="animal-body"
                style={{ transformOrigin: `${animal.mouth[0] * 100}% 96%` }}
              >
                <img src={card(animal.card)} alt="" draggable={false} className={styles.animalImg} />
              </div>
            </div>
          </div>
          {fullHearts && (
            <div className={styles.hearts} data-testid="happy" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <span key={k} style={{ left: `${12 + k * 14}%`, animationDelay: `${HAPPY_MS - 200 + k * 150}ms` }}>
                  ❤️
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Khay món ăn */}
      {turn && !party && (
        <div className={styles.tray} style={{ left: tray.x, top: tray.y, width: tray.w, height: tray.h }} aria-hidden="true" />
      )}
      {turn &&
        !party &&
        foods.map((food, i) => {
          const s = slots[i];
          const dragging = drag?.food === food;
          const fly = flying?.food === food;
          let style: CSSProperties = { left: s.x, top: s.y, width: s.size, height: s.size };
          if (dragging) {
            style = { ...style, left: drag.x - drag.dx, top: drag.y - drag.dy };
          } else if (fly) {
            const small = 56;
            style = { left: mouth.x - small / 2, top: mouth.y - small / 2, width: small, height: small, opacity: 0 };
          }
          const h = hop?.food === food ? hop.n : 0;
          const state3 = dragging ? 'drag' : fly ? 'fly' : returning === food ? 'return' : 'tray';
          return (
            <div
              key={`${state.index}-${food}-${refill[food] ?? 0}`}
              className={styles.food}
              style={style}
              role="button"
              aria-label={`food-${food}`}
              data-testid={`food-${food}`}
              data-food={food}
              data-state={state3}
              data-hint={hint && animal?.food === food && !dragging ? '' : undefined}
              data-pressed={dragging ? '' : undefined}
              onPointerDown={(e) => onFoodDown(food, i, e)}
              onPointerMove={onFoodMove}
              onPointerUp={onFoodUp}
              onPointerCancel={() => offer(null)}
            >
              <div key={`h${h}-${fly ? flying?.n : 0}`} className={styles.foodMove} data-hop={h ? '' : undefined}>
                <img src={card(FOODS[food].card)} alt="" draggable={false} className={styles.foodImg} />
              </div>
            </div>
          );
        })}

      {/* Ăn mừng: bạn đồng hành nhảy, tim bay */}
      {party && (
        <div className={styles.party} data-testid="party">
          <img src={buddy.img} alt={buddy.name} className={styles.buddy} draggable={false} />
          {[...Array(10)].map((_, k) => (
            <span key={k} className={styles.partyHeart} style={{ left: `${8 + k * 9}%`, animationDelay: `${(k % 5) * 180}ms` }} aria-hidden="true">
              {k % 2 ? '⭐' : '❤️'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
