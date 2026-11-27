import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { clientToStage, stageRect } from '../../ui/Stage';
import { useSayThen, useSaySteps } from '../../ui/useSayThen';
import { useBuddyLook } from '../../ui/buddyContext';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import {
  newRound,
  currentTurn,
  drop,
  advance,
  isDone,
  pairById,
  askKey,
  foundKey,
  soundKey,
  HELLO_KEY,
  DONE_KEY,
  type BabyId,
  type State,
} from './logic';
import { layoutMamas, nestBox, snuggleBox, BABY_SIZE, type Box } from './layout';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const card = (id: string) => `${BASE}cards/${id}.png`;

/** Chờ sau câu chào rồi mới hỏi con đầu tiên. */
const HELLO_MS = 2600;
/** Tiếng mẹ kêu xong mới đọc "Bò mẹ và bê con!"; số này chỉ dùng khi loa không báo được lúc hết tiếng. */
const FOUND_SAY_MS = 1300;
/** Con rúc vào mẹ bao lâu rồi sang con kế. */
const SNUGGLE_MS = 3600;
/** Ăn mừng cuối lượt. */
const PARTY_MS = 4200;
/** Kéo quá chừng này (px khung) mới tính là kéo, không thì là chạm. */
const MOVE_PX = 16;

type Phase = 'ask' | 'drag' | 'return' | 'snuggle' | 'party';

interface Drag {
  /** Điểm chạm trong khung lúc bắt đầu, và độ lệch từ điểm chạm tới góc trái trên của con. */
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  x: number;
  y: number;
}

declare global {
  interface Window {
    __behocMama?: {
      turn(): { baby: BabyId; mamas: BabyId[] } | null;
      index(): number;
      drop(mama: BabyId): 'ok' | 'wrong';
    };
  }
}

const SPREAD = [-1, 0.3, -0.4, 0.8, -0.8, 0.1];

function makeRound(ageMonths: number): State {
  const s = newRound(ageMonths, Math.random, recentPicks<BabyId>('mama'));
  rememberPicks('mama', s.turns.map((t) => t.baby), 1);
  return s;
}

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [state, setState] = useState<State>(() => makeRound(ageMonths));
  const [phase, setPhase] = useState<Phase>('ask');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [lastSay, setLastSay] = useState('');
  /** Thú mẹ đang nhún (chạm/đón con) và đang lắc lư gọi con (thả sai). */
  const [bounce, setBounce] = useState<{ id: BabyId; n: number } | null>(null);
  const [call, setCall] = useState<{ id: BabyId; n: number } | null>(null);
  const [babyHop, setBabyHop] = useState(0);
  const [pressedMama, setPressedMama] = useState<BabyId | null>(null);

  const mamaRefs = useRef(new Map<BabyId, HTMLDivElement>());
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
  /** Kịch bản nhiều đoạn: chào → hỏi; ăn mừng → ván mới + hỏi (đoạn sau chờ đoạn trước đọc xong). */
  const talk = useSaySteps(speaker, markSay);

  const live = useRef({ state, phase });
  live.current = { state, phase };

  const turn = currentTurn(state);
  const mamas = turn?.mamas ?? [];
  const slots = layoutMamas(mamas.length);

  // Câu chào khi vào trò, rồi hỏi con đầu tiên
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // Câu chào dài ~6s: câu hỏi chờ câu chào đọc xong (trước đây hẹn 2600ms nên cắt câu chào)
    talk.play([{ keys: [HELLO_KEY], fallbackMs: HELLO_MS }], () => {
      // bé đã kịp chạm/kéo (có câu khác chen vào) thì thôi không hỏi chen vào
      const t = currentTurn(live.current.state);
      if (t && lastKey.current === HELLO_KEY && live.current.state.index === 0 && live.current.phase === 'ask') say(askKey(t.baby));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nextTurn = useCallback(
    (s: State) => {
      const next = advance(s);
      if (isDone(next)) {
        setState(next);
        setPhase('party');
        // Ăn mừng ~5s đọc xong mới sang ván mới (trước đây PARTY_MS 4200 nên câu hỏi cắt câu mừng)
        const fresh = makeRound(ageMonths);
        talk.play([
          { keys: [DONE_KEY], fallbackMs: PARTY_MS },
          {
            keys: [askKey(fresh.turns[0].baby)],
            onStart: () => {
              setState(fresh);
              setPhase('ask');
            },
          },
        ]);
        return;
      }
      setState(next);
      setPhase('ask');
      say(askKey(currentTurn(next)!.baby));
    },
    [ageMonths, say, talk],
  );

  /** Thả con vào mẹ `mama` (hoặc null = thả ra ngoài). */
  const handleDrop = useCallback(
    (mama: BabyId | null): 'ok' | 'wrong' => {
      const t = currentTurn(state);
      if (!t || phase === 'snuggle' || phase === 'party') return 'wrong';
      setDrag(null);
      if (mama === null) {
        setPhase('return');
        later(() => setPhase('ask'), 450);
        return 'wrong';
      }
      const result = drop(state, mama);
      if (result === 'ok') {
        setPhase('snuggle');
        // tiếng mẹ kêu phát hết rồi mới đọc câu "mẹ và con"; đọc xong mới sang con kế
        sayAll([soundKey(mama), foundKey(t.baby)], {
          fallbackMs: FOUND_SAY_MS,
          onDone: () => later(() => nextTurn(state), SNUGGLE_MS - 2 * FOUND_SAY_MS),
        });
        setBounce({ id: mama, n: Date.now() });
      } else {
        // Không âm báo sai: con nhẹ nhàng quay về, mẹ đúng lắc lư gọi con
        setPhase('return');
        say(soundKey(t.baby));
        setCall({ id: t.baby, n: Date.now() });
        later(() => setPhase('ask'), 450);
      }
      return result;
    },
    [state, phase, later, say, sayAll, nextTurn],
  );

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocMama = {
      turn: () => {
        const t = currentTurn(state);
        return t ? { baby: t.baby, mamas: [...t.mamas] } : null;
      },
      index: () => state.index,
      drop: (m) => handleDrop(m),
    };
    return () => {
      delete window.__behocMama;
    };
  });

  const nest = nestBox();

  const onBabyDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!turn || (phase !== 'ask' && phase !== 'return')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    setBabyHop((n) => n + 1);
    setDrag({ startX: p.x, startY: p.y, dx: p.x - nest.x, dy: p.y - nest.y, x: p.x, y: p.y });
    setPhase('drag');
  };

  const onBabyMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ ...drag, x: p.x, y: p.y });
  };

  const onBabyUp = (e: PointerEvent<HTMLDivElement>) => {
    if (!drag || !turn) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - drag.startX, p.y - drag.startY) > MOVE_PX;
    if (!moved) {
      // Chạm con: hỏi lại "Mẹ của bê con đâu nhỉ?"
      setDrag(null);
      setPhase('ask');
      say(askKey(turn.baby));
      return;
    }
    // Tâm con đang kéo có nằm trong thú mẹ nào không
    const cx = p.x - drag.dx + BABY_SIZE / 2;
    const cy = p.y - drag.dy + BABY_SIZE / 2;
    let hit: BabyId | null = null;
    for (const [id, el] of mamaRefs.current) {
      if (!turn.mamas.includes(id)) continue;
      const r = stageRect(el);
      const pad = 24;
      if (cx >= r.left - pad && cx <= r.right + pad && cy >= r.top - pad && cy <= r.bottom + pad) {
        hit = id;
        break;
      }
    }
    handleDrop(hit);
  };

  const onMamaDown = (id: BabyId) => {
    if (phase === 'drag') return;
    setPressedMama(id);
    setBounce({ id, n: Date.now() });
    say(soundKey(id));
  };

  // Vị trí con: ở ổ, đang kéo, hay rúc vào mẹ
  let babyBox: Box = { x: nest.x, y: nest.y, size: BABY_SIZE };
  let babyFlip = 1;
  if (drag && phase === 'drag') {
    babyBox = { x: drag.x - drag.dx, y: drag.y - drag.dy, size: BABY_SIZE };
  } else if (phase === 'snuggle' && turn) {
    const i = mamas.indexOf(turn.baby);
    const pair = pairById(turn.baby);
    const sn = snuggleBox(slots[i], pair.mamaFaces);
    babyBox = sn;
    // con quay mặt về phía mẹ (mẹ nhìn sang trái thì con đứng bên trái, nhìn sang phải)
    babyFlip = -pair.mamaFaces * pair.babyFaces;
  }

  const babyStyle: CSSProperties = {
    left: babyBox.x,
    top: babyBox.y,
    width: babyBox.size,
    height: babyBox.size,
  };

  const party = phase === 'party';

  return (
    <div className={styles.scene} data-testid="game-mama" data-last-say={lastSay} data-phase={phase} data-turn={state.index}>
      <Scenery variant="farm" />
      <BackHome onExit={onExit} />

      {/* Ổ rơm nơi thú con đứng chờ */}
      {!party && <div className={styles.nest} style={{ left: nest.x - 30, top: nest.y + BABY_SIZE - 72, width: BABY_SIZE + 60 }} aria-hidden="true" />}

      {/* Thú mẹ trên cỏ */}
      {!party &&
        mamas.map((id, i) => {
          const pair = pairById(id);
          const s = slots[i];
          const b = bounce?.id === id ? bounce.n : 0;
          const c = call?.id === id ? call.n : 0;
          return (
            <div
              key={`${state.index}-${id}`}
              ref={(el) => {
                if (el) mamaRefs.current.set(id, el);
                else mamaRefs.current.delete(id);
              }}
              className={styles.mama}
              style={{ left: s.x, top: s.y, width: s.size, height: s.size, animationDelay: `${i * 90}ms` }}
              role="button"
              aria-label={`mama-${id}`}
              data-testid={`mama-${id}`}
              data-mama={id}
              data-pressed={pressedMama === id ? '' : undefined}
              onPointerDown={() => onMamaDown(id)}
              onPointerUp={() => setPressedMama(null)}
              onPointerLeave={() => setPressedMama(null)}
              onPointerCancel={() => setPressedMama(null)}
            >
              <span className={styles.shadow} aria-hidden="true" />
              <div key={`b${b}-c${c}`} className={styles.mamaMove} data-bounce={b ? '' : undefined} data-call={c ? '' : undefined}>
                <img
                  src={card(pair.mama)}
                  alt=""
                  draggable={false}
                  className={styles.mamaImg}
                  style={{ animationDelay: `${SPREAD[i] * 1.2}s` }}
                />
              </div>
              {phase === 'snuggle' && turn?.baby === id && (
                <div className={styles.hearts} aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((k) => (
                    <span key={k} style={{ left: `${20 + k * 15}%`, animationDelay: `${k * 160}ms` }}>
                      ❤️
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}

      {/* Thú con: kéo về với mẹ */}
      {turn && !party && (
        <div
          key={`baby-${state.index}`}
          className={styles.baby}
          style={babyStyle}
          data-testid="baby"
          data-baby={turn.baby}
          data-phase={phase}
          role="button"
          aria-label={`baby-${turn.baby}`}
          data-pressed={phase === 'drag' ? '' : undefined}
          onPointerDown={onBabyDown}
          onPointerMove={onBabyMove}
          onPointerUp={onBabyUp}
          onPointerCancel={() => handleDrop(null)}
        >
          <span className={styles.shadow} aria-hidden="true" />
          <div key={babyHop} className={styles.babyMove}>
            <span className={styles.flip} style={{ transform: `scaleX(${babyFlip})` }}>
              <img src={card(pairById(turn.baby).baby)} alt="" draggable={false} className={styles.babyImg} />
            </span>
          </div>
        </div>
      )}

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
