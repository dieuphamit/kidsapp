import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { useSayThen } from '../../ui/useSayThen';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { clientToStage, stageRect } from '../../ui/Stage';
import { useBuddyLook } from '../../ui/buddyContext';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { playSetup, type Level } from '../../core/variety';
import {
  newRound,
  currentTurn,
  addIngredient,
  turnOn,
  stir,
  stirProgress,
  serve,
  advance,
  isDone,
  missing,
  dishById,
  customerById,
  INGREDIENTS,
  wantKey,
  dishKey,
  foodKey,
  HELLO_KEY,
  NOPE_KEY,
  LOOK_KEY,
  READY_KEY,
  NOT_YET_KEY,
  STIR_KEY,
  COOKED_KEY,
  SERVE_KEY,
  YUM_KEY,
  DONE_KEY,
  type AddResult,
  type CustomerId,
  type Dish,
  type DishId,
  type IngredientId,
  type Phase,
  type State,
} from './logic';
import {
  CUSTOMER,
  POT,
  POT_SURFACE,
  STOVE,
  STOVE_SIZE,
  CARD,
  BOWL,
  CHEF,
  SERVED,
  COUNTER_Y,
  ITEM_SIZE,
  layoutItems,
  floatSpot,
} from './layout';
import { createCookSounds } from './sounds';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const card = (id: string) => `${BASE}cards/${id}.png`;
const LADLE_IMG = card('words/spoon');

/** Chờ sau câu chào rồi mới nói món khách muốn. */
const HELLO_MS = 3600;
/** Nguyên liệu bay vào nồi mất bao lâu. */
const FLY_MS = 380;
/** Sau tiếng tõm thì đọc tên nguyên liệu. */
const NAME_MS = 250;
/** Đủ nguyên liệu: chờ đọc tên món cuối rồi mới nhắc bật bếp. */
const READY_SAY_MS = 1500;
/** Nhắc "mình cần thêm…" rồi đọc tên món còn thiếu. */
const LOOK_NAME_MS = 2100;
/** Món chín: múc ra bát mất bao lâu. */
const SCOOP_MS = 700;
/**
 * Khách ăn: nhai trước, rồi vui và kêu, kêu xong mới cảm ơn, cảm ơn xong mới đi.
 * EAT_THANKS_MS chỉ dùng khi loa không báo được lúc hết tiếng (loa thật chờ tiếng kêu phát hết).
 */
const EAT_HAPPY_MS = 1400;
const EAT_THANKS_MS = 2900;
const LEAVE_MS = 700;
/** Ăn mừng cuối lượt. */
const PARTY_MS = 4600;
/** Kéo quá chừng này (px khung) mới tính là kéo, không thì là chạm. */
const MOVE_PX = 16;
/** Mỗi lần chạm nồi lúc đang sôi cũng khuấy thêm chừng này (cho bé chưa kéo vòng được). */
const TAP_STIR_PX = 110;
/** Nới vùng thả quanh nồi, quanh khách cho tay bé. */
const DROP_PAD = 44;
/** Khoảng lặng lúc nồi sôi mà bé chưa khuấy thì vá tự lắc gợi ý và nhắc lại. */
const STIR_IDLE_MS = 6000;

type Drag =
  | { kind: 'item'; item: IngredientId; startX: number; startY: number; dx: number; dy: number; x: number; y: number }
  | { kind: 'ladle'; x: number; y: number; lastX: number; lastY: number; travel: number }
  | { kind: 'bowl'; startX: number; startY: number; dx: number; dy: number; x: number; y: number };

type CustomerAnim = 'in' | 'eat' | 'out';

export interface CookSnapshot {
  index: number;
  phase: Phase;
  customer: CustomerId;
  dish: DishId;
  need: IngredientId[];
  counter: IngredientId[];
  added: IngredientId[];
  stirred: number;
  stirNeed: number;
}

declare global {
  interface Window {
    __behocCook?: {
      snapshot(): CookSnapshot | null;
      add(item: IngredientId): AddResult;
      turnOn(): boolean;
      stir(amount: number): boolean;
      serve(): boolean;
    };
  }
}

function makeRound(level: Level): State {
  const s = newRound(level, Math.random, {
    customers: recentPicks<CustomerId>('cook'),
    dishes: recentPicks<DishId>('cook-dish'),
  });
  rememberPicks('cook', s.turns.map((t) => t.customer), 1);
  rememberPicks('cook-dish', s.turns.map((t) => t.dish), 1);
  return s;
}

/** Món đã nấu: bát (hoặc cốc sinh tố) có màu món và vài nguyên liệu bên trên. */
function DishView({ dish, items, eaten = false }: { dish: Dish; items: readonly IngredientId[]; eaten?: boolean }) {
  const top = items.slice(0, 3);
  const broth = { '--broth': `var(--${dish.broth})` } as CSSProperties;
  if (dish.vessel === 'cup') {
    return (
      <div className={styles.cup} style={broth} data-eaten={eaten ? '' : undefined} aria-hidden="true">
        <span className={styles.straw} />
        <span className={styles.cupGlass}>
          <span className={styles.cupDrink} />
        </span>
        {top[0] && <img className={styles.cupFruit} src={card(INGREDIENTS[top[0]].card)} alt="" draggable={false} />}
      </div>
    );
  }
  return (
    <div className={styles.bowl} style={broth} data-eaten={eaten ? '' : undefined} aria-hidden="true">
      <span className={styles.bowlFood}>
        {top.map((it, k) => (
          <img key={it} className={styles.bowlTopping} data-k={k} src={card(INGREDIENTS[it].card)} alt="" draggable={false} />
        ))}
      </span>
      <span className={styles.bowlBody} />
    </div>
  );
}

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const sounds = useMemo(() => createCookSounds(), []);
  const [{ level }] = useState(() => playSetup(ageMonths, options));
  const [state, setState] = useState<State>(() => makeRound(level));
  const [party, setParty] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** Nguyên liệu đang bay vào nồi. */
  const [flying, setFlying] = useState<IngredientId | null>(null);
  /** Món lạ vừa bị trả về quầy (lắc nhẹ). */
  const [returning, setReturning] = useState<{ item: IngredientId; n: number } | null>(null);
  const [hop, setHop] = useState<{ item: IngredientId; n: number } | null>(null);
  /** Bé thả món lạ hai lần, hoặc bấm bếp khi chưa đủ: món còn thiếu nhún gợi ý. */
  const [hint, setHint] = useState(false);
  const [splash, setSplash] = useState(0);
  const [lastSay, setLastSay] = useState('');
  const [customerAnim, setCustomerAnim] = useState<CustomerAnim>('in');
  const [customerBounce, setCustomerBounce] = useState(0);
  const [customerPressed, setCustomerPressed] = useState(false);
  const [happy, setHappy] = useState(false);
  const [cardBounce, setCardBounce] = useState(0);
  const [chefBounce, setChefBounce] = useState(0);
  const [stoveWiggle, setStoveWiggle] = useState(0);
  const [ladleNudge, setLadleNudge] = useState(0);
  /** Bát vừa múc ra (chạy hiệu ứng múc từ nồi sang). */
  const [scoop, setScoop] = useState(0);
  const nopes = useRef(0);

  const potRef = useRef<HTMLDivElement>(null);
  const customerRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );
  const sayAll = useSayThen(speaker, setLastSay);

  const live = useRef(state);
  live.current = state;

  const turn = currentTurn(state);
  const dish = turn ? dishById(turn.dish) : null;
  const customer = turn ? customerById(turn.customer) : null;
  const phase = state.phase;
  const progress = stirProgress(state);
  const counter = turn ? turn.counter.filter((it) => !state.added.includes(it) || flying === it) : [];
  const slots = layoutItems(turn?.counter.length ?? 0);
  const slotOf = (it: IngredientId) => slots[turn?.counter.indexOf(it) ?? 0];
  const lacking = missing(state);

  // Câu chào khi vào trò, rồi nói món khách muốn
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(HELLO_KEY);
    later(() => {
      // bé đã kịp bỏ nguyên liệu rồi thì thôi không nói chen vào
      const s = live.current;
      const t = currentTurn(s);
      if (t && s.index === 0 && s.added.length === 0 && s.phase === 'gather') say(wantKey(t.dish));
    }, HELLO_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Nồi sôi mà bé chưa khuấy: vá lắc gợi ý và nhắc lại
  useEffect(() => {
    if (phase !== 'stir' || drag?.kind === 'ladle') return;
    const t = setTimeout(() => {
      setLadleNudge(Date.now());
      say(STIR_KEY);
    }, STIR_IDLE_MS);
    return () => clearTimeout(t);
  }, [phase, drag, state.stirred, say]);

  const startTurn = useCallback(
    (s: State) => {
      nopes.current = 0;
      setHint(false);
      setHappy(false);
      setState(s);
      setCustomerAnim('in');
      say(wantKey(currentTurn(s)!.dish));
    },
    [say],
  );

  const nextCustomer = useCallback(
    (s: State) => {
      const next = advance(s);
      if (isDone(next)) {
        setState(next);
        setParty(true);
        sounds.happy();
        say(DONE_KEY);
        later(() => {
          setParty(false);
          startTurn(makeRound(level));
        }, PARTY_MS);
        return;
      }
      startTurn(next);
    },
    [level, later, say, sounds, startTurn],
  );

  /** Thả nguyên liệu `item` vào nồi (null = thả ra ngoài, về chỗ). */
  const addItem = useCallback(
    (item: IngredientId | null): AddResult => {
      setDrag(null);
      const s0 = live.current;
      const t = currentTurn(s0);
      if (!t || item === null || party) return 'ignored';
      const { state: s, result } = addIngredient(s0, item);
      if (result === 'ignored') return result;
      if (result === 'stranger') {
        // Không âm báo sai: món lắc nhẹ rồi về chỗ, Đậu Đậu gợi ý dịu dàng
        nopes.current += 1;
        setReturning({ item, n: Date.now() });
        later(() => setReturning((r) => (r?.item === item ? null : r)), 800);
        if (nopes.current >= 2) {
          setHint(true);
          say(LOOK_KEY);
          const need = missing(s0)[0];
          if (need) later(() => say(foodKey(need)), LOOK_NAME_MS);
        } else {
          say(NOPE_KEY);
        }
        return result;
      }
      live.current = s;
      setState(s);
      setFlying(item);
      later(() => {
        setFlying((f) => (f === item ? null : f));
        setSplash(Date.now());
        sounds.plop();
      }, FLY_MS);
      later(() => say(foodKey(item)), FLY_MS + NAME_MS);
      if (result === 'ready') {
        setHint(false);
        later(() => {
          if (live.current.phase === 'ready') say(READY_KEY);
        }, FLY_MS + READY_SAY_MS);
      }
      return result;
    },
    [party, later, say, sounds],
  );

  const pressStove = useCallback((): boolean => {
    const s0 = live.current;
    const { state: s, ok } = turnOn(s0);
    if (!ok) {
      setStoveWiggle(Date.now());
      if (s0.phase === 'gather') {
        setHint(true);
        say(NOT_YET_KEY);
      } else {
        sounds.blub();
      }
      return false;
    }
    live.current = s;
    setState(s);
    sounds.whoosh();
    later(() => sounds.blub(), 400);
    later(() => say(STIR_KEY), 500);
    return true;
  }, [later, say, sounds]);

  const doStir = useCallback(
    (amount: number): boolean => {
      const s0 = live.current;
      const before = Math.floor(s0.stirred / 260);
      const { state: s, cooked } = stir(s0, amount);
      if (s === s0) return false;
      live.current = s;
      setState(s);
      if (Math.floor(s.stirred / 260) > before) sounds.blub();
      if (cooked) {
        setDrag((d) => (d?.kind === 'ladle' ? null : d));
        setScoop(Date.now());
        later(() => {
          sounds.happy();
          say(COOKED_KEY);
        }, SCOOP_MS);
      }
      return cooked;
    },
    [later, say, sounds],
  );

  const serveBowl = useCallback((): boolean => {
    setDrag(null);
    const s0 = live.current;
    const t = currentTurn(s0);
    const { state: s, ok } = serve(s0);
    if (!ok || !t) return false;
    live.current = s;
    setState(s);
    setCustomerAnim('eat');
    later(() => sounds.munch(), 300);
    later(() => {
      setHappy(true);
      setCustomerBounce(Date.now());
      sounds.happy();
      // tiếng khách kêu phát hết rồi mới cảm ơn; cảm ơn xong khách mới ra về
      sayAll([customerById(t.customer).sound, YUM_KEY], {
        fallbackMs: EAT_THANKS_MS - EAT_HAPPY_MS,
        onDone: () => {
          setCustomerAnim('out');
          later(() => nextCustomer(s), LEAVE_MS);
        },
      });
    }, EAT_HAPPY_MS);
    return true;
  }, [later, sayAll, sounds, nextCustomer]);

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocCook = {
      snapshot: () => {
        const s = live.current;
        const t = currentTurn(s);
        if (!t) return null;
        return { index: s.index, phase: s.phase, customer: t.customer, dish: t.dish, need: [...t.need], counter: [...t.counter], added: [...s.added], stirred: s.stirred, stirNeed: s.stirNeed };
      },
      add: (it) => addItem(it),
      turnOn: () => pressStove(),
      stir: (n) => doStir(n),
      serve: () => serveBowl(),
    };
    return () => {
      delete window.__behocCook;
    };
  });

  /* ---------- Kéo nguyên liệu ---------- */
  const inRect = (el: HTMLElement | null, x: number, y: number, pad: number) => {
    if (!el) return false;
    const r = stageRect(el);
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  const onItemDown = (item: IngredientId, e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'gather' || drag || flying === item || party) {
      setHop({ item, n: Date.now() });
      return;
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    const s = slotOf(item);
    sounds.pop();
    setHop({ item, n: Date.now() });
    setReturning(null);
    setDrag({ kind: 'item', item, startX: p.x, startY: p.y, dx: p.x - s.x, dy: p.y - s.y, x: p.x, y: p.y });
  };

  const onItemMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'item') return;
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
  };

  const onItemUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'item') return;
    const p = clientToStage(e.clientX, e.clientY);
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) <= MOVE_PX) {
      // Chạm nguyên liệu: đọc tên
      setDrag(null);
      say(foodKey(drag.item));
      return;
    }
    const cx = p.x - drag.dx + ITEM_SIZE / 2;
    const cy = p.y - drag.dy + ITEM_SIZE / 2;
    addItem(inRect(potRef.current, cx, cy, DROP_PAD) ? drag.item : null);
  };

  /* ---------- Vá khuấy ---------- */
  const onLadleDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'stir') return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    sounds.pop();
    setDrag({ kind: 'ladle', x: p.x, y: p.y, lastX: p.x, lastY: p.y, travel: 0 });
  };

  const onLadleMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'ladle') return;
    const p = clientToStage(e.clientX, e.clientY);
    const d = Math.hypot(p.x - drag.lastX, p.y - drag.lastY);
    // chỉ tính quãng khuấy khi vá ở trong nồi (nới rộng cho tay bé)
    const over = inRect(potRef.current, p.x, p.y, DROP_PAD + 30);
    setDrag({ ...drag, x: p.x, y: p.y, lastX: p.x, lastY: p.y, travel: drag.travel + (over ? d : 0) });
    if (over && d > 0) doStir(d);
  };

  const onLadleUp = () => {
    if (drag?.kind === 'ladle') setDrag(null);
  };

  /* ---------- Bát ---------- */
  const onBowlDown = (e: PointerEvent<HTMLDivElement>) => {
    if (phase !== 'bowl' || party) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    sounds.pop();
    setDrag({ kind: 'bowl', startX: p.x, startY: p.y, dx: p.x - BOWL.x, dy: p.y - BOWL.y, x: p.x, y: p.y });
  };

  const onBowlMove = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'bowl') return;
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
  };

  const onBowlUp = (e: PointerEvent<HTMLDivElement>) => {
    if (drag?.kind !== 'bowl') return;
    const p = clientToStage(e.clientX, e.clientY);
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) <= MOVE_PX) {
      setDrag(null);
      say(SERVE_KEY);
      return;
    }
    const cx = p.x - drag.dx + BOWL.w / 2;
    const cy = p.y - drag.dy + BOWL.h / 2;
    if (inRect(customerRef.current, cx, cy, DROP_PAD)) serveBowl();
    else setDrag(null);
  };

  /* ---------- Chạm khác ---------- */
  const onPotDown = () => {
    setSplash(Date.now());
    if (phase === 'stir') doStir(TAP_STIR_PX);
    else sounds.plop();
  };

  const onCustomerDown = () => {
    if (!customer) return;
    setCustomerPressed(true);
    setCustomerBounce(Date.now());
    say(customer.sound);
  };

  const onCardDown = () => {
    if (!dish) return;
    setCardBounce(Date.now());
    say(dishKey(dish.id as DishId));
  };

  /** Chạm đầu bếp: nhắc lại việc cần làm lúc này. */
  const onChefDown = () => {
    setChefBounce(Date.now());
    if (!turn) return;
    const key =
      phase === 'gather' ? wantKey(turn.dish) : phase === 'ready' ? READY_KEY : phase === 'stir' ? STIR_KEY : phase === 'bowl' ? SERVE_KEY : YUM_KEY;
    say(key);
  };

  const cooking = phase === 'stir' || phase === 'bowl' || phase === 'served';
  const potColor = cooking ? Math.round((phase === 'stir' ? progress : 1) * 100) : 0;
  const swirl = (phase === 'stir' ? progress : cooking ? 1 : 0) * Math.PI * 4;

  // Vá: nằm trong nồi, theo tay khi kéo
  const LADLE = 150;
  const ladleRest = { x: POT.x + POT.w - 150, y: POT.y - 118 };
  const ladlePos = drag?.kind === 'ladle' ? { x: drag.x - LADLE / 2, y: drag.y - LADLE / 2 } : ladleRest;

  // Bát: ở chỗ múc ra, theo tay khi kéo, trước mặt khách khi đã phục vụ
  let bowlStyle: CSSProperties = { left: BOWL.x, top: BOWL.y, width: BOWL.w, height: BOWL.h };
  if (drag?.kind === 'bowl') bowlStyle = { ...bowlStyle, left: drag.x - drag.dx, top: drag.y - drag.dy };
  else if (phase === 'served') bowlStyle = { left: SERVED.x, top: SERVED.y, width: SERVED.w, height: SERVED.h };

  return (
    <div
      className={styles.scene}
      data-testid="game-cook"
      data-last-say={lastSay}
      data-phase={party ? 'party' : phase}
      data-turn={state.index}
      data-level={level}
    >
      <Scenery variant="room" />
      <BackHome onExit={onExit} />

      {/* Đầu bếp (bạn đồng hành) sau quầy bên trái */}
      {!party && (
        <div
          className={styles.chef}
          style={{ left: CHEF.x, top: CHEF.y, width: CHEF.w, height: CHEF.h }}
          role="button"
          aria-label="chef"
          data-testid="chef"
          onPointerDown={onChefDown}
        >
          <div key={`cb${chefBounce}`} className={styles.chefMove} data-bounce={chefBounce ? '' : undefined}>
            <span className={styles.chefHat} aria-hidden="true" />
            <img src={buddy.img} alt={buddy.name} className={styles.chefImg} draggable={false} />
          </div>
        </div>
      )}

      {/* Khách thú */}
      {turn && customer && dish && !party && (
        <div
          key={`customer-${state.index}-${turn.customer}`}
          ref={customerRef}
          className={styles.customer}
          style={{ left: CUSTOMER.x, top: CUSTOMER.y, width: CUSTOMER.w, height: CUSTOMER.h }}
          role="button"
          aria-label={`customer-${turn.customer}`}
          data-testid="customer"
          data-customer={turn.customer}
          data-anim={customerAnim}
          data-pressed={customerPressed ? '' : undefined}
          onPointerDown={onCustomerDown}
          onPointerUp={() => setCustomerPressed(false)}
          onPointerLeave={() => setCustomerPressed(false)}
          onPointerCancel={() => setCustomerPressed(false)}
        >
          <div key={`b${customerBounce}`} className={styles.customerBounce} data-bounce={customerBounce ? '' : undefined}>
            <img src={`${BASE}${customer.img}`} alt="" draggable={false} className={styles.customerImg} data-eat={customerAnim === 'eat' ? '' : undefined} />
          </div>
          {/* Bong bóng ý muốn: món khách muốn */}
          {(phase === 'gather' || phase === 'ready' || phase === 'stir') && (
            <div className={styles.wish} aria-hidden="true">
              <DishView dish={dish} items={dish.items} />
            </div>
          )}
          {happy && (
            <div className={styles.hearts} data-testid="happy" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <span key={k} style={{ left: `${10 + k * 15}%`, animationDelay: `${k * 140}ms` }}>
                  {k % 3 === 1 ? '💛' : '❤️'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quầy bếp */}
      <div className={styles.counter} style={{ top: COUNTER_Y }} aria-hidden="true" />

      {/* Thẻ công thức */}
      {turn && dish && !party && (
        <div
          key={`card-${state.index}`}
          className={styles.card}
          style={{ left: CARD.x, top: CARD.y, width: CARD.w, height: CARD.h }}
          role="button"
          aria-label={`recipe-${dish.id}`}
          data-testid="recipe"
          data-dish={dish.id}
          onPointerDown={onCardDown}
        >
          <div key={`cdb${cardBounce}`} className={styles.cardMove} data-bounce={cardBounce ? '' : undefined}>
            <div className={styles.cardDish}>
              <DishView dish={dish} items={dish.items} />
            </div>
            <div className={styles.cardSlots} data-count={turn.need.length}>
              {turn.need.map((it) => {
                const done = state.added.includes(it) && flying !== it;
                return (
                  <span
                    key={it}
                    className={styles.slot}
                    data-testid={`slot-${it}`}
                    data-done={done ? '' : undefined}
                    data-hint={hint && !state.added.includes(it) ? '' : undefined}
                  >
                    <img src={card(INGREDIENTS[it].card)} alt="" draggable={false} />
                    {done && <span className={styles.check}>✓</span>}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Bếp và nồi */}
      <div className={styles.burner} style={{ left: POT.x + 20, top: POT.y + POT.h - 26, width: POT.w - 40 }} aria-hidden="true">
        {cooking && (
          <span className={styles.flames}>
            {[0, 1, 2, 3, 4].map((k) => (
              <span key={k} className={styles.flame} style={{ animationDelay: `${k * 90}ms` }} />
            ))}
          </span>
        )}
      </div>
      <div
        ref={potRef}
        className={styles.pot}
        style={{ left: POT.x, top: POT.y, width: POT.w, height: POT.h }}
        role="button"
        aria-label="pot"
        data-testid="pot"
        data-cooking={cooking ? '' : undefined}
        data-count={state.added.length}
        onPointerDown={onPotDown}
      >
        <span className={styles.handleL} />
        <span className={styles.handleR} />
        <span className={styles.potBody} />
        <span className={styles.potRim} />
        <span
          className={styles.water}
          style={
            {
              '--broth': dish ? `var(--${dish.broth})` : 'var(--world-water-light)',
              '--cooked': `${potColor}%`,
            } as CSSProperties
          }
          data-slosh={splash ? '' : undefined}
          key={`w${splash}`}
        />
        {phase === 'stir' && (
          <span className={styles.bubbles}>
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <span key={k} className={styles.bubble} style={{ left: `${14 + k * 11}%`, animationDelay: `${(k * 170) % 700}ms` }} />
            ))}
          </span>
        )}
        {splash > 0 && (
          <span key={`s${splash}`} className={styles.splash}>
            <span className={styles.ripple} />
            {[0, 1, 2, 3, 4].map((k) => (
              <span key={k} className={styles.drop} data-k={k} />
            ))}
          </span>
        )}
      </div>
      {/* Nguyên liệu nổi trong nồi (vẽ ngoài nồi để không bị cắt), quay theo vòng khuấy */}
      {turn &&
        state.added
          .filter((it) => it !== flying)
          .map((it) => {
            const i = state.added.indexOf(it);
            const p = floatSpot(i, turn.need.length, swirl);
            const size = 74;
            return (
              <img
                key={`in-${state.index}-${it}`}
                className={styles.inPot}
                data-testid={`inpot-${it}`}
                src={card(INGREDIENTS[it].card)}
                alt=""
                draggable={false}
                style={{ left: p.x - size / 2, top: p.y - size * 0.62, width: size, height: size, opacity: phase === 'bowl' || phase === 'served' ? 0 : 1 }}
              />
            );
          })}
      {cooking && phase !== 'served' && (
        <div className={styles.steam} style={{ left: POT_SURFACE.cx - 120, top: POT.y - 150 }} aria-hidden="true">
          {[0, 1, 2].map((k) => (
            <span key={k} style={{ left: `${18 + k * 30}%`, animationDelay: `${k * 500}ms` }} />
          ))}
        </div>
      )}

      {/* Nút bật bếp */}
      {turn && !party && (
        <div key={`sw${stoveWiggle}`} className={styles.stoveWrap} data-wiggle={stoveWiggle ? '' : undefined} style={{ left: STOVE.x, top: STOVE.y }}>
          <ClayButton
            color={phase === 'ready' ? 'peach' : 'butter'}
            size={STOVE_SIZE}
            label="stove"
            onPress={pressStove}
            className={phase === 'ready' ? styles.stoveReady : styles.stove}
          >
            <span className={styles.stoveIcon} data-on={cooking ? '' : undefined}>
              🔥
            </span>
          </ClayButton>
        </div>
      )}

      {/* Vá khuấy */}
      {phase === 'stir' && !party && (
        <div
          className={styles.ladle}
          style={{ left: ladlePos.x, top: ladlePos.y, width: LADLE, height: LADLE }}
          role="button"
          aria-label="ladle"
          data-testid="ladle"
          data-state={drag?.kind === 'ladle' ? 'drag' : 'rest'}
          data-pressed={drag?.kind === 'ladle' ? '' : undefined}
          onPointerDown={onLadleDown}
          onPointerMove={onLadleMove}
          onPointerUp={onLadleUp}
          onPointerCancel={onLadleUp}
        >
          <div key={`ln${ladleNudge}`} className={styles.ladleMove} data-nudge={ladleNudge ? '' : undefined}>
            <img src={LADLE_IMG} alt="" draggable={false} />
          </div>
        </div>
      )}

      {/* Bát món đã nấu */}
      {turn && dish && (phase === 'bowl' || phase === 'served') && !party && (
        <div
          key={`bowl-${state.index}-${scoop}`}
          className={styles.served}
          style={bowlStyle}
          role="button"
          aria-label="bowl"
          data-testid="bowl"
          data-state={drag?.kind === 'bowl' ? 'drag' : phase === 'served' ? 'served' : 'ready'}
          data-pressed={drag?.kind === 'bowl' ? '' : undefined}
          onPointerDown={onBowlDown}
          onPointerMove={onBowlMove}
          onPointerUp={onBowlUp}
          onPointerCancel={() => setDrag(null)}
        >
          <div className={styles.servedMove}>
            <DishView dish={dish} items={turn.need} eaten={phase === 'served' && happy} />
          </div>
        </div>
      )}

      {/* Nguyên liệu trên quầy */}
      {turn &&
        !party &&
        counter.map((it) => {
          const s = slotOf(it);
          const dragging = drag?.kind === 'item' && drag.item === it;
          const fly = flying === it;
          let style: CSSProperties = { left: s.x, top: s.y, width: s.w, height: s.h };
          if (dragging) {
            style = { ...style, left: drag.x - drag.dx, top: drag.y - drag.dy };
          } else if (fly) {
            const small = 74;
            style = { left: POT_SURFACE.cx - small / 2, top: POT_SURFACE.cy - small * 0.62, width: small, height: small };
          }
          const h = hop?.item === it ? hop.n : 0;
          const back = returning?.item === it ? returning.n : 0;
          const st = dragging ? 'drag' : fly ? 'fly' : back ? 'return' : 'counter';
          return (
            <div
              key={`${state.index}-${it}`}
              className={styles.item}
              style={style}
              role="button"
              aria-label={`item-${it}`}
              data-testid={`item-${it}`}
              data-item={it}
              data-state={st}
              data-hint={hint && lacking.includes(it) && !dragging ? '' : undefined}
              data-pressed={dragging ? '' : undefined}
              onPointerDown={(e) => onItemDown(it, e)}
              onPointerMove={onItemMove}
              onPointerUp={onItemUp}
              onPointerCancel={() => addItem(null)}
            >
              <div key={`h${h}-${back}`} className={styles.itemMove} data-hop={h && !back ? '' : undefined} data-shake={back ? '' : undefined}>
                <img src={card(INGREDIENTS[it].card)} alt="" draggable={false} className={styles.itemImg} />
              </div>
            </div>
          );
        })}

      {/* Ăn mừng cuối lượt */}
      {party && (
        <div className={styles.party} data-testid="party">
          <img src={buddy.img} alt={buddy.name} className={styles.partyBuddy} draggable={false} />
          {[...Array(10)].map((_, k) => (
            <span key={k} className={styles.partyHeart} style={{ left: `${8 + k * 9}%`, animationDelay: `${(k % 5) * 180}ms` }} aria-hidden="true">
              {['🍲', '❤️', '⭐', '🍜', '❤️'][k % 5]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
