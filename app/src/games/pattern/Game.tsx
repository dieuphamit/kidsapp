import { useState, useEffect, useCallback, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { useBuddyLook } from '../../ui/buddyContext';
import { clientToStage } from '../../ui/Stage';
import { useSayThen } from '../../ui/useSayThen';
import {
  choiceCountForAge,
  kindsForTopic,
  newRound,
  nextKey,
  nextLevel,
  pickKind,
  sayKey,
  startLevel,
  STREAK_TO_LEVEL_UP,
  KINDS,
  type Kind,
  type Level,
  type Round,
} from './logic';
import { chainLayout, choiceCenter, BEAD, CHOICE } from './layout';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
// Đọc chuỗi nối tiếp: hạt sau chỉ đọc khi tiếng hạt trước THẬT SỰ hết (không cắt tiếng kêu dài).
const GAP_FIRST = 150; // nghỉ giữa hai hạt
const GAP_SLOW = 400; // đọc lại thưa hơn sau khi chọn chưa đúng
// Loa không báo được lúc hết tiếng (test unit): coi mỗi tiếng dài chừng này
const STEP_WORD = 600;
const STEP_SOUND = 1700;
const FLY_MS = 450;
const ROLL_MS = 700;
const NEXT_ROUND_MS = 2500;
const DRAG_PX = 20;

declare global {
  interface Window {
    __behocPattern?: {
      answer(): string;
      pick(id: string): void;
    };
  }
}

const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

/** Các loại hạt được chơi: theo chủ đề; e2e có thể ép một loại bằng ?pkind=<loại>. */
function playKinds(topic: string): Kind[] {
  const params = new URLSearchParams(location.search);
  const forced = params.get('e2e') === '1' ? params.get('pkind') : null;
  if (forced && (KINDS as string[]).includes(forced)) return [forced as Kind];
  return kindsForTopic(topic);
}

const stepMs = (kind: Kind) => (kind === 'sound' ? STEP_SOUND : STEP_WORD);

/** Hình trong hạt: ảnh thẻ (quả, thú), hạt màu, hoặc hình khối. */
function BeadArt({ kind, id, big }: { kind: Kind; id: string; big?: boolean }) {
  const cls = big ? styles.choiceImg : styles.beadImg;
  if (kind === 'color') return <span className={`${cls} ${styles.colorDot}`} style={{ background: `var(--learn-${id})` }} />;
  if (kind === 'shape') {
    return (
      <svg className={`${cls} ${styles.shapeArt}`} viewBox="0 0 100 100" aria-hidden="true">
        {id === 'circle' && <circle cx={50} cy={50} r={42} />}
        {id === 'square' && <rect x={10} y={10} width={80} height={80} rx={10} />}
        {id === 'triangle' && <path d="M50 8 L94 88 H6 Z" strokeLinejoin="round" />}
        {id === 'star' && <path d="M50 4 L62 37 L97 38 L69 59 L79 93 L50 73 L21 93 L31 59 L3 38 L38 37 Z" />}
      </svg>
    );
  }
  return <img className={cls} src={`${BASE}cards/${id}.png`} alt="" draggable={false} />;
}

interface Drag {
  id: string;
  sx: number;
  sy: number;
  dx: number;
  dy: number;
}

type Motion =
  | { kind: 'drag'; id: string; dx: number; dy: number }
  | { kind: 'fly'; id: string; dx: number; dy: number }
  | { kind: 'roll'; id: string };

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [kinds] = useState(() => playKinds(options?.topic ?? 'mix'));
  const choiceCount = choiceCountForAge(ageMonths);
  const [level, setLevel] = useState<Level>(() => startLevel(ageMonths));
  const [streak, setStreak] = useState(0);
  const [roundNo, setRoundNo] = useState(1);
  const [kind, setKind] = useState<Kind>(() => pickKind(kinds, null, randomSeed()));
  const [round, setRound] = useState<Round>(() => newRound(level, randomSeed(), { kind, choices: choiceCount }));
  const [lastSay, setLastSay] = useState('');
  const [sayCount, setSayCount] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [asking, setAsking] = useState(false);
  const [filled, setFilled] = useState<string | null>(null);
  const [motion, setMotion] = useState<Motion | null>(null);
  const [mistake, setMistake] = useState(false);
  /** Số lần bé chạm bạn đồng hành (đổi key → nhún lại ngay). */
  const [poke, setPoke] = useState(0);
  const drag = useRef<Drag | null>(null);
  const timers = useRef<number[]>([]);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
      setSayCount((n) => n + 1);
    },
    [speaker],
  );

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  /** Mỗi lần đọc chuỗi có số riêng: chuỗi cũ bị chuỗi mới/chọn hạt cắt thì không đổi hạt sáng nữa. */
  const chainId = useRef(0);
  const sayAll = useSayThen(speaker, (key) => {
    setLastSay(key);
    setSayCount((n) => n + 1);
  });

  /**
   * Đậu Đậu đọc chuỗi (hạt đang đọc nảy lên) rồi hỏi "Tiếp theo là …?". Đọc NỐI TIẾP: hạt sau chỉ
   * đọc khi tiếng trước hết, nên tên dài hay tiếng kêu thật không bị đè. `intro` (câu chào) đọc trước.
   */
  const readChain = useCallback(
    (r: Round, k: Kind, slow: boolean, delay: number, intro?: string) => {
      setAsking(false);
      const id = ++chainId.current;
      const head = intro ? [intro] : [];
      const keys = [...head, ...r.shown.map((b) => sayKey(k, b)), nextKey(k)];
      const run = () =>
        sayAll(keys, {
          gapMs: slow ? GAP_SLOW : GAP_FIRST,
          fallbackMs: stepMs(k),
          onStep: (_key, i) => {
            if (id !== chainId.current) return;
            const bead = i - head.length;
            if (bead < 0) return;
            if (bead < r.shown.length) {
              setActive(bead);
            } else {
              setActive(null);
              setAsking(true);
            }
          },
        });
      if (delay > 0) later(delay, run);
      else run();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sayAll],
  );

  // Vào game: chào rồi đọc chuỗi đầu tiên
  useEffect(() => {
    readChain(round, kind, false, 0, 'pattern.hello');
    return clearTimers;
    // chỉ chạy lúc vào game
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRound = (lvl: Level) => {
    const k = pickKind(kinds, kind, randomSeed());
    const r = newRound(lvl, randomSeed(), { kind: k, choices: choiceCount });
    setKind(k);
    setRound(r);
    setRoundNo((n) => n + 1);
    setFilled(null);
    setMotion(null);
    setMistake(false);
    readChain(r, k, false, 400);
  };

  const busy = filled !== null || motion?.kind === 'fly';
  const slotIndex = round.shown.length;
  const layout = chainLayout(slotIndex + 1);
  const slot = layout.beads[slotIndex];

  const pick = (id: string) => {
    if (busy || !round.choices.includes(id)) return;
    clearTimers();
    chainId.current++;
    setActive(null);
    setAsking(false);
    if (id === round.answer) {
      // Hạt bay vào ô ?
      const c = choiceCenter(round.choices.indexOf(id), round.choices.length);
      setMotion({ kind: 'fly', id, dx: slot.x - c.x, dy: slot.y - c.y });
      const s = mistake ? 0 : streak + 1;
      const lvl = nextLevel(level, s, ageMonths);
      // Khen ngay lúc chọn: cắt luôn chuỗi đang đọc dở, không để hai tiếng chồng nhau
      say('pattern.yay');
      later(FLY_MS, () => {
        setFilled(id);
        if (lvl !== level) {
          setLevel(lvl);
          setStreak(0);
        } else {
          setStreak(s >= STREAK_TO_LEVEL_UP ? 0 : s);
        }
      });
      later(FLY_MS + NEXT_ROUND_MS, () => startRound(lvl));
    } else {
      // Chưa đúng: hạt lăn về chỗ, đọc lại chuỗi chậm hơn. Không âm sai, không đếm sai.
      setMistake(true);
      setStreak(0);
      setMotion({ kind: 'roll', id });
      later(ROLL_MS, () => setMotion(null));
      readChain(round, kind, true, 0);
    }
  };

  /** Chạm bạn đồng hành: nhún ngay, rồi đọc lại chuỗi hạt (đang bay/lăn hạt thì chỉ nhún). */
  const onMascotDown = () => {
    setPoke((n) => n + 1);
    if (busy || motion) return;
    clearTimers();
    setActive(null);
    readChain(round, kind, false, 0);
  };

  // E2E hook
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocPattern = { answer: () => round.answer, pick: (id) => pick(id) };
    return () => {
      delete window.__behocPattern;
    };
  });

  // Chạm hoặc kéo nút lựa chọn
  const onChoiceDown = (e: PointerEvent<HTMLDivElement>, id: string) => {
    if (busy || motion?.kind === 'roll') return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    drag.current = { id, sx: p.x, sy: p.y, dx: 0, dy: 0 };
  };

  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const p = clientToStage(e.clientX, e.clientY);
    d.dx = p.x - d.sx;
    d.dy = p.y - d.sy;
    if (Math.hypot(d.dx, d.dy) > DRAG_PX || motion?.kind === 'drag') {
      setMotion({ kind: 'drag', id: d.id, dx: d.dx, dy: d.dy });
    }
  };

  const onUp = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    drag.current = null;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = Math.hypot(p.x - d.sx, p.y - d.sy) > DRAG_PX;
    if (!moved) {
      setMotion(null);
      pick(d.id);
      return;
    }
    const near = BEAD / 2 + 40;
    if (Math.abs(p.x - slot.x) <= near && Math.abs(p.y - slot.y) <= near) {
      pick(d.id);
    } else {
      // Thả ra ngoài: hạt lăn về chỗ, không tính là chọn
      setMotion({ kind: 'roll', id: d.id });
      later(ROLL_MS, () => setMotion((m) => (m?.kind === 'roll' ? null : m)));
    }
  };

  const choiceStyle = (id: string): CSSProperties => {
    const m = motion?.id === id ? motion : null;
    if (m?.kind === 'drag') {
      return { transform: `translate(${m.dx}px, ${m.dy}px) rotate(0deg) scale(1.08)`, transition: 'none', zIndex: 30 };
    }
    if (m?.kind === 'fly') {
      return {
        transform: `translate(${m.dx}px, ${m.dy}px) rotate(0deg) scale(${BEAD / CHOICE})`,
        transition: `transform ${FLY_MS}ms var(--ease-squish)`,
        zIndex: 30,
      };
    }
    if (m?.kind === 'roll') {
      return {
        transform: 'translate(0px, 0px) rotate(-360deg) scale(1)',
        transition: `transform ${ROLL_MS}ms cubic-bezier(0.3, 0.7, 0.4, 1)`,
        zIndex: 20,
      };
    }
    return { transform: 'translate(0px, 0px) rotate(0deg) scale(1)', transition: 'none' };
  };

  const { start, control, end } = layout.string;

  return (
    <div
      className={styles.scene}
      data-testid="game-pattern"
      data-last-say={lastSay}
      data-level={level}
      data-kind={kind}
      data-round={roundNo}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <Scenery variant="meadow" />
      <BackHome onExit={onExit} />

      {/* Dây cong và hạt */}
      <div className={styles.chain} data-yay={filled ? '' : undefined}>
        <svg className={styles.string} viewBox="0 0 1194 834" aria-hidden="true">
          <path
            className={styles.stringShadow}
            d={`M${start.x} ${start.y + 6} Q${control.x} ${control.y + 6} ${end.x} ${end.y + 6}`}
          />
          <path className={styles.stringLine} d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} />
          <circle className={styles.knot} cx={start.x} cy={start.y} r={14} />
          <circle className={styles.knot} cx={end.x} cy={end.y} r={14} />
        </svg>

        {round.shown.map((id, i) => {
          const b = layout.beads[i];
          return (
            <div
              key={`${roundNo}-${i}`}
              className={styles.bead}
              data-bead={id}
              data-active={active === i ? '' : undefined}
              style={{ left: b.x - BEAD / 2, top: b.y - BEAD / 2, animationDelay: `${i * 70}ms` }}
            >
              <BeadArt kind={kind} id={id} />
            </div>
          );
        })}

        <div
          className={styles.slot}
          data-testid="pattern-slot"
          data-filled={filled ?? undefined}
          data-asking={asking && !filled ? '' : undefined}
          style={{ left: slot.x - BEAD / 2, top: slot.y - BEAD / 2, animationDelay: `${slotIndex * 70}ms` }}
        >
          {filled ? (
            <BeadArt kind={kind} id={filled} />
          ) : (
            <span className={styles.question}>?</span>
          )}
        </div>
      </div>

      {/* Đậu Đậu đọc chuỗi */}
      <img
        key={`${sayCount}-${poke}`}
        className={styles.mascot}
        src={buddy.img}
        alt=""
        draggable={false}
        role="button"
        aria-label="buddy"
        data-testid="buddy"
        data-poke={poke}
        data-talking={sayCount > 0 || poke > 0 ? '' : undefined}
        onPointerDown={onMascotDown}
      />

      {/* 3 lựa chọn */}
      {round.choices.map((id, k) => {
        const c = choiceCenter(k, round.choices.length);
        const gone = filled === id;
        return (
          <div
            key={`${roundNo}-${id}`}
            className={styles.choice}
            data-choice={id}
            data-rolling={motion?.kind === 'roll' && motion.id === id ? '' : undefined}
            style={{
              left: c.x - CHOICE / 2,
              top: c.y - CHOICE / 2,
              visibility: gone ? 'hidden' : undefined,
              ...choiceStyle(id),
            }}
            onPointerDown={(e) => onChoiceDown(e, id)}
          >
            <ClayButton color="butter" size={CHOICE} label={id} onPress={() => undefined} style={{ borderRadius: '50%' }}>
              <BeadArt kind={kind} id={id} big />
            </ClayButton>
          </div>
        );
      })}
    </div>
  );
}
