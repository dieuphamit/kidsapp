import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { synth } from '../../core/synth';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { useBuddyLook } from '../../ui/buddyContext';
import { clientToStage, stageRect } from '../../ui/Stage';
import { useSayThen } from '../../ui/useSayThen';
import type { ClayColor } from '../../core/tokens';
import {
  COLS,
  ROWS,
  LEVELS,
  DIRS,
  PLAY_MODES,
  canStep,
  cellAt,
  dirTo,
  extendTrail,
  inGrid,
  isTree,
  levelsFor,
  modeFor,
  neighbors,
  nextLevelIdx,
  nextTheme,
  THEMES,
  run,
  samePos,
  shortestPath,
  step,
  trailReachesHome,
  walkerSound,
  type Dir,
  type PlayMode,
  type Pos,
  type Theme,
} from './logic';
import styles from './Game.module.css';

const MAX_CMDS = 4;
const STEP_MS = 500;
/** Nhịp con vật chạy theo đường bé vẽ. */
const DRAW_STEP_MS = 360;
const BUMP_RESET_MS = 1500;
/** Nghỉ một chút sau lời ăn mừng rồi mới sang bản đồ mới. */
const HOME_REST_MS = 700;
const CELL = 120;
const GAP = 24;

const DIR_LABEL: Record<Dir, string> = { up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải' };
const DIR_COLOR: Record<Dir, ClayColor> = { up: 'mint', down: 'peach', left: 'butter', right: 'lilac' };
const DIR_ROT: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

const MODE_UI: Record<PlayMode, { icon: string; label: string; color: ClayColor; say: string }> = {
  tap: { icon: '👆', label: 'Chạm ô', color: 'butter', say: 'path.mode-tap' },
  draw: { icon: '✏️', label: 'Vẽ đường', color: 'peach', say: 'path.mode-draw' },
  program: { icon: '➡️', label: 'Mũi tên', color: 'lilac', say: 'path.mode-arrows' },
};

declare global {
  interface Window {
    __behocPath?: {
      solution(): string[];
      tapDir(dir: string): void;
    };
  }
}

function Arrow({ dir, size = 64 }: { dir: Dir; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden="true"
      style={{ transform: `rotate(${DIR_ROT[dir]}deg)` }}
      className={styles.arrow}
    >
      <path d="M32 6 L56 32 H42 V58 H22 V32 H8 Z" />
    </svg>
  );
}

const BASE = import.meta.env.BASE_URL;

/** Chủ đề đầu tiên: e2e có thể ép bằng ?ptheme=<id>. */
function firstTheme(isE2E: boolean, forced: string | null): Theme {
  const t = isE2E ? THEMES.find((x) => x.id === forced) : undefined;
  return t ?? nextTheme(null, Math.random());
}

/** Ô đích theo chủ đề. */
function GoalArt({ theme }: { theme: Theme }) {
  switch (theme.goal) {
    case 'house':
      return (
        <span className={styles.house}>
          <span className={styles.roof} />
          <span className={styles.wall}>
            <span className={styles.window} />
            <span className={styles.door} />
          </span>
        </span>
      );
    case 'sea':
      return (
        <span className={styles.sea}>
          <span className={styles.wave} />
          <span className={styles.wave} />
        </span>
      );
    case 'nest':
      return (
        <span className={styles.nest}>
          <span className={styles.egg} />
          <span className={styles.egg} />
          <span className={styles.egg} />
          <span className={styles.nestBowl} />
        </span>
      );
    case 'burrow':
      return (
        <span className={styles.burrow}>
          <span className={styles.hole} />
          <span className={styles.carrot} />
        </span>
      );
    case 'flower':
      return <img className={styles.flower} src={`${BASE}cards/story/plant-3.png`} alt="" draggable={false} />;
  }
}

/** Tâm ô (hàng, cột) trong toạ độ lưới. */
const center = (p: Pos) => ({ x: p.c * (CELL + GAP) + CELL / 2, y: p.r * (CELL + GAP) + CELL / 2 });

/** Tiếng bước vui: nốt cao dần theo từng bước (synth, không cắt lời đang nói). */
function stepNote(i: number) {
  synth.playNote(Math.min(7, Math.max(0, i)));
}

export default function Game({ lang, speaker, ageMonths, options, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const params = new URLSearchParams(window.location.search);
  const isE2E = params.get('e2e') === '1';
  const forcedMode = isE2E
    ? params.get('path') === 'program'
      ? 'program'
      : (PLAY_MODES.find((m) => m === params.get('pmode')) ?? null)
    : null;
  const forcedTheme = isE2E ? params.get('ptheme') : null;
  const difficulty = options?.difficulty ?? 'auto';

  const [mode, setMode] = useState<PlayMode>(() => forcedMode ?? modeFor(difficulty, ageMonths));
  const [pool] = useState(() => levelsFor(difficulty, ageMonths));
  const [theme, setTheme] = useState<Theme>(() => firstTheme(isE2E, forcedTheme));
  const [mapIdx, setMapIdx] = useState(() => nextLevelIdx(pool, null, Math.random()));
  const map = LEVELS[mapIdx];
  const [pos, setPos] = useState<Pos>(map.start);
  const [hop, setHop] = useState(0);
  const [program, setProgram] = useState<Dir[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [bumpIdx, setBumpIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [scratch, setScratch] = useState(false);
  const [puzzled, setPuzzled] = useState(0);
  const [nudge, setNudge] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  const [homeGlow, setHomeGlow] = useState(false);
  const [lastSay, setLastSay] = useState(theme.hello);
  // nét vẽ: dãy ô bắt đầu ở ô con vật đứng; finger = điểm ngón tay (toạ độ lưới) khi đang kéo
  const [trail, setTrail] = useState<Pos[] | null>(null);
  const [finger, setFinger] = useState<{ x: number; y: number } | null>(null);
  const trailRef = useRef<Pos[] | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const timers = useRef<number[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), []);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );
  const sayAll = useSayThen(speaker, setLastSay);

  // Lời chào khi vào game (data-last-say đã khởi tạo là câu chào của chủ đề);
  // vẽ đường là cách chơi mới với bé nên nói thêm cách vẽ, nối tiếp sau câu chào.
  const first = useRef({ hello: theme.hello, mode });
  useEffect(() => {
    const { hello, mode: m } = first.current;
    if (m === 'draw') sayAll([hello, MODE_UI.draw.say]);
    else speaker.say(hello);
  }, [speaker, sayAll]);

  const updateTrail = (t: Pos[] | null) => {
    trailRef.current = t;
    setTrail(t);
  };

  const moveTo = (p: Pos) => {
    setPos(p);
    setPuzzled(0);
    setHop((h) => h + 1);
  };

  const nextMap = () => {
    const idx = nextLevelIdx(pool, mapIdx, Math.random());
    // chủ đề mới mỗi bản đồ (e2e ép chủ đề thì giữ nguyên), rồi giới thiệu đích mới
    const t = forcedTheme && THEMES.some((x) => x.id === forcedTheme) ? theme : nextTheme(theme.id, Math.random());
    if (t.id !== theme.id) {
      setTheme(t);
      say(t.hello);
    }
    setMapIdx(idx);
    setPos(LEVELS[idx].start);
    setProgram([]);
    setActiveIdx(null);
    setBumpIdx(null);
    setHomeGlow(false);
    setScratch(false);
    updateTrail(null);
    setBusy(false);
  };

  /** Tới đích: đích sáng lên, con vật nhảy mừng, nói "tới rồi" rồi tiếng kêu thật, xong mới sang bản đồ mới. */
  const goHome = () => {
    setBusy(true);
    setActiveIdx(null);
    updateTrail(null);
    setHomeGlow(true);
    const sound = walkerSound(theme.walker, buddy.character);
    sayAll(sound ? [theme.home, sound] : [theme.home], { onDone: () => later(nextMap, HOME_REST_MS) });
  };

  const shakeTree = (p: Pos) => {
    const k = `${p.r}-${p.c}`;
    setShake(k);
    later(() => setShake((s) => (s === k ? null : s)), 600);
  };

  /** Chạm ô chưa đi được: con vật nghiêng đầu, các ô kề nhấp nháy rõ hơn (không âm báo sai). */
  const wonder = () => {
    setPuzzled((n) => n + 1);
    setNudge(true);
    later(() => setNudge(false), 1200);
  };

  /** Chạm chính bạn đang đi: nhún ngay; đang rảnh thì nhắc lại việc cần làm. */
  const tapWalker = () => {
    setPuzzled(0);
    setHop((h) => h + 1);
    if (!busy) say(theme.hello);
  };

  // Chạm ô: ô kề đi được thì nhảy sang ngay
  const tapCell = (target: Pos) => {
    if (samePos(target, pos)) {
      tapWalker();
      return;
    }
    if (busy || mode === 'program') return;
    if (isTree(map, target)) {
      shakeTree(target);
      wonder();
      return;
    }
    if (!canStep(map, pos, target)) {
      wonder();
      return;
    }
    const dir = dirTo(pos, target)!;
    moveTo(target);
    stepNote(hop % 8);
    say(`path.${dir}`);
    if (samePos(target, map.home)) {
      setBusy(true);
      later(goHome, 600);
    }
  };

  /** Con vật chạy theo đường bé vẽ; tới đích thì ăn mừng, chưa tới thì đứng chờ bé vẽ tiếp. */
  const walkTrail = (t: Pos[]) => {
    setBusy(true);
    for (let i = 1; i < t.length; i++) {
      later(() => {
        moveTo(t[i]);
        stepNote(i - 1);
        updateTrail(t.slice(i));
      }, DRAW_STEP_MS * (i - 1));
    }
    const end = DRAW_STEP_MS * (t.length - 1);
    if (trailReachesHome(map, t)) {
      later(goHome, end + 200);
    } else {
      later(() => {
        updateTrail(null);
        setBusy(false);
        say('path.more');
      }, end);
    }
  };

  // Vẽ đường: kéo từ con vật qua các ô (chế độ chạm ô cũng vẽ được)
  const gridPoint = (e: ReactPointerEvent) => {
    // toạ độ khung (đã tính co giãn/xoay của Stage), rồi trừ góc trên-trái của lưới trong khung
    const pt = clientToStage(e.clientX, e.clientY);
    const r = stageRect(gridRef.current!);
    return { x: pt.x - r.left, y: pt.y - r.top };
  };

  const onGridDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    const el = (e.target as HTMLElement).closest<HTMLElement>('[data-r]');
    if (!el) return;
    const p = { r: Number(el.dataset.r), c: Number(el.dataset.c) };
    tapCell(p);
    if (!samePos(p, pos) || busy || mode === 'program') return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // trình duyệt không cho bắt con trỏ: vẫn vẽ được khi ngón tay còn trên lưới
    }
    updateTrail([pos]);
    setFinger(gridPoint(e));
  };

  const onGridMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const t = trailRef.current;
    if (!t || busy) return;
    const pt = gridPoint(e);
    setFinger(pt);
    const cell = cellAt(pt.x, pt.y, CELL, GAP);
    if (!cell) return;
    const next = extendTrail(map, t, cell);
    if (next.length === t.length && samePos(next[next.length - 1], t[t.length - 1])) return;
    if (next.length > t.length) stepNote(next.length - 2);
    updateTrail(next);
  };

  const onGridUp = () => {
    const t = trailRef.current;
    if (!t || busy) return;
    setFinger(null);
    if (t.length > 1) walkTrail(t);
    else updateTrail(null);
  };

  // Xếp lệnh mũi tên
  const addCmd = (dir: Dir) => {
    if (busy || program.length >= MAX_CMDS) return;
    setProgram([...program, dir]);
    setBumpIdx(null);
    say(`path.${dir}`);
  };

  const removeCmd = (i: number) => {
    if (busy) return;
    setProgram(program.filter((_, j) => j !== i));
    setBumpIdx(null);
  };

  const play = () => {
    if (busy) return;
    if (program.length === 0) {
      say(theme.hello);
      return;
    }
    const cmds = program;
    const res = run(map, map.start, cmds);
    const steps = res.path.length - 1;
    setBusy(true);
    setBumpIdx(null);
    setPos(map.start);
    say('path.go');
    for (let i = 0; i < steps; i++) {
      later(() => {
        setActiveIdx(i);
        moveTo(res.path[i + 1]);
        say(`path.${cmds[i]}`);
      }, STEP_MS * (i + 1));
    }
    const backToStart = () => {
      later(() => {
        setPos(map.start);
        setScratch(false);
        setBusy(false);
      }, BUMP_RESET_MS);
    };
    if (res.bumpAt !== null) {
      const at = res.bumpAt;
      const hitTree = isTree(map, step(res.path[res.path.length - 1], cmds[at]));
      later(() => {
        setActiveIdx(null);
        setBumpIdx(at);
        setScratch(true);
        if (hitTree) say(theme.bump);
        backToStart();
      }, STEP_MS * (at + 1));
    } else if (res.home) {
      later(goHome, STEP_MS * steps + 600);
    } else {
      // chương trình ngắn hơn đường: con vật gãi đầu rồi về chỗ cũ, không báo lỗi
      later(() => {
        setActiveIdx(null);
        setScratch(true);
        backToStart();
      }, STEP_MS * (steps + 1));
    }
  };

  /** Đổi cách chơi bằng nút: mũi tên luôn chạy từ ô xuất phát nên đưa con vật về đó. */
  const pickMode = (m: PlayMode) => {
    if (busy) return;
    say(MODE_UI[m].say);
    if (m === mode) return;
    setMode(m);
    updateTrail(null);
    setFinger(null);
    setProgram([]);
    setActiveIdx(null);
    setBumpIdx(null);
    setScratch(false);
    if (m === 'program') moveTo(map.start);
  };

  const tapDir = (dir: Dir) => {
    if (mode === 'program') {
      addCmd(dir);
    } else {
      const t = step(pos, dir);
      if (inGrid(t)) tapCell(t);
    }
  };

  // Móc e2e
  useEffect(() => {
    if (!isE2E) return;
    window.__behocPath = {
      solution: () => shortestPath(map, mode === 'program' ? map.start : pos) ?? [],
      tapDir: (d) => {
        if ((DIRS as readonly string[]).includes(d)) tapDir(d as Dir);
      },
    };
    return () => {
      delete window.__behocPath;
    };
  });

  const free = mode !== 'program' && !busy && !trail;
  const hints = free ? new Set(neighbors(pos, map).map((n) => `${n.pos.r}-${n.pos.c}`)) : new Set<string>();
  const trailKeys = new Set((trail ?? []).map((q) => `${q.r}-${q.c}`));

  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const p = { r, c };
      const k = `${r}-${c}`;
      const kind = isTree(map, p) ? 'tree' : samePos(p, map.home) ? 'home' : 'grass';
      const hasDau = samePos(p, pos);
      cells.push(
        <div
          key={k}
          className={styles.cell}
          data-testid={`cell-${k}`}
          data-r={r}
          data-c={c}
          data-kind={kind}
          data-hint={hints.has(k) ? 'true' : undefined}
          data-trail={trailKeys.has(k) ? 'true' : undefined}
          data-shake={shake === k ? 'true' : undefined}
          data-glow={kind === 'home' && homeGlow ? 'true' : undefined}
          data-dau={hasDau ? 'true' : undefined}
          aria-label={kind === 'tree' ? 'Cây' : kind === 'home' ? 'Nhà' : `Ô ${r + 1}-${c + 1}`}
        >
          {kind === 'tree' && theme.obstacle === 'tree' && (
            <span className={styles.tree}>
              <span className={styles.trunk} />
              <span className={styles.canopy} />
              <span className={styles.canopyTop} />
            </span>
          )}
          {kind === 'tree' && theme.obstacle === 'rock' && (
            <span className={styles.tree}>
              <span className={styles.rock} />
              <span className={styles.rockSmall} />
            </span>
          )}
          {kind === 'home' && <GoalArt theme={theme} />}
          {hasDau && (
            <img
              key={`${hop}-${puzzled}`}
              src={theme.walker === 'buddy' ? buddy.img : `${BASE}cards/${theme.walker}.png`}
              alt={theme.walker === 'buddy' ? buddy.name : ''}
              data-walker={theme.walker}
              data-testid="daudau"
              data-hop={hop}
              data-puzzled={puzzled > 0 && !scratch && !homeGlow ? puzzled : undefined}
              data-scratch={scratch ? 'true' : undefined}
              data-cheer={homeGlow ? 'true' : undefined}
              className={styles.dau}
              draggable={false}
            />
          )}
        </div>,
      );
    }
  }

  // Nét vẽ: qua tâm các ô đã bắt, nối tới đầu ngón tay
  const linePts = (trail ?? []).map(center);
  if (trail && finger && !busy) linePts.push(finger);
  // Nét bắt đầu từ mép ô con vật đang đứng (không vẽ đè lên mặt con vật)
  if (linePts.length > 1) {
    const [a0, a1] = linePts;
    const dx = a1.x - a0.x;
    const dy = a1.y - a0.y;
    const len = Math.hypot(dx, dy);
    const k = len > 0 ? Math.min(CELL / 2, len) / len : 0;
    linePts[0] = { x: a0.x + dx * k, y: a0.y + dy * k };
  }
  const points = linePts.map((q) => `${q.x},${q.y}`).join(' ');

  return (
    <div
      className={styles.scene}
      data-testid="game-path"
      data-last-say={lastSay}
      data-mode={mode}
      data-theme={theme.id}
      data-busy={busy ? 'true' : undefined}
      data-trail-len={trail ? trail.length : undefined}
    >
      <span className={styles.sun} />
      <span className={`${styles.cloud} ${styles.cloudA}`} />
      <span className={`${styles.cloud} ${styles.cloudB}`} />
      <BackHome onExit={onExit} />

      <div className={styles.modes} data-testid="path-modes">
        {PLAY_MODES.map((m) => (
          <ClayButton
            key={m}
            color={MODE_UI[m].color}
            size={120}
            label={MODE_UI[m].label}
            selected={mode === m}
            className={styles.modeBtn}
            onPress={() => pickMode(m)}
          >
            <span className={styles.modeIcon} aria-hidden="true">
              {MODE_UI[m].icon}
            </span>
          </ClayButton>
        ))}
      </div>

      <div className={styles.board} data-mode={mode} data-theme={theme.id}>
        <div
          ref={gridRef}
          className={styles.grid}
          data-testid="path-grid"
          data-nudge={nudge ? 'true' : undefined}
          onPointerDown={onGridDown}
          onPointerMove={onGridMove}
          onPointerUp={onGridUp}
          onPointerCancel={onGridUp}
        >
          {cells}
          {trail && linePts.length > 1 && (
            <svg className={styles.trail} viewBox="0 0 696 408" aria-hidden="true" data-testid="path-trail">
              <polyline className={styles.trailEdge} points={points} />
              <polyline className={styles.trailLine} points={points} />
              {(trail ?? []).slice(1).map((q) => {
                const o = center(q);
                return <circle key={`${q.r}-${q.c}`} className={styles.trailDot} cx={o.x} cy={o.y} r={14} />;
              })}
            </svg>
          )}
        </div>
      </div>

      {mode === 'program' && (
        <>
          <div className={styles.strip}>
            {Array.from({ length: MAX_CMDS }, (_, i) => {
              const cmd = program[i];
              return (
                <div
                  key={i}
                  className={styles.slot}
                  data-testid={`slot-${i}`}
                  data-cmd={cmd}
                  data-active={activeIdx === i ? 'true' : undefined}
                  data-bump={bumpIdx === i ? 'true' : undefined}
                >
                  {cmd ? (
                    <ClayButton color={DIR_COLOR[cmd]} size={120} label={`Xóa lệnh ${i + 1}`} onPress={() => removeCmd(i)}>
                      <Arrow dir={cmd} size={56} />
                    </ClayButton>
                  ) : (
                    <span className={styles.emptySlot}>
                      <span className={styles.slotDot} />
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className={styles.pad}>
            {DIRS.map((d) => (
              <ClayButton key={d} color={DIR_COLOR[d]} size={120} label={DIR_LABEL[d]} onPress={() => addCmd(d)}>
                <Arrow dir={d} />
              </ClayButton>
            ))}
            <ClayButton color="leaf" size={120} label="Chạy" onPress={play}>
              <svg width={64} height={64} viewBox="0 0 64 64" aria-hidden="true" className={styles.arrow}>
                <path d="M18 8 L56 32 L18 56 Z" />
              </svg>
            </ClayButton>
          </div>
        </>
      )}
    </div>
  );
}
