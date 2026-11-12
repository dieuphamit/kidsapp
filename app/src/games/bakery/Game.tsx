import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { clientToStage, stageRect } from '../../ui/Stage';
import {
  addTopping, removeTopping, onCake, praiseKey, countKey, nextCustomer, toppingImage,
  TOPPING_IDS, type Topping, type ToppingId,
} from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

/** Kệ trái: 2 cột × 3 hàng, ô 130px, khe 24px (toạ độ trong khung Stage). */
const SLOT = 130;
const SHELF_X = 44;
const SHELF_Y = 176;
const GAP = 24;
const slotCenter = (i: number) => ({
  x: SHELF_X + (i % 2) * (SLOT + GAP) + SLOT / 2,
  y: SHELF_Y + Math.floor(i / 2) * (SLOT + GAP) + SLOT / 2,
});

/** Kéo quá ngưỡng này (px) mới tính là kéo; ít hơn là chạm. */
const MOVE_PX = 16;
const RETURN_MS = 400;
const COUNT_DELAY = 700;
const ASK_DELAY = 1500;
const NEXT_DELAY = 3000;
const ORDER_DELAY = 1500;
const FIRST_CUSTOMER_DELAY = 2000;

type Drag = { id: ToppingId; slot: number; x: number; y: number; sx: number; sy: number; moved: boolean; returning: boolean };

declare global {
  interface Window {
    __behocBakery?: {
      toppings(): { id: string; x: number; y: number }[];
      add(id: string): void;
      serve(): void;
    };
  }
}

/** Chỗ đặt sẵn cho hook e2e `add` (toạ độ trong khung bánh 400×330, trên mặt hai tầng). */
function hookSpot(i: number): { x: number; y: number } {
  return { x: 90 + (i % 5) * 55, y: 90 + (Math.floor(i / 5) % 3) * 80 };
}

export default function Game({ speaker, onExit }: GameProps) {
  const [toppings, setToppings] = useState<Topping[]>([]);
  const [customer, setCustomer] = useState<string>(() => nextCustomer(null));
  const [visit, setVisit] = useState(0);
  const [eating, setEating] = useState(false);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [lastSay, setLastSay] = useState('bakery.hello');
  const [bellRing, setBellRing] = useState(0);
  const [wiggle, setWiggle] = useState<{ slot: number; k: number } | null>(null);

  const cakeRef = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  const countTimer = useRef<number | null>(null);
  // Bản sao đồng bộ của state, luôn gán cùng lúc với setState (để hook e2e và hàm hẹn giờ đọc giá trị mới nhất).
  const toppingsRef = useRef<Topping[]>([]);
  const eatingRef = useRef(false);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  const later = useCallback((fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);

  useEffect(() => {
    const list = timers.current;
    return () => {
      list.forEach((t) => window.clearTimeout(t));
      if (countTimer.current !== null) window.clearTimeout(countTimer.current);
    };
  }, []);

  // Vào tiệm: chào, rồi khách đầu tiên gọi bánh (say/later ổn định nên chỉ chạy khi vào game).
  const firstCustomer = useRef(customer);
  useEffect(() => {
    speaker.say('bakery.hello'); // data-last-say khởi tạo sẵn là 'bakery.hello'
    later(() => {
      say(`animal.${firstCustomer.current}`);
      later(() => say('bakery.order'), ORDER_DELAY);
    }, FIRST_CUSTOMER_DELAY);
  }, [speaker, say, later]);

  /** Đặt topping lên bánh tại (x, y) trong khung bánh, nói tên, đếm nếu trùng loại. */
  const place = useCallback(
    (id: ToppingId, x: number, y: number) => {
      const next = addTopping(toppingsRef.current, id, Math.round(x), Math.round(y));
      toppingsRef.current = next;
      setToppings(next);
      say(`topping.${id}`);
      if (countTimer.current !== null) window.clearTimeout(countTimer.current);
      countTimer.current = null;
      const key = countKey(next, id);
      if (key) countTimer.current = later(() => say(key), COUNT_DELAY);
    },
    [say, later],
  );

  const serve = useCallback(() => {
    setBellRing((k) => k + 1);
    if (eatingRef.current) return;
    const list = toppingsRef.current;
    if (list.length === 0) {
      say('bakery.order');
      return;
    }
    if (countTimer.current !== null) window.clearTimeout(countTimer.current);
    countTimer.current = null;
    eatingRef.current = true;
    setEating(true);
    say(praiseKey(list));
    later(() => {
      say('bakery.ask');
      later(() => {
        const id = nextCustomer(customer);
        toppingsRef.current = [];
        setToppings([]);
        eatingRef.current = false;
        setEating(false);
        setCustomer(id);
        setVisit((v) => v + 1);
        say(`animal.${id}`);
        later(() => say('bakery.order'), ORDER_DELAY);
      }, NEXT_DELAY);
    }, ASK_DELAY);
  }, [customer, say, later]);

  // Hook cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocBakery = {
      toppings: () => toppingsRef.current.map(({ id, x, y }) => ({ id, x, y })),
      add: (id) => {
        if (!(TOPPING_IDS as readonly string[]).includes(id)) return;
        const p = hookSpot(toppingsRef.current.length);
        place(id as ToppingId, p.x, p.y);
      },
      serve,
    };
    return () => {
      delete window.__behocBakery;
    };
  }, [place, serve]);

  // ---- Kéo thả ----
  const onShelfDown = (e: React.PointerEvent, id: ToppingId, slot: number) => {
    if (drag) return;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ id, slot, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false, returning: false });
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drag || drag.returning) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > MOVE_PX;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
  };

  const onUp = (e: React.PointerEvent) => {
    if (!drag || drag.returning) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > MOVE_PX;
    if (!moved) {
      // Chạm (không kéo): nói tên topping, lắc nhẹ trên kệ.
      say(`topping.${drag.id}`);
      setWiggle({ slot: drag.slot, k: Date.now() });
      setDrag(null);
      return;
    }
    const cake = cakeRef.current;
    if (cake && !eatingRef.current) {
      const r = stageRect(cake);
      if (onCake(p, r)) {
        place(drag.id, p.x - r.left, p.y - r.top);
        setDrag(null);
        return;
      }
    }
    // Thả ngoài bánh: trôi về kệ, không nói.
    const home = slotCenter(drag.slot);
    setDrag({ ...drag, x: home.x, y: home.y, returning: true });
    later(() => setDrag(null), RETURN_MS);
  };

  const removeAt = (n: number) => {
    if (eatingRef.current) return;
    const next = removeTopping(toppingsRef.current, n);
    toppingsRef.current = next;
    setToppings(next);
  };

  return (
    <div
      className={styles.scene}
      data-testid="game-bakery"
      data-last-say={lastSay}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <Scenery variant="room" />

      {/* Biển tiệm */}
      <div className={styles.awning} aria-hidden="true" />

      <BackHome onExit={onExit} />

      {/* Kệ trái: 6 topping */}
      <div className={styles.shelf} aria-hidden="true" />
      {[0, 1, 2].map((row) => (
        <span key={row} className={styles.plank} aria-hidden="true" style={{ top: SHELF_Y + row * (SLOT + GAP) + SLOT - 10 }} />
      ))}
      {TOPPING_IDS.map((id, i) => {
        const c = slotCenter(i);
        const away = drag?.slot === i;
        return (
          <div
            key={`${id}-${wiggle?.slot === i ? wiggle.k : 0}`}
            className={styles.shelfItem}
            data-testid={`shelf-${id}`}
            data-wiggle={wiggle?.slot === i ? '' : undefined}
            data-pressed={away ? '' : undefined}
            style={{ left: c.x - SLOT / 2, top: c.y - SLOT / 2, width: SLOT, height: SLOT }}
            onPointerDown={(e) => onShelfDown(e, id, i)}
            role="button"
            aria-label={id}
          >
            <img src={`${BASE}${toppingImage(id)}`} alt="" draggable={false} className={styles.shelfImg} />
          </div>
        );
      })}

      {/* Quầy */}
      <div className={styles.counter} aria-hidden="true" />

      {/* Khách */}
      <div
        key={`customer-${visit}`}
        className={styles.customer}
        data-testid="customer"
        data-animal={customer}
        data-near={eating ? '' : undefined}
      >
        <div className={styles.bubble} aria-hidden="true">{eating ? '💕' : '🎂'}</div>
        <img src={`${BASE}cards/${customer}.png`} alt="" draggable={false} className={styles.customerImg} />
      </div>

      {/* Đĩa + bánh */}
      <div className={styles.plate} aria-hidden="true" />
      <div
        key={`cake-${visit}`}
        ref={cakeRef}
        className={styles.cake}
        data-testid="cake"
        data-eaten={eating ? '' : undefined}
      >
        <div className={styles.tierBottom} aria-hidden="true" />
        <div className={styles.tierTop} aria-hidden="true" />
        {toppings.map((t) => (
          <div
            key={t.n}
            className={styles.onCake}
            data-testid="on-cake"
            data-topping={t.id}
            style={{ left: t.x - 60, top: t.y - 60 }}
            onPointerDown={() => removeAt(t.n)}
          >
            <img src={`${BASE}${toppingImage(t.id)}`} alt="" draggable={false} className={styles.onCakeImg} />
          </div>
        ))}
      </div>

      {/* Chuông */}
      <div className={styles.bell} data-ring={bellRing % 2 === 1 ? 'a' : bellRing > 0 ? 'b' : undefined}>
        <ClayButton color="leaf" size={140} label="Chuông" onPress={serve}>
          <span className={styles.bellIcon}>🛎️</span>
        </ClayButton>
      </div>

      {/* Topping đang kéo */}
      {drag && drag.moved && (
        <div
          className={styles.ghost}
          data-returning={drag.returning ? '' : undefined}
          style={{ left: drag.x - SLOT / 2, top: drag.y - SLOT / 2, width: SLOT, height: SLOT }}
        >
          <img src={`${BASE}${toppingImage(drag.id)}`} alt="" draggable={false} className={styles.shelfImg} />
        </div>
      )}
    </div>
  );
}
