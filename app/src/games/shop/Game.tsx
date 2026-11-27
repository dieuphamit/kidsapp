import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { clientToStage, stageRect } from '../../ui/Stage';
import { useBuddyLook } from '../../ui/buddyContext';
import { sayThen } from '../../core/audio';
import { useSaySteps } from '../../ui/useSayThen';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { playSetup, type Level } from '../../core/variety';
import {
  newRound,
  currentTurn,
  addItem,
  startScan,
  scanNext,
  advance,
  isDone,
  missing,
  inBasket,
  stockLeft,
  progress,
  totalWanted,
  roundItems,
  customerById,
  wantKeys,
  itemKey,
  gotKey,
  numberKey,
  ITEMS,
  HELLO_KEY,
  NOPE_KEY,
  ENOUGH_KEY,
  NOT_YET_KEY,
  PAY_KEY,
  THANKS_KEY,
  DONE_KEY,
  type AddResult,
  type CustomerId,
  type ItemId,
  type Phase,
  type State,
  type Want,
} from './logic';
import {
  SHELF,
  SHELF_BOARDS,
  ITEM_SIZE,
  shelfSlots,
  CUSTOMER,
  CUSTOMER_AREA,
  fitArea,
  partySlots,
  PARTY_BUDDY,
  PARTY_AREA,
  PARTY_BAG_W,
  PARTY_BAG_GAP,
  STAGE_W,
  BUBBLE,
  wantSize,
  DESK,
  KEEPER,
  REGISTER,
  REGISTER_BTN,
  BASKET_W,
  BASKET_H,
  BASKET_SHOP,
  BASKET_DESK,
  BASKET_ITEM,
  basketSpot,
  FLOOR_Y,
  REPLAY,
} from './layout';
import { createShopSounds } from './sounds';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const card = (id: ItemId) => `${BASE}cards/${ITEMS[id].card}.png`;

/** Bề rộng hộp hình túi hàng (CSS .guestBag, trước khi thu nhỏ còn PARTY_BAG_W). */
const GUEST_BAG_BOX = 120;
/** Kéo quá chừng này (px khung) mới tính là kéo, không thì là chạm. */
const MOVE_PX = 16;
/** Ô kệ có chồng nhiều cái (mức khó): hình thu vào chừng này để cả chồng nằm gọn trong ô. */
const PILE_INSET = 10;
/** Nới vùng thả quanh giỏ cho tay bé. */
const DROP_PAD = 48;
/** Bé ngừng chừng này thì món cần lấy nhấp nháy gợi ý (không lời, không bàn tay chỉ). */
const IDLE_MS = 6000;
/** Nhịp "bíp" ở quầy: mỗi món một tiếng và một số đếm. */
const SCAN_MS = 950;
/** Sau món cuối: kính coong + túi hiện ra, túi bay tới khách, khách mừng, cảm ơn, ra về. */
const BAG_MS = 700;
const GIVE_MS = 1300;
const HAPPY_MS = 1800;
const THANKS_MS = 3300;
const LEAVE_MS = 6000;
const NEXT_MS = 6700;

/** Nghỉ giữa hai câu của một chuỗi (tính từ lúc câu trước THẬT SỰ đọc xong). */
const SAY_GAP_MS = 250;

type Drag = { item: ItemId; startX: number; startY: number; dx: number; dy: number; x: number; y: number };
type CustomerAnim = 'in' | 'out';

export interface ShopSnapshot {
  index: number;
  count: number;
  phase: Phase;
  customer: CustomerId;
  need: Want[];
  shelf: ItemId[];
  basket: ItemId[];
  scanned: number;
}

declare global {
  interface Window {
    __behocShop?: {
      snapshot(): ShopSnapshot | null;
      add(item: ItemId): AddResult;
      pay(): boolean;
    };
  }
}

function makeRound(level: Level): State {
  const s = newRound(level, Math.random, {
    customers: recentPicks<CustomerId>('shop'),
    items: recentPicks<ItemId>('shop-item'),
  });
  rememberPicks('shop', s.turns.map((t) => t.customer), 1);
  rememberPicks('shop-item', roundItems(s), 1);
  return s;
}

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const sounds = useMemo(() => createShopSounds(), []);
  const [{ level }] = useState(() => playSetup(ageMonths, options));
  const [state, setState] = useState<State>(() => makeRound(level));
  const [party, setParty] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  /** Món vừa được thả ra ngoài giỏ hoặc khách không cần: đang lướt về kệ. */
  const [returning, setReturning] = useState<{ item: ItemId; n: number } | null>(null);
  const [hop, setHop] = useState<{ item: ItemId; n: number } | null>(null);
  /** Món còn thiếu nhấp nháy (bé ngừng lâu, thả món lạ, bấm máy khi chưa đủ). */
  const [hint, setHint] = useState(false);
  const [lastSay, setLastSay] = useState('');
  const [customerAnim, setCustomerAnim] = useState<CustomerAnim>('in');
  const [customerBounce, setCustomerBounce] = useState(0);
  const [customerPressed, setCustomerPressed] = useState(false);
  const [happy, setHappy] = useState(false);
  /** Tim nhỏ bay lên mỗi lần bé lấy đúng một món. */
  const [cheer, setCheer] = useState(0);
  const [wishBounce, setWishBounce] = useState(0);
  const [keeperBounce, setKeeperBounce] = useState(0);
  const [registerBounce, setRegisterBounce] = useState(0);
  const [basketBounce, setBasketBounce] = useState(0);
  const [guestBounce, setGuestBounce] = useState<{ i: number; n: number } | null>(null);
  /** Túi hàng: hiện ở quầy rồi bay tới khách. */
  const [bag, setBag] = useState<'desk' | 'given' | null>(null);

  const basketRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  /** Chuỗi (danh sách, "bấm máy nào") đọc xong: đếm lại giờ nhắc. */
  const [chainEnd, setChainEnd] = useState(0);
  /**
   * Quét và trả tiền nói NỐI TIẾP: số sau chỉ đếm khi số trước đọc xong; tiếng khách kêu chờ số cuối,
   * "cảm ơn" chờ tiếng kêu, khách kế chờ "cảm ơn" (trước đây số đếm cách nhau 950ms mà mỗi số ~2s,
   * tiếng kêu hẹn 1800ms, "cảm ơn" 3300ms, khách kế 6700ms nên câu trước bị cắt).
   * Bé chạm làm câu khác chen vào thì kịch bản vẫn đi tiếp (không kẹt ở quầy).
   */
  const checkout = useSaySteps(speaker, setLastSay);
  /** Chuỗi câu đang đọc dở (hàm huỷ của sayThen): câu mới làm chuỗi này dừng lại. */
  const chain = useRef<(() => void) | null>(null);
  const stopChain = useCallback(() => {
    chain.current?.();
    chain.current = null;
  }, []);
  useEffect(() => stopChain, [stopChain]);
  const say = useCallback(
    (key: string) => {
      stopChain();
      speaker.say(key);
      setLastSay(key);
    },
    [speaker, stopChain],
  );
  /**
   * Đọc nối tiếp nhiều câu: câu sau chỉ bắt đầu khi câu trước đọc xong (không đoán độ dài file
   * bằng số cố định); bé làm gì khác (có câu mới) thì thôi phần còn lại.
   */
  const sayAll = useCallback(
    (keys: readonly string[]) => {
      stopChain();
      const cancel = sayThen(speaker, keys, {
        gapMs: SAY_GAP_MS,
        onSay: (k) => setLastSay(k),
        onDone: () => {
          if (chain.current === cancel) chain.current = null;
          setChainEnd((n) => n + 1);
        },
      });
      chain.current = cancel;
    },
    [speaker, stopChain],
  );

  const live = useRef(state);
  live.current = state;

  const turn = currentTurn(state);
  const customer = turn ? customerById(turn.customer) : null;
  const phase = state.phase;
  const slots = shelfSlots(turn?.shelf.length ?? 0);
  const lacking = missing(state);
  const mood = phase === 'paid' ? 3 : state.basket.length === 0 ? 0 : progress(state) < 1 ? 1 : 2;

  // Vào trò: chào, rồi đọc danh sách của khách đầu tiên
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const t = currentTurn(live.current);
    sayAll(t ? [HELLO_KEY, ...wantKeys(t)] : [HELLO_KEY]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bé ngừng một lúc: món còn thiếu nhấp nháy (gợi ý không lời); ở quầy thì nhắc bấm máy
  useEffect(() => {
    if (party || drag || (phase !== 'shop' && phase !== 'checkout')) return;
    const t = setTimeout(() => {
      if (phase === 'shop') setHint(true);
      else {
        setRegisterBounce(Date.now());
        // "bấm máy nào" (~5s) trong chuỗi khen còn đang đọc thì không nhắc chen vào; đọc xong đếm lại giờ
        if (!chain.current) say(PAY_KEY);
      }
    }, IDLE_MS);
    return () => clearTimeout(t);
  }, [phase, drag, party, state.basket.length, state.index, chainEnd, say]);

  const startTurn = (s: State) => {
    live.current = s;
    setHint(false);
    setHappy(false);
    setBag(null);
    setReturning(null);
    setState(s);
    setCustomerAnim('in');
    sayAll(wantKeys(currentTurn(s)!));
  };

  const nextCustomer = (s: State) => {
    const next = advance(s);
    if (isDone(next)) {
      live.current = next;
      setState(next);
      setBag(null);
      setParty(true);
      sounds.happy();
      say(DONE_KEY);
      return;
    }
    startTurn(next);
  };

  const replay = () => {
    sounds.pop();
    setParty(false);
    startTurn(makeRound(level));
  };

  /** Thả `item` vào giỏ (null = thả ra ngoài, món lướt về kệ). */
  const drop = (item: ItemId | null, moved: ItemId | null = item): AddResult => {
    setDrag(null);
    const goHome = () => {
      if (!moved) return;
      setReturning({ item: moved, n: Date.now() });
      later(() => setReturning((r) => (r?.item === moved ? null : r)), 700);
    };
    if (item === null || party) {
      goHome();
      return 'ignored';
    }
    const s0 = live.current;
    const { state: s, result } = addItem(s0, item);
    if (result === 'ignored') return result;
    if (result === 'stranger' || result === 'enough') {
      // Không âm báo sai: món lướt về kệ, lời khích lệ, món còn thiếu nhấp nháy
      goHome();
      setHint(true);
      say(result === 'stranger' ? NOPE_KEY : ENOUGH_KEY);
      return result;
    }
    live.current = s;
    setState(s);
    setHint(false);
    sounds.pop();
    setBasketBounce(Date.now());
    setCheer(Date.now());
    setCustomerBounce(Date.now());
    if (result === 'complete') {
      later(() => sounds.slide(), 300);
      sayAll([gotKey(item), PAY_KEY]);
    } else {
      say(gotKey(item));
    }
    return result;
  };

  /** Trả xong (vừa quét món cuối): túi ra quầy rồi tới khách; kêu, cảm ơn, ra về — nối tiếp. */
  const finishPay = () => {
    later(() => {
      sounds.ding();
      setBag('desk');
    }, BAG_MS);
    later(() => setBag('given'), GIVE_MS);
  };

  const afterScan = (s: State) => {
    const t = currentTurn(s);
    if (!t) return;
    const c = customerById(t.customer);
    // số cuối đọc xong (loa giả: SCAN_MS) rồi chờ thêm cho đủ HAPPY_MS kể từ lúc trả xong
    later(() => {
      checkout.play(
        [
          {
            keys: [c.sound],
            fallbackMs: THANKS_MS - HAPPY_MS,
            onStart: () => {
              setHappy(true);
              setCustomerBounce(Date.now());
              sounds.happy();
            },
          },
          { keys: [THANKS_KEY], fallbackMs: LEAVE_MS - THANKS_MS + (NEXT_MS - LEAVE_MS) },
        ],
        () => {
          setCustomerAnim('out');
          later(() => nextCustomer(s), NEXT_MS - LEAVE_MS);
        },
      );
    }, HAPPY_MS - SCAN_MS);
  };

  /** Quét một món: bíp, máy nảy; món cuối thì trả xong. */
  const scanStep = () => {
    const s0 = live.current;
    const { state: s, done } = scanNext(s0);
    if (s === s0) return;
    live.current = s;
    setState(s);
    setRegisterBounce(Date.now());
    sounds.beep();
    if (done) finishPay();
  };

  /** Bấm máy tính tiền: từng món "bíp" lần lượt và được đếm. */
  const pressRegister = (): boolean => {
    const s0 = live.current;
    const { state: s, ok } = startScan(s0);
    setRegisterBounce(Date.now());
    if (!ok) {
      if (s0.phase === 'shop') {
        setHint(true);
        say(NOT_YET_KEY);
      } else {
        sounds.boing();
      }
      return false;
    }
    live.current = s;
    setState(s);
    stopChain();
    // mỗi món: bíp + đếm; số sau chờ số trước đọc xong
    later(() => {
      checkout.play(
        s.basket.map((_, i) => ({ keys: [numberKey(i + 1)], fallbackMs: SCAN_MS, onStart: scanStep })),
        () => afterScan(live.current),
      );
    }, 120);
    return true;
  };

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocShop = {
      snapshot: () => {
        const s = live.current;
        const t = currentTurn(s);
        if (!t) return null;
        return {
          index: s.index,
          count: s.turns.length,
          phase: s.phase,
          customer: t.customer,
          need: t.need.map((w) => ({ ...w })),
          shelf: [...t.shelf],
          basket: [...s.basket],
          scanned: s.scanned,
        };
      },
      add: (it) => drop(it),
      pay: () => pressRegister(),
    };
    return () => {
      delete window.__behocShop;
    };
  });

  /* ---------- Kéo món hàng ---------- */
  const overBasket = (x: number, y: number) => {
    const el = basketRef.current;
    if (!el) return false;
    const r = stageRect(el);
    return x >= r.left - DROP_PAD && x <= r.right + DROP_PAD && y >= r.top - DROP_PAD - 30 && y <= r.bottom + DROP_PAD;
  };

  const onItemDown = (item: ItemId, slot: { x: number; y: number }, e: PointerEvent<HTMLDivElement>) => {
    setHop({ item, n: Date.now() });
    sounds.pick();
    if (phase !== 'shop' || drag || party) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    setReturning(null);
    setDrag({ item, startX: p.x, startY: p.y, dx: p.x - slot.x, dy: p.y - slot.y, x: p.x, y: p.y });
  };

  const onItemMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
  };

  const onItemUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    if (Math.hypot(p.x - drag.startX, p.y - drag.startY) <= MOVE_PX) {
      // Chạm món hàng: đọc tên
      setDrag(null);
      say(itemKey(drag.item));
      return;
    }
    const cx = p.x - drag.dx + ITEM_SIZE / 2;
    const cy = p.y - drag.dy + ITEM_SIZE / 2;
    drop(overBasket(cx, cy) ? drag.item : null, drag.item);
  };

  /* ---------- Chạm khác ---------- */
  const onCustomerDown = () => {
    if (!customer) return;
    setCustomerPressed(true);
    setCustomerBounce(Date.now());
    say(customer.sound);
  };

  const repeatWish = () => {
    const t = currentTurn(live.current);
    if (!t) return;
    const p = live.current.phase;
    if (p === 'shop') sayAll(wantKeys(t));
    else if (p === 'checkout') say(PAY_KEY);
    else if (p === 'paid') say(THANKS_KEY);
    else sounds.boing();
  };

  const onWishDown = () => {
    setWishBounce(Date.now());
    repeatWish();
  };

  /** Chạm chủ tiệm: nhắc lại việc cần làm lúc này. */
  const onKeeperDown = () => {
    setKeeperBounce(Date.now());
    if (party) sounds.boing();
    else repeatWish();
  };

  const onGuestDown = (i: number, sound: string) => {
    setGuestBounce({ i, n: Date.now() });
    say(sound);
  };

  const onPartyItemDown = (item: ItemId) => {
    setHop({ item, n: Date.now() });
    sounds.pick();
    say(itemKey(item));
  };

  const onBasketDown = () => {
    setBasketBounce(Date.now());
    sounds.boing();
  };

  // Khách nghiêng người nhìn theo món bé đang kéo
  const lean = drag ? Math.max(-8, Math.min(8, (drag.x - (CUSTOMER.x + CUSTOMER.w / 2)) / 90)) : 0;

  const atDesk = phase !== 'shop';
  const basketPos = atDesk ? BASKET_DESK : BASKET_SHOP;
  const total = turn ? totalWanted(turn) : 0;
  const size = wantSize(total);
  const firstMissing = lacking[0]?.item;
  const customerFit = customer ? fitArea(customer.w, customer.h, CUSTOMER_AREA, CUSTOMER.w, CUSTOMER.h) : { w: 0, h: 0 };

  // Ăn mừng: các khách đã phục vụ đứng thành hàng, kệ bày lại vài món vừa bán
  const guests = party ? state.turns.map((t) => customerById(t.customer)) : [];
  const guestSlots = partySlots(guests.length);
  const sold = party ? [...new Set(roundItems(state))] : [];
  const partyItems = sold.slice(0, Math.max(4, Math.min(8, sold.length - (sold.length % 2))));
  const partyItemSlots = shelfSlots(partyItems.length);

  let bagStyle: CSSProperties = { left: BASKET_DESK.x + 60, top: BASKET_DESK.y + 10 };
  if (bag === 'given') bagStyle = { left: CUSTOMER.x - 30, top: CUSTOMER.y + CUSTOMER.h - 150 };

  return (
    <div
      className={styles.scene}
      data-testid="game-shop"
      data-last-say={lastSay}
      data-phase={party ? 'party' : phase}
      data-turn={state.index}
      data-level={level}
    >
      {/* Tiệm: tường, mái hiên sọc, sàn, thảm chỗ khách đứng */}
      <div className={styles.wall} style={{ height: FLOOR_Y }} aria-hidden="true" />
      <div className={styles.awning} aria-hidden="true" />
      <div className={styles.floor} style={{ top: FLOOR_Y }} aria-hidden="true" />
      <div className={styles.rug} style={{ left: CUSTOMER.x - 70, top: CUSTOMER.y + CUSTOMER.h - 46, width: CUSTOMER.w + 80 }} aria-hidden="true" />
      <BackHome onExit={onExit} />

      {/* Kệ hàng */}
      <div className={styles.shelf} style={{ left: SHELF.x, top: SHELF.y, width: SHELF.w, height: SHELF.h }} aria-hidden="true">
        {SHELF_BOARDS.map((y) => (
          <span key={y} className={styles.board} style={{ top: y - SHELF.y }} />
        ))}
      </div>

      {/* Chủ tiệm (bạn đồng hành) sau quầy (lúc ăn mừng thì ẩn bằng CSS, bạn ấy ra giữa tiệm) */}
      <div
        className={styles.keeper}
        style={{ left: KEEPER.x, top: KEEPER.y, width: KEEPER.w, height: KEEPER.h }}
        role="button"
        aria-label="keeper"
        data-testid="keeper"
        onPointerDown={onKeeperDown}
      >
        <div key={`kb${keeperBounce}`} className={styles.keeperMove} data-bounce={keeperBounce ? '' : undefined}>
          <img src={buddy.img} alt={buddy.name} className={styles.keeperImg} draggable={false} />
        </div>
      </div>

      {/* Khách thú */}
      {turn && customer && !party && (
        <div
          key={`customer-${state.index}-${turn.customer}`}
          className={styles.customer}
          style={{ left: CUSTOMER.x, top: CUSTOMER.y, width: CUSTOMER.w, height: CUSTOMER.h }}
          role="button"
          aria-label={`customer-${turn.customer}`}
          data-testid="customer"
          data-customer={turn.customer}
          data-anim={customerAnim}
          data-mood={mood}
          data-pressed={customerPressed ? '' : undefined}
          onPointerDown={onCustomerDown}
          onPointerUp={() => setCustomerPressed(false)}
          onPointerLeave={() => setCustomerPressed(false)}
          onPointerCancel={() => setCustomerPressed(false)}
        >
          <div className={styles.customerLean} style={{ rotate: `${lean}deg` }}>
            <div key={`b${customerBounce}`} className={styles.customerBounce} data-bounce={customerBounce ? '' : undefined}>
              <div className={styles.customerFace} data-flip={customer.flip ? '' : undefined}>
                <img
                  src={`${BASE}${customer.img}`}
                  alt=""
                  draggable={false}
                  className={styles.customerImg}
                  style={{ width: customerFit.w, height: customerFit.h, left: (CUSTOMER.w - customerFit.w) / 2 }}
                />
              </div>
            </div>
          </div>
          {cheer > 0 && !happy && (
            <span key={`c${cheer}`} className={styles.cheer} aria-hidden="true">
              💛
            </span>
          )}
          {happy && (
            <div className={styles.hearts} data-testid="happy" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((k) => (
                <span key={k} style={{ left: `${6 + k * 19}%`, animationDelay: `${k * 140}ms` }}>
                  {k % 2 ? '💛' : '❤️'}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bong bóng suy nghĩ: danh sách món bằng hình, đúng số lượng */}
      {turn && !party && phase !== 'paid' && (
        <div
          key={`wish-${state.index}`}
          className={styles.wish}
          style={{ left: BUBBLE.x, top: BUBBLE.y, width: BUBBLE.w, height: BUBBLE.h }}
          role="button"
          aria-label="wish"
          data-testid="wish"
          onPointerDown={onWishDown}
        >
          <div key={`wb${wishBounce}`} className={styles.wishMove} data-bounce={wishBounce ? '' : undefined}>
            {turn.need.flatMap((w) =>
              Array.from({ length: w.qty }, (_, q) => {
                const done = q < inBasket(state, w.item);
                return (
                  <span
                    key={`${w.item}-${q}`}
                    className={styles.want}
                    style={{ width: size, height: size }}
                    data-testid={`want-${w.item}-${q}`}
                    data-item={w.item}
                    data-done={done ? '' : undefined}
                    data-hint={hint && !done ? '' : undefined}
                  >
                    <img src={card(w.item)} alt="" draggable={false} />
                    {done && <span className={styles.check}>✓</span>}
                  </span>
                );
              }),
            )}
          </div>
          <span className={styles.wishTail} aria-hidden="true" />
        </div>
      )}

      {/* Quầy tính tiền */}
      <div className={styles.desk} style={{ left: DESK.x, top: DESK.y, width: DESK.w, height: DESK.h }} aria-hidden="true" />
      <div className={styles.register} style={{ left: REGISTER.x, top: REGISTER.y, width: REGISTER.w, height: REGISTER.h }} aria-hidden="true">
        <span className={styles.screen} data-testid="screen" data-on={phase === 'scan' || phase === 'paid' ? '' : undefined}>
          {phase === 'scan' || phase === 'paid' ? (
            <b key={state.scanned}>{state.scanned || ''}</b>
          ) : (
            <i />
          )}
        </span>
      </div>
      <div key={`rb${registerBounce}`} className={styles.registerBtn} data-bounce={registerBounce ? '' : undefined} style={{ left: REGISTER_BTN.x, top: REGISTER_BTN.y }}>
        <ClayButton
          color={phase === 'checkout' ? 'peach' : 'butter'}
          size={REGISTER_BTN.size}
          label="register"
          onPress={pressRegister}
          className={phase === 'checkout' ? styles.registerReady : styles.registerIdle}
        >
          <span className={styles.registerIcon}>🔔</span>
        </ClayButton>
      </div>

      {/* Giỏ hàng */}
      <div
        ref={basketRef}
        className={styles.basket}
        style={{ left: basketPos.x, top: basketPos.y, width: BASKET_W, height: BASKET_H }}
        role="button"
        aria-label="basket"
        data-testid="basket"
        data-place={atDesk ? 'desk' : 'shop'}
        data-count={state.basket.length}
        data-over={drag && overBasket(drag.x - drag.dx + ITEM_SIZE / 2, drag.y - drag.dy + ITEM_SIZE / 2) ? '' : undefined}
        onPointerDown={onBasketDown}
      >
        <div key={`bb${basketBounce}`} className={styles.basketMove} data-bounce={basketBounce ? '' : undefined}>
          <span className={styles.basketHandle} />
          <span className={styles.basketBack} />
          {!bag &&
            state.basket.map((it, i) => {
              const p = basketSpot(i);
              const scanned = (phase === 'scan' || phase === 'paid') && i < state.scanned;
              return (
                <img
                  key={`${state.index}-${i}`}
                  className={styles.inBasket}
                  data-testid={`inbasket-${i}`}
                  data-item={it}
                  data-scanned={scanned ? '' : undefined}
                  src={card(it)}
                  alt=""
                  draggable={false}
                  style={{ left: p.x, top: p.y, width: BASKET_ITEM, height: BASKET_ITEM, zIndex: i < 3 ? 2 : 1 }}
                />
              );
            })}
          <span className={styles.basketFront} />
        </div>
      </div>

      {/* Túi hàng: gói xong ở quầy rồi bay tới khách, theo khách ra về */}
      {bag && !party && (
        <div className={styles.bag} style={bagStyle} data-testid="bag" data-state={bag} data-anim={customerAnim} aria-hidden="true">
          <span className={styles.bagHandle} />
          <span className={styles.bagBody}>❤️</span>
        </div>
      )}

      {/* Món hàng trên kệ */}
      {turn &&
        !party &&
        turn.shelf.map((it, i) => {
          const s = slots[i];
          const left = stockLeft(state, it);
          const dragging = drag?.item === it;
          if (left <= 0) return null;
          const back = returning?.item === it ? returning.n : 0;
          const h = hop?.item === it ? hop.n : 0;
          let style: CSSProperties = { left: s.x, top: s.y, width: s.w, height: s.h };
          if (dragging) style = { ...style, left: drag.x - drag.dx, top: drag.y - drag.dy };
          const st = dragging ? 'drag' : back ? 'return' : 'shelf';
          return (
            <div key={`${state.index}-${it}`}>
              {/* các cái còn lại trong ô (mức khó mỗi ô 3 cái) */}
              {Array.from({ length: left - 1 }, (_, k) => (
                <img
                  key={`spare-${k}`}
                  className={styles.spare}
                  src={card(it)}
                  alt=""
                  draggable={false}
                  style={{ left: s.x + PILE_INSET + (k ? 9 : -9), top: s.y + PILE_INSET - (k ? 4 : 8), width: s.w - 2 * PILE_INSET, height: s.h - 2 * PILE_INSET }}
                />
              ))}
              <div
                key={`top-${left}`}
                className={styles.item}
                style={style}
                role="button"
                aria-label={`item-${it}`}
                data-testid={`item-${it}`}
                data-item={it}
                data-state={st}
                data-stock={left}
                data-pile={state.stock > 1 ? '' : undefined}
                data-hint={hint && firstMissing === it && !dragging ? '' : undefined}
                data-pressed={dragging ? '' : undefined}
                onPointerDown={(e) => onItemDown(it, s, e)}
                onPointerMove={onItemMove}
                onPointerUp={onItemUp}
                onPointerCancel={() => drop(null, it)}
              >
                <div key={`h${h}`} className={styles.itemMove} data-hop={h ? '' : undefined}>
                  <img src={card(it)} alt="" draggable={false} className={styles.itemImg} />
                </div>
              </div>
            </div>
          );
        })}

      {/* Ăn mừng cuối lượt: khách đã phục vụ đứng thành hàng cầm túi, bạn đồng hành ở giữa, có nút chơi lại */}
      {party && (
        <div className={styles.party} data-testid="party">
          {partyItems.map((it, i) => {
            const s = partyItemSlots[i];
            const h = hop?.item === it ? hop.n : 0;
            return (
              <div
                key={it}
                className={styles.partyItem}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                role="button"
                aria-label={`sold-${it}`}
                data-testid={`sold-${it}`}
                onPointerDown={() => onPartyItemDown(it)}
              >
                <div key={`h${h}`} className={styles.itemMove} data-hop={h ? '' : undefined}>
                  <img src={card(it)} alt="" draggable={false} className={styles.itemImg} />
                </div>
              </div>
            );
          })}
          {[...Array(10)].map((_, k) => (
            <span key={k} className={styles.partyHeart} style={{ left: `${6 + k * 9.2}%`, animationDelay: `${(k * 370) % 1900}ms` }} aria-hidden="true">
              {['🎈', '❤️', '⭐', '🛍️', '💛'][k % 5]}
            </span>
          ))}
          {guests.map((g, i) => {
            const s = guestSlots[i];
            const fit = fitArea(g.w, g.h, PARTY_AREA, s.w, s.h - 10);
            const b = guestBounce?.i === i ? guestBounce.n : 0;
            // khách đứng bên trái quay mặt sang phải, bên phải quay sang trái: cùng nhìn về bạn đồng hành
            const faceLeft = s.x + s.w / 2 > STAGE_W / 2;
            // túi đặt sát bên phải ảnh (không che chân): hình túi 120px thu còn PARTY_BAG_W quanh tâm
            const bagLeft = (s.w + fit.w) / 2 + PARTY_BAG_GAP - (GUEST_BAG_BOX - PARTY_BAG_W) / 2;
            return (
              <div
                key={`${i}-${g.id}`}
                className={styles.guest}
                style={{ left: s.x, top: s.y, width: s.w, height: s.h }}
                role="button"
                aria-label={`guest-${g.id}`}
                data-testid={`guest-${i}`}
                data-customer={g.id}
                onPointerDown={() => onGuestDown(i, g.sound)}
              >
                <span className={styles.shadow} style={{ width: fit.w * 0.9, left: (s.w - fit.w * 0.9) / 2 }} aria-hidden="true" />
                <div key={`gb${b}`} className={styles.guestMove} data-bounce={b ? '' : undefined}>
                  <img
                    src={`${BASE}${g.img}`}
                    alt=""
                    draggable={false}
                    className={styles.guestImg}
                    data-flip={g.flip === faceLeft ? '' : undefined}
                    style={{ width: fit.w, height: fit.h, left: (s.w - fit.w) / 2, animationDelay: `${i * 130}ms` }}
                  />
                </div>
                <span className={styles.guestBag} style={{ left: bagLeft }} data-testid={`party-bag-${i}`} aria-hidden="true">
                  <span className={styles.bagHandle} />
                  <span className={styles.bagBody}>❤️</span>
                </span>
              </div>
            );
          })}
          <div
            className={styles.partyBuddy}
            style={{ left: PARTY_BUDDY.x, top: PARTY_BUDDY.y, width: PARTY_BUDDY.w, height: PARTY_BUDDY.h }}
            role="button"
            aria-label="party-buddy"
            data-testid="party-buddy"
            onPointerDown={onKeeperDown}
          >
            <span className={styles.shadow} style={{ width: PARTY_BUDDY.w * 0.8, left: PARTY_BUDDY.w * 0.1 }} aria-hidden="true" />
            <div key={`kb${keeperBounce}`} className={styles.guestMove} data-bounce={keeperBounce ? '' : undefined}>
              <img src={buddy.img} alt={buddy.name} className={styles.partyBuddyImg} draggable={false} />
            </div>
          </div>
          <ClayButton
            color="leaf"
            size={REPLAY.size}
            label="replay"
            onPress={replay}
            className={styles.replay}
            style={{ position: 'absolute', left: REPLAY.x, top: REPLAY.y }}
          >
            <span className={styles.replayIcon}>🔄</span>
          </ClayButton>
        </div>
      )}
    </div>
  );
}
