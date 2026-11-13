import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { synth } from '../../core/synth';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { useBuddyLook } from '../../ui/buddyContext';
import { STAGE_W, STAGE_H, clientToStage, stageRect } from '../../ui/Stage';
import styles from './Game.module.css';
import { Thing } from './Things';
import { DAUDAU_SIZE, ROOMS, nextAsk, pairKey, roomZones, zoneAt, type Pair, type Prep, type ObjId } from './logic';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

const FREE_DROPS = 3; // số lần thả tự do mỗi phòng
const WINS_PER_ROOM = 3; // số lần đúng để sang phòng kế
const HOME = { x: 1060, y: 250 }; // chỗ Đậu Đậu đứng chờ đầu mỗi phòng
const HALF = DAUDAU_SIZE / 2;

type Cat = { x: number; y: number; scale: number; hidden: boolean };

interface HideHook {
  zones(): { prep: Prep; obj: ObjId; x: number; y: number }[];
  drop(prep: string, obj: string): void;
  ask(): string | null;
}

const rand = () => Math.floor(Math.random() * 1000);
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [lastSay, setLastSay] = useState('hide.hello');
  const [roomIdx, setRoomIdx] = useState(0);
  const [ask, setAsk] = useState<Pair | null>(null);
  const [cat, setCat] = useState<Cat>({ ...HOME, scale: 1, hidden: false });
  const [dragging, setDragging] = useState(false);
  const [bounce, setBounce] = useState(0);

  // trạng thái logic dùng trong timer/handler (tránh closure cũ)
  const st = useRef({ roomIdx: 0, drops: 0, wins: 0, ask: null as Pair | null });
  const follow = useRef<number | undefined>(undefined);
  const grab = useRef<{ dx: number; dy: number; x: number; y: number } | null>(null);

  const room = ROOMS[roomIdx];
  const zones = useMemo(() => roomZones(room), [room]);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  const later = useCallback((ms: number, fn: () => void) => {
    window.clearTimeout(follow.current);
    follow.current = window.setTimeout(fn, ms);
  }, []);

  useEffect(() => {
    speaker.say('hide.hello'); // lastSay khởi tạo sẵn 'hide.hello'
    return () => window.clearTimeout(follow.current);
  }, [speaker]);

  const setAskBoth = (p: Pair | null) => {
    st.current.ask = p;
    setAsk(p);
  };

  const sayAsk = useCallback(() => {
    const a = st.current.ask;
    if (a) say(`hide.ask-${pairKey(a)}`);
  }, [say]);

  /** Thả Đậu Đậu: pair = vùng trúng (null = ngoài mọi vùng), at = tâm Đậu Đậu trong khung. */
  const handleDrop = useCallback(
    (pair: Pair | null, at: { x: number; y: number }) => {
      const s = st.current;
      const r = ROOMS[s.roomIdx];
      const zone = pair ? roomZones(r).find((z) => z.prep === pair.prep && z.obj === pair.obj) : undefined;
      if (zone) {
        setCat({ x: zone.ax, y: zone.ay, scale: zone.scale, hidden: zone.prep === 'in' || zone.prep === 'under' });
      } else {
        setCat({ x: clamp(at.x, HALF, STAGE_W - HALF), y: clamp(at.y, HALF, STAGE_H - HALF), scale: 1, hidden: false });
        synth.playDrum('tap'); // tiếng "bụp" nhẹ
      }

      if (s.wins >= WINS_PER_ROOM) {
        // đang chờ sang phòng mới: vẫn nói vị trí, không huỷ việc chuyển phòng
        if (zone) say(`hide.${pairKey(zone)}`);
        return;
      }
      window.clearTimeout(follow.current);

      if (!s.ask) {
        // chơi tự do
        if (zone) say(`hide.${pairKey(zone)}`);
        s.drops += 1;
        if (s.drops >= FREE_DROPS) {
          setAskBoth(nextAsk(r, rand(), null, ageMonths));
          later(zone ? 2000 : 900, sayAsk);
        }
        return;
      }

      if (zone && pairKey(zone) === pairKey(s.ask)) {
        say('hide.yay');
        setBounce((b) => b + 1);
        s.wins += 1;
        if (s.wins >= WINS_PER_ROOM) {
          later(2400, () => {
            const next = (s.roomIdx + 1) % ROOMS.length;
            s.roomIdx = next;
            s.drops = 0;
            s.wins = 0;
            setAskBoth(null);
            setRoomIdx(next);
            setCat({ ...HOME, scale: 1, hidden: false });
            say('hide.hello');
          });
        } else {
          setAskBoth(nextAsk(r, rand(), s.ask, ageMonths));
          later(2000, sayAsk);
        }
        return;
      }

      // thả chỗ khác: nói vị trí thật rồi nhắc lại câu nhờ, không âm sai
      if (zone) say(`hide.${pairKey(zone)}`);
      later(1200, sayAsk);
    },
    [ageMonths, later, say, sayAsk],
  );

  // hook cho e2e
  useEffect(() => {
    if (!IS_E2E) return;
    const hook: HideHook = {
      zones: () => zones.map((z) => ({ prep: z.prep, obj: z.obj, x: (z.left + z.right) / 2, y: (z.top + z.bottom) / 2 })),
      drop: (prep, obj) => {
        const z = zones.find((v) => v.prep === prep && v.obj === obj);
        if (z) handleDrop({ prep: z.prep, obj: z.obj }, { x: z.ax, y: z.ay });
      },
      ask: () => (st.current.ask ? `hide.ask-${pairKey(st.current.ask)}` : null),
    };
    (window as unknown as { __behocHide?: HideHook }).__behocHide = hook;
    return () => {
      delete (window as unknown as { __behocHide?: HideHook }).__behocHide;
    };
  }, [zones, handleDrop]);

  const onPointerDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    const r = stageRect(el);
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    grab.current = { dx: p.x - cx, dy: p.y - cy, x: cx, y: cy };
    if (st.current.wins < WINS_PER_ROOM) window.clearTimeout(follow.current);
    setDragging(true);
    setCat({ x: cx, y: cy, scale: 1, hidden: false });
  };

  const onPointerMove = (e: RPointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g) return;
    const p = clientToStage(e.clientX, e.clientY);
    g.x = p.x - g.dx;
    g.y = p.y - g.dy;
    setCat({ x: g.x, y: g.y, scale: 1, hidden: false });
  };

  const onPointerUp = (e: RPointerEvent<HTMLDivElement>) => {
    const g = grab.current;
    if (!g) return;
    grab.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    setDragging(false);
    const at = { x: g.x, y: g.y };
    handleDrop(zoneAt(at, zones), at);
  };

  const askKey = ask ? `hide.ask-${pairKey(ask)}` : '';

  return (
    <div
      className={styles.root}
      data-testid="game-hide"
      data-last-say={lastSay || undefined}
      data-room={room.id}
      data-mode={ask ? 'ask' : 'free'}
      data-ask={askKey || undefined}
    >
      <Scenery variant={room.id === 'garden' ? 'garden' : 'room'} />
      {room.id === 'kitchen' && (
        <>
          <div className={styles.tiles} />
          <div className={styles.shelf}>
            <div className={styles.jar} style={{ left: 30, background: 'var(--clay-peach)' }} />
            <div className={styles.jar} style={{ left: 104, background: 'var(--clay-butter)' }} />
            <div className={styles.jar} style={{ left: 178, background: 'var(--clay-lilac)' }} />
          </div>
        </>
      )}

      {room.objects.map((o) => (
        <Thing key={`${room.id}-${o.id}`} obj={o} />
      ))}

      {zones.map((z) => (
        <div
          key={pairKey(z)}
          className={styles.zone}
          data-testid={`zone-${pairKey(z)}`}
          style={{ left: z.left, top: z.top, width: z.right - z.left, height: z.bottom - z.top }}
        />
      ))}

      <div
        className={styles.daudau}
        data-testid="hide-daudau"
        data-dragging={dragging ? '' : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          left: cat.x - HALF,
          top: cat.y - HALF,
          transform: `scale(${dragging ? 1.12 : cat.scale})`,
          zIndex: dragging ? 30 : cat.hidden ? 3 : 6,
        }}
      >
        <div key={bounce} className={styles.body} data-bounce={bounce > 0 ? '' : undefined}>
          <img src={buddy.img} alt="" draggable={false} />
        </div>
      </div>

      <BackHome onExit={onExit} />
    </div>
  );
}
