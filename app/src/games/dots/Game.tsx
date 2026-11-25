import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { useSayThen } from '../../ui/useSayThen';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { clientToStage } from '../../ui/Stage';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import {
  animalOrder,
  dotAt,
  isDone,
  isKey,
  makePuzzle,
  newState,
  numberKey,
  soundKey,
  tapDot,
  HELLO_KEY,
  AREA,
  type AnimalId,
  type State,
} from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const card = (id: string) => `${BASE}cards/${id}.png`;

/** Sau số cuối thì con vật kêu (tiếng thật) và ảnh thật hiện dần. */
const SOUND_MS = 700;
/** Rồi đọc "Là con voi!". */
const NAME_MS = 2600;
/** Rồi sang con kế. */
const NEXT_MS = 6400;

type Phase = 'play' | 'reveal';

declare global {
  interface Window {
    __behocDots?: {
      animal(): AnimalId;
      dots(): [number, number][];
      next(): number;
      tap(i: number): boolean;
    };
  }
}

const SPARKLES = [
  { x: 0.08, y: 0.18, d: 0 },
  { x: 0.9, y: 0.12, d: 140 },
  { x: 0.22, y: 0.82, d: 260 },
  { x: 0.78, y: 0.86, d: 380 },
  { x: 0.5, y: 0.04, d: 500 },
  { x: 0.02, y: 0.55, d: 620 },
  { x: 0.98, y: 0.5, d: 740 },
];

/** Bộ bài con vật của một lần vào trò: hết lượt thì xáo lại, con gặp gần đây (trong phiên) xếp cuối. */
function makeDeck() {
  let order: AnimalId[] = [];
  let played: AnimalId[] = [];
  return {
    next(): AnimalId {
      if (order.length === 0) order = animalOrder(Math.random, recentPicks<AnimalId>('dots'));
      const id = order.shift()!;
      played = [...played, id].slice(-4);
      rememberPicks('dots', played, 1);
      return id;
    },
  };
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [deck] = useState(makeDeck);
  const nextAnimal = deck.next;

  const [state, setState] = useState<State>(() => newState(makePuzzle(deck.next(), ageMonths)));
  const [phase, setPhase] = useState<Phase>('play');
  const [lastSay, setLastSay] = useState('');
  /** Chấm đang bị ngón tay đè (phản hồi ngay), chấm kế tiếp nhún gợi ý, vòng gợn chỗ chạm trống. */
  const [pressed, setPressed] = useState<number | null>(null);
  const [hint, setHint] = useState(0);
  const [ripple, setRipple] = useState<{ x: number; y: number; n: number } | null>(null);
  /** Ngón tay đang kéo (toạ độ khung) để vẽ nét tạm từ chấm vừa nối. */
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);

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

  // Giá trị mới nhất cho các sự kiện kéo nhanh (nhiều pointermove trước khi React vẽ lại)
  // (cập nhật ngay trong touchDot/finish, không đợi render)
  const live = useRef({ state, phase });

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(HELLO_KEY);
  }, [say]);

  const finish = useCallback(
    (s: State) => {
      const id = s.puzzle.animal;
      live.current.phase = 'reveal';
      setPhase('reveal');
      setFinger(null);
      // tiếng kêu phát hết rồi mới đọc "Đây là …"; đọc xong mới sang hình mới
      const step = NAME_MS - SOUND_MS;
      later(() => {
        sayAll([soundKey(id), isKey(id)], {
          fallbackMs: step,
          onDone: () =>
            later(() => {
              const fresh = newState(makePuzzle(nextAnimal(), ageMonths));
              live.current = { state: fresh, phase: 'play' };
              setState(fresh);
              setPhase('play');
            }, NEXT_MS - SOUND_MS - 2 * step),
        });
      }, SOUND_MS);
    },
    [ageMonths, later, nextAnimal, sayAll],
  );

  /** Chạm/kéo tới chấm i. down: ngón vừa đặt xuống (chạm sai thì chấm kế nhún gợi ý). */
  const touchDot = useCallback(
    (i: number, down: boolean): boolean => {
      if (live.current.phase !== 'play') return false;
      const r = tapDot(live.current.state, i);
      if (!r.ok) {
        if (down) setHint((n) => n + 1);
        return false;
      }
      live.current.state = r.state;
      setState(r.state);
      say(numberKey(i));
      if (isDone(r.state)) finish(r.state);
      return true;
    },
    [finish, say],
  );

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocDots = {
      animal: () => live.current.state.puzzle.animal,
      dots: () => live.current.state.puzzle.dots.map(([x, y]) => [x, y]),
      next: () => live.current.state.next,
      tap: (i) => touchDot(i, true),
    };
    return () => {
      delete window.__behocDots;
    };
  });

  const dragging = useRef(false);

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    // Nút Về nhà tự lo phần của nó
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    dragging.current = true;
    const p = clientToStage(e.clientX, e.clientY);
    const i = dotAt(live.current.state.puzzle.dots, p);
    if (i >= 0) {
      setPressed(i);
      touchDot(i, true);
    } else {
      setRipple({ x: p.x, y: p.y, n: Date.now() });
    }
    setFinger(p);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const p = clientToStage(e.clientX, e.clientY);
    const i = dotAt(live.current.state.puzzle.dots, p);
    // Kéo ngón qua chấm kế tiếp là nối luôn; lướt qua chấm khác thì thôi, không gợi ý dồn dập
    if (i >= 0 && i === live.current.state.next) {
      setPressed(i);
      touchDot(i, false);
    }
    setFinger(p);
  };

  const onUp = () => {
    dragging.current = false;
    setPressed(null);
    setFinger(null);
  };

  const { puzzle, next } = state;
  const { dots, img, animal } = puzzle;
  const reveal = phase === 'reveal';
  const linked = dots.slice(0, next);
  const points = (reveal ? [...linked, dots[0]] : linked).map(([x, y]) => `${x},${y}`).join(' ');
  const last = next > 0 ? dots[next - 1] : null;

  const boxStyle: CSSProperties = { left: img.x, top: img.y, width: img.size, height: img.size };
  const maskUrl = `url("${card(animal)}")`;

  return (
    <div
      className={styles.scene}
      data-testid="game-dots"
      data-last-say={lastSay}
      data-phase={phase}
      data-animal={animal}
      data-next={next}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      <Scenery variant="meadow" />
      <BackHome onExit={onExit} />

      {/* Tờ giấy vẽ */}
      <div
        className={styles.paper}
        style={{ left: AREA.x0 - 70, top: AREA.y0 - 70, width: AREA.x1 - AREA.x0 + 140, height: AREA.y1 - AREA.y0 + 130 }}
        aria-hidden="true"
      />

      <div key={`animal-${animal}-${puzzle.dots.length}`} className={styles.animal} data-revealed={reveal ? '' : undefined}>
        {/* Bóng mờ lấy từ alpha của ảnh thật */}
        <div
          className={styles.silhouette}
          style={{ ...boxStyle, maskImage: maskUrl, WebkitMaskImage: maskUrl }}
          data-testid="dots-silhouette"
          aria-hidden="true"
        />
        {/* Ảnh thật, hiện dần khi nối xong */}
        <img src={card(animal)} alt="" draggable={false} className={styles.photo} style={boxStyle} data-testid="dots-photo" />
      </div>

      {/* Nét nối */}
      <svg className={styles.lines} viewBox="0 0 1194 834" aria-hidden="true">
        {linked.length > 1 || reveal ? <polyline points={points} className={styles.line} data-testid="dots-line" /> : null}
        {last && finger && !reveal && (
          <line x1={last[0]} y1={last[1]} x2={finger.x} y2={finger.y} className={styles.liveLine} />
        )}
      </svg>

      {/* Chấm đánh số: vùng chạm 120×120, hình tròn thấy được nhỏ hơn */}
      {dots.map(([x, y], i) => {
        const st = i < next ? 'done' : i === next ? 'next' : 'todo';
        return (
          <div
            key={`${animal}-${dots.length}-${i}`}
            className={styles.dot}
            style={{ left: x - 60, top: y - 60, animationDelay: `${i * 50}ms` }}
            role="button"
            aria-label={`${i + 1}`}
            data-testid={`dot-${i + 1}`}
            data-state={st}
            data-pressed={pressed === i ? '' : undefined}
          >
            <span key={st === 'next' ? `h${hint}` : st} className={styles.face} data-hint={st === 'next' && hint > 0 ? '' : undefined}>
              {i + 1}
            </span>
          </div>
        );
      })}

      {/* Gợn nhỏ khi chạm chỗ trống: mọi lần chạm đều có phản hồi */}
      {ripple && <span key={ripple.n} className={styles.ripple} style={{ left: ripple.x - 40, top: ripple.y - 40 }} aria-hidden="true" />}

      {/* Lấp lánh khi ảnh thật hiện ra */}
      {reveal && (
        <div className={styles.sparkles} style={boxStyle} data-testid="dots-sparkles" aria-hidden="true">
          {SPARKLES.map((s, k) => (
            <span key={k} style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, animationDelay: `${s.d}ms` }}>
              {k % 2 ? '⭐' : '✨'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
