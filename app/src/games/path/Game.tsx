import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { useBuddyLook } from '../../ui/buddyContext';
import type { ClayColor } from '../../core/tokens';
import {
  COLS,
  ROWS,
  LEVELS,
  DIRS,
  dirTo,
  inGrid,
  isTree,
  levelFor,
  neighbors,
  run,
  samePos,
  shortestPath,
  step,
  type Dir,
  type Pos,
} from './logic';
import styles from './Game.module.css';

const MAX_CMDS = 4;
const STEP_MS = 500;
const BUMP_RESET_MS = 1500;
const HOME_NEXT_MS = 2500;

const DIR_LABEL: Record<Dir, string> = { up: 'Lên', down: 'Xuống', left: 'Trái', right: 'Phải' };
const DIR_COLOR: Record<Dir, ClayColor> = { up: 'mint', down: 'peach', left: 'butter', right: 'lilac' };
const DIR_ROT: Record<Dir, number> = { up: 0, right: 90, down: 180, left: 270 };

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

function randomOther(n: number, cur: number): number {
  return (cur + 1 + Math.floor(Math.random() * (n - 1))) % n;
}

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const params = new URLSearchParams(window.location.search);
  const isE2E = params.get('e2e') === '1';
  const forceProgram = isE2E && params.get('path') === 'program';

  const [wins, setWins] = useState(0);
  const mode = forceProgram || levelFor(ageMonths, wins) === 2 ? 'program' : 'step';

  const [mapIdx, setMapIdx] = useState(() => Math.floor(Math.random() * LEVELS.length));
  const map = LEVELS[mapIdx];
  const [pos, setPos] = useState<Pos>(map.start);
  const [hop, setHop] = useState(0);
  const [program, setProgram] = useState<Dir[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [bumpIdx, setBumpIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [scratch, setScratch] = useState(false);
  const [shake, setShake] = useState<string | null>(null);
  const [homeGlow, setHomeGlow] = useState(false);
  const [lastSay, setLastSay] = useState('path.hello');

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

  // Lời chào khi vào game (data-last-say đã khởi tạo là path.hello)
  useEffect(() => {
    speaker.say('path.hello');
  }, [speaker]);

  const moveTo = (p: Pos) => {
    setPos(p);
    setHop((h) => h + 1);
  };

  const nextMap = () => {
    const idx = randomOther(LEVELS.length, mapIdx);
    setMapIdx(idx);
    setPos(LEVELS[idx].start);
    setProgram([]);
    setActiveIdx(null);
    setBumpIdx(null);
    setHomeGlow(false);
    setScratch(false);
    setBusy(false);
  };

  const goHome = () => {
    setActiveIdx(null);
    setHomeGlow(true);
    say('path.home');
    later(() => {
      setWins((w) => w + 1);
      nextMap();
    }, HOME_NEXT_MS);
  };

  const shakeTree = (p: Pos) => {
    const k = `${p.r}-${p.c}`;
    setShake(k);
    later(() => setShake((s) => (s === k ? null : s)), 600);
  };

  // Mức 1: chạm ô kề để đi
  const tapCell = (target: Pos) => {
    if (busy || mode !== 'step') return;
    if (isTree(map, target)) {
      shakeTree(target);
      return;
    }
    const dir = dirTo(pos, target);
    if (!dir) return;
    moveTo(target);
    say(`path.${dir}`);
    if (samePos(target, map.home)) {
      setBusy(true);
      later(goHome, 600);
    }
  };

  // Mức 2: xếp lệnh
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
      say('path.hello');
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
        if (hitTree) say('path.bump');
        backToStart();
      }, STEP_MS * (at + 1));
    } else if (res.home) {
      later(goHome, STEP_MS * steps + 600);
    } else {
      // chương trình ngắn hơn đường: Đậu Đậu gãi đầu rồi về chỗ cũ, không báo lỗi
      later(() => {
        setActiveIdx(null);
        setScratch(true);
        backToStart();
      }, STEP_MS * (steps + 1));
    }
  };

  const tapDir = (dir: Dir) => {
    if (mode === 'step') {
      const t = step(pos, dir);
      if (inGrid(t)) tapCell(t);
    } else {
      addCmd(dir);
    }
  };

  // Móc e2e
  useEffect(() => {
    if (!isE2E) return;
    window.__behocPath = {
      solution: () => shortestPath(map, mode === 'step' ? pos : map.start) ?? [],
      tapDir: (d) => {
        if ((DIRS as readonly string[]).includes(d)) tapDir(d as Dir);
      },
    };
    return () => {
      delete window.__behocPath;
    };
  });

  const hints =
    mode === 'step' && !busy ? new Set(neighbors(pos, map).map((n) => `${n.pos.r}-${n.pos.c}`)) : new Set<string>();

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
          data-shake={shake === k ? 'true' : undefined}
          data-glow={kind === 'home' && homeGlow ? 'true' : undefined}
          data-dau={hasDau ? 'true' : undefined}
          aria-label={kind === 'tree' ? 'Cây' : kind === 'home' ? 'Nhà' : `Ô ${r + 1}-${c + 1}`}
          onPointerDown={() => tapCell(p)}
        >
          {kind === 'tree' && (
            <span className={styles.tree}>
              <span className={styles.trunk} />
              <span className={styles.canopy} />
              <span className={styles.canopyTop} />
            </span>
          )}
          {kind === 'home' && (
            <span className={styles.house}>
              <span className={styles.roof} />
              <span className={styles.wall}>
                <span className={styles.window} />
                <span className={styles.door} />
              </span>
            </span>
          )}
          {hasDau && (
            <img
              key={hop}
              src={buddy.img}
              alt={buddy.name}
              data-testid="daudau"
              data-scratch={scratch ? 'true' : undefined}
              className={styles.dau}
              draggable={false}
            />
          )}
        </div>,
      );
    }
  }

  return (
    <div
      className={styles.scene}
      data-testid="game-path"
      data-last-say={lastSay}
      data-mode={mode}
      data-busy={busy ? 'true' : undefined}
    >
      <span className={styles.sun} />
      <span className={`${styles.cloud} ${styles.cloudA}`} />
      <span className={`${styles.cloud} ${styles.cloudB}`} />
      <BackHome onExit={onExit} />

      <div className={styles.board} data-mode={mode}>
        <div className={styles.grid}>{cells}</div>
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
