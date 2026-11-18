import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import {
  DirtGrid,
  afterShower,
  animalOrder,
  isBathAnimal,
  isClean,
  levelForAge,
  makeMud,
  rng,
  stampsAlong,
  type AlphaMap,
  type BathAnimal,
  type BathLevel,
  type Phase,
} from './logic';
import {
  ERASER_CORE,
  drawDrops,
  drawFoam,
  drawMud,
  drawWetTint,
  erase,
  makeBubble,
  makeEraser,
  readGrid,
  readMask,
} from './paint';
import { createBathSounds, type BathSounds } from './sounds';
import { BathScene } from './BathScene';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const QS = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
const IS_E2E = QS.get('e2e') === '1';
/** e2e: ép con vật đầu tiên bằng ?bath=pig. */
const FORCE_ANIMAL: BathAnimal | undefined = (() => {
  const a = QS.get('bath') ?? '';
  return IS_E2E && isBathAnimal(a) ? a : undefined;
})();

/** Khung thú (px trong Stage 1194×834); khớp .tub trong Game.module.css. */
export const TUB_SIZE = 680;
/** Lưới bùn thưa để tính % sạch: 40×40 ô (ô 17px). */
const GRID = 40;
/** Mặt nạ hình con vật cỡ nhỏ (đặt vệt bùn, bọt). */
const MASK = 64;
/** Giọt nước rải lên thân ở bước lau khăn. */
const DROPS = 26;

// Nhịp sau khi bấm vòi sen (ms)
const SHOWER_MS = 1700;
const SHAKE_MS = 1300;
const CELEBRATE_MS = 3400;
const LEAVE_MS = 500;
/** Không chạm lâu chừng này thì nhắc cách chơi. */
const HINT_IDLE_MS = 7000;
/** Tiếng chà phát thưa (không dồn thành tiếng ồn). */
const SCRUB_SOUND_MS = 120;

type Say = (key: string) => void;
/** Hạt giống của buổi chơi: e2e cố định để ảnh chụp ổn định. */
const newSeed = () => (IS_E2E ? 1 : Math.floor(Math.random() * 100000));
type BathHook = { dirtyCells(): [number, number][]; brush: number };

interface TubProps {
  animal: BathAnimal;
  level: BathLevel;
  seed: number;
  say: Say;
  sounds: BathSounds;
  first: boolean;
  onDone(): void;
}

/** Một lượt tắm cho một con: chà bùn → vòi sen → (lau khăn) → sạch bong. */
function Tub({ animal, level, seed, say, sounds, first, onDone }: TubProps) {
  const [phase, setPhase] = useState<Phase>('scrub');
  const [shaking, setShaking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [hint, setHint] = useState<{ x: number; y: number } | null>(null);
  const [feetY, setFeetY] = useState(0.9);
  const rootRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const mudRef = useRef<HTMLCanvasElement>(null);
  const foamRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef<Phase>('scrub');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const lastTouch = useRef(0);
  const lastScrubSound = useRef(0);
  const g = useRef<{
    img: HTMLImageElement;
    w: number;
    h: number;
    mask: AlphaMap;
    grid: DirtGrid;
    eraser: HTMLCanvasElement;
    bubble: HTMLCanvasElement;
    rand: () => number;
  } | null>(null);
  const stroke = useRef<{ id: number; x: number; y: number; n: number } | null>(null);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const go = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Nạp ảnh, vẽ bùn, đọc lưới bùn (một lần cho mỗi con)
  useEffect(() => {
    let alive = true;
    const img = new Image();
    img.src = `${BASE}cards/bath/${animal}.png`;
    const setup = () => {
      const box = boxRef.current;
      const mud = mudRef.current;
      const foam = foamRef.current;
      if (!alive || !box || !mud || !foam) return;
      const w = box.offsetWidth || TUB_SIZE;
      const h = box.offsetHeight || TUB_SIZE;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      for (const c of [mud, foam]) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
        c.getContext('2d')?.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      const mctx = mud.getContext('2d');
      const mask = readMask(img, MASK);
      if (!mctx || !mask) return;
      // chân thú (hàng thấp nhất có hình) để đặt bóng và vũng nước đúng chỗ
      let bottom = MASK - 1;
      while (bottom > 0 && !Array.from({ length: MASK }, (_, x) => mask.data[bottom * MASK + x]).some((a) => a > 128)) bottom--;
      setFeetY((bottom + 1) / MASK);
      drawMud(mctx, w, h, makeMud(level, mask, seed), img, seed);
      const grid = new DirtGrid(w, h, readGrid(mud, GRID, GRID), GRID, GRID);
      g.current = {
        img, w, h, mask, grid,
        eraser: makeEraser(level.brush, dpr),
        bubble: makeBubble(Math.round(48 * dpr)),
        rand: rng(seed + 7),
      };
      if (rootRef.current) {
        rootRef.current.dataset.ready = 'true';
        rootRef.current.dataset.clean = '0';
      }
      if (IS_E2E) {
        // e2e: tâm các ô còn bùn (tỉ lệ 0..1 theo khung thú) để chà đúng chỗ và kiểm tra chỗ khác vẫn bẩn
        (window as Window & { __behocBath?: BathHook }).__behocBath = {
          dirtyCells: () => {
            const s = g.current;
            if (!s) return [];
            const out: [number, number][] = [];
            for (let row = 0; row < s.grid.rows; row++)
              for (let col = 0; col < s.grid.cols; col++)
                if (s.grid.isDirty(col, row)) out.push([(col + 0.5) / s.grid.cols, (row + 0.5) / s.grid.rows]);
            return out;
          },
          brush: level.brush / w,
        };
      }
    };
    const loaded: Promise<unknown> =
      typeof img.decode === 'function'
        ? img.decode()
        : new Promise((res, rej) => {
            img.onload = res;
            img.onerror = rej;
          });
    loaded.then(setup, () => {
      if (img.complete && img.naturalWidth > 0) setup();
    });
    return () => {
      alive = false;
    };
  }, [animal, level, seed]);

  // Giới thiệu con vật
  useEffect(() => {
    say(`bath.dirty.${animal}`);
    lastTouch.current = Date.now();
  }, [animal, say]);

  // Nhắc khi bé chưa chạm (chỉ lúc đang chà/lau)
  useEffect(() => {
    if (phase !== 'scrub' && phase !== 'towel') return;
    const id = setInterval(() => {
      if (Date.now() - lastTouch.current < HINT_IDLE_MS || !g.current) return;
      lastTouch.current = Date.now();
      const p = g.current.grid.dirtyCellNear(0.5, 0.5);
      if (p) setHint(p);
      say(phase === 'towel' ? 'bath.towel' : 'bath.hint');
    }, 1000);
    return () => clearInterval(id);
  }, [phase, say]);

  const celebrate = useCallback(() => {
    go('done');
    sounds.sparkle();
    say(`bath.clean.${animal}`);
    later(() => setLeaving(true), CELEBRATE_MS);
    later(onDone, CELEBRATE_MS + LEAVE_MS);
  }, [animal, go, later, onDone, say, sounds]);

  const updateClean = () => {
    const s = g.current;
    if (!s || !rootRef.current) return;
    rootRef.current.dataset.clean = String(Math.round(s.grid.cleanFraction * 100));
    if (!isClean(s.grid, level)) return;
    if (phaseRef.current === 'scrub') {
      go('rinse');
      sounds.sparkle();
      say('bath.shower');
    } else if (phaseRef.current === 'towel') {
      celebrate();
    }
  };

  /** Chà một đoạn: xoá bùn (hoặc giọt nước), nổi bọt, đánh dấu ô sạch. */
  const scrubTo = (x0: number, y0: number, x1: number, y1: number, n: number) => {
    const s = g.current;
    const mctx = mudRef.current?.getContext('2d');
    const fctx = foamRef.current?.getContext('2d');
    if (!s || !mctx || !fctx) return n;
    const r = level.brush;
    const towel = phaseRef.current === 'towel';
    for (const [x, y] of stampsAlong(x0, y0, x1, y1, r * 0.35)) {
      erase(mctx, s.eraser, x, y, r);
      if (towel) erase(fctx, s.eraser, x, y, r);
      else if (n++ % 2 === 0) drawFoam(fctx, s.bubble, x, y, r, s.w, s.h, s.mask, s.rand);
      s.grid.scrub(x, y, r * ERASER_CORE);
    }
    return n;
  };

  const moveTool = (x: number, y: number, show: boolean) => {
    const t = toolRef.current;
    if (!t) return;
    t.style.transform = `translate(${x}px, ${y}px)`;
    t.dataset.show = show ? 'true' : 'false';
  };

  const onDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    lastTouch.current = Date.now();
    setHint(null);
    const p = phaseRef.current;
    // phản hồi ngay lúc chạm xuống (≤100ms): bong bóng nổ "lóc"
    sounds.pop();
    if (p !== 'scrub' && p !== 'rinse' && p !== 'towel') return;
    if (stroke.current) return; // chỉ một ngón
    e.currentTarget.setPointerCapture?.(e.pointerId);
    // offsetX/offsetY: toạ độ trong chính canvas, đúng cả khi khung Stage co giãn/xoay
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    const n = scrubTo(x, y, x, y, 0);
    stroke.current = { id: e.pointerId, x, y, n };
    moveTool(x, y, true);
    updateClean();
  };

  const onMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const st = stroke.current;
    if (!st || st.id !== e.pointerId) return;
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;
    if (Math.hypot(x - st.x, y - st.y) < 2) return;
    lastTouch.current = Date.now();
    st.n = scrubTo(st.x, st.y, x, y, st.n);
    st.x = x;
    st.y = y;
    moveTool(x, y, true);
    const now = performance.now();
    if (now - lastScrubSound.current > SCRUB_SOUND_MS) {
      lastScrubSound.current = now;
      sounds.scrub();
    }
    updateClean();
  };

  const onUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (stroke.current?.id !== e.pointerId) return;
    stroke.current = null;
    moveTool(e.nativeEvent.offsetX, e.nativeEvent.offsetY, false);
  };

  const shower = () => {
    if (phaseRef.current !== 'rinse') return;
    stroke.current = null;
    moveTool(0, 0, false);
    go('shower');
    sounds.shower();
    later(() => {
      // nước cuốn sạch bọt và bùn còn sót
      const s = g.current;
      for (const c of [mudRef.current, foamRef.current]) c?.getContext('2d')?.clearRect(0, 0, s?.w ?? TUB_SIZE, s?.h ?? TUB_SIZE);
      setShaking(true);
      say(`animal.${animal}-sound`);
      later(() => {
        setShaking(false);
        const next = afterShower(level);
        const mctx = mudRef.current?.getContext('2d');
        const fctx = foamRef.current?.getContext('2d');
        if (next === 'towel' && s && mctx && fctx && mudRef.current) {
          drawDrops(mctx, s.w, s.h, s.mask, s.img, seed, DROPS);
          s.grid = new DirtGrid(s.w, s.h, readGrid(mudRef.current, GRID, GRID), GRID, GRID);
          drawWetTint(fctx, s.w, s.h, s.img);
          if (rootRef.current) rootRef.current.dataset.clean = '0';
          lastTouch.current = Date.now();
          go('towel');
          say('bath.towel');
        } else {
          celebrate();
        }
      }, SHAKE_MS);
    }, SHOWER_MS);
  };

  const tubStyle = { '--feet': `${(feetY * 100).toFixed(1)}%` } as CSSProperties;

  return (
    <div
      ref={rootRef}
      className={styles.tubLayer}
      data-testid="bath-tub"
      data-animal={animal}
      data-phase={phase}
    >
      <div
        ref={boxRef}
        className={`${styles.tub} ${first ? '' : styles.enter} ${leaving ? styles.leave : ''}`}
        style={tubStyle}
      >
        <span className={styles.puddle} aria-hidden="true" />
        <div className={`${styles.animal} ${shaking ? styles.shake : ''}`} data-shaking={shaking ? 'true' : undefined}>
          <img className={styles.photo} src={`${BASE}cards/bath/${animal}.png`} alt="" draggable={false} />
          <canvas ref={mudRef} className={`${styles.layer} ${phase === 'towel' ? '' : styles.mud} ${phase === 'shower' ? styles.rinseAway : ''}`} data-testid="bath-mud" />
          <canvas
            ref={foamRef}
            className={`${styles.layer} ${styles.touch} ${phase === 'shower' ? styles.rinseAway : ''}`}
            data-testid="bath-canvas"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          />
          <div ref={toolRef} className={phase === 'towel' ? styles.towel : styles.sponge} data-show="false" aria-hidden="true" />
        </div>
        {hint && (
          <div className={styles.hint} style={{ left: hint.x, top: hint.y }} aria-hidden="true" data-testid="bath-hint" />
        )}
        {shaking && (
          <div className={styles.splash} aria-hidden="true">
            {SPLASH.map(([dx, dy], i) => (
              <span key={i} style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, animationDelay: `${(i % 4) * 90}ms` } as CSSProperties} />
            ))}
          </div>
        )}
        {phase === 'done' && (
          <div className={styles.sparkles} aria-hidden="true" data-testid="bath-sparkles">
            {SPARKLES.map(([x, y, s], i) => (
              <span key={i} style={{ left: `${x}%`, top: `${y}%`, '--s': s, animationDelay: `${i * 110}ms` } as CSSProperties} />
            ))}
          </div>
        )}
      </div>

      {phase === 'shower' && (
        <div className={styles.shower} aria-hidden="true" data-testid="bath-water">
          <span className={styles.showerPipe} />
          <span className={styles.showerHead} />
          {STREAMS.map(([x, d], i) => (
            <span key={i} className={styles.stream} style={{ left: `${x}%`, animationDelay: `${d}ms` }} />
          ))}
        </div>
      )}

      {phase === 'rinse' && (
        <div className={styles.showerBtn} data-testid="bath-shower">
          <ClayButton color="mint" size={160} label="Vòi sen" onPress={shower}>
            <ShowerIcon />
          </ClayButton>
        </div>
      )}
    </div>
  );
}

/** Giọt nước văng ra khi thú lắc mình: [dx, dy] px. */
const SPLASH: [number, number][] = [
  [-260, -120], [-220, 40], [-190, -220], [-120, -280], [0, -300], [120, -280],
  [200, -210], [250, -90], [270, 50], [-280, -30], [60, -320], [-60, -310],
];
/** Lấp lánh quanh thú: [x%, y%, cỡ]. */
const SPARKLES: [number, number, number][] = [
  [14, 22, 1.2], [82, 18, 1], [50, 6, 1.4], [8, 58, 0.9], [90, 52, 1.3], [28, 40, 0.8], [70, 36, 1.1], [60, 70, 0.9], [36, 72, 1],
];
/** Dòng nước từ vòi sen: [x% trong khung, trễ ms]. */
const STREAMS: [number, number][] = Array.from({ length: 16 }, (_, i) => [24 + i * 3.4 + (i % 3) * 0.8, (i * 137) % 420]);

/** Vòi sen vẽ bằng SVG (màu từ tokens.css). */
function ShowerIcon() {
  const f = (t: string) => ({ style: { fill: `var(--${t})` } });
  return (
    <svg viewBox="0 0 100 100" width="104" height="104" aria-hidden="true">
      <path d="M22 18 Q22 8 34 8 L60 8" style={{ fill: 'none', stroke: 'var(--ink-soft)', strokeWidth: 8, strokeLinecap: 'round' }} />
      <rect x="54" y="4" width="12" height="16" rx="5" {...f('ink-soft')} />
      <path d="M36 24 L84 24 Q84 44 60 44 Q36 44 36 24 Z" {...f('learn-blue')} transform="rotate(-8 60 34)" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={40 + i * 9} y={52 + (i % 2) * 6} width="5" height="16" rx="2.5" className={styles.iconDrop} style={{ fill: 'var(--world-water)', animationDelay: `${i * 120}ms` }} />
      ))}
      {[0, 1, 2].map((i) => (
        <circle key={`b${i}`} cx={30 + i * 22} cy={86 - (i % 2) * 6} r={6 - i} {...f('paper')} />
      ))}
    </svg>
  );
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [round, setRound] = useState(0);
  const level = useMemo(() => levelForAge(ageMonths), [ageMonths]);
  const [baseSeed] = useState(newSeed);
  const order = useMemo(() => animalOrder(baseSeed, FORCE_ANIMAL), [baseSeed]);
  const sounds = useMemo(() => createBathSounds(), []);
  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );
  const animal = order[round % order.length];
  const onDone = useCallback(() => setRound((r) => r + 1), []);

  return (
    <div className={styles.container} data-testid="game-bath" data-last-say={lastSay || undefined} data-round={round}>
      <BathScene />
      <Tub
        key={round}
        animal={animal}
        level={level}
        seed={baseSeed + round * 101}
        say={say}
        sounds={sounds}
        first={round === 0}
        onDone={onDone}
      />
      <BackHome onExit={onExit} />
    </div>
  );
}
