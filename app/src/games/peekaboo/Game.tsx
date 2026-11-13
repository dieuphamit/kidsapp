import { useCallback, useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import {
  bushCountForAge,
  hintRoundsForAge,
  newRound,
  tap,
  wiggleMsForAge,
  type AnimalId,
  type Cover,
  type PeekState,
} from './logic';
import styles from './Game.module.css';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');
/** e2e: ép chỗ núp bằng ?pcover=bush|cloud|wave. */
const FORCE_COVER: Cover | undefined = (() => {
  if (!IS_E2E) return undefined;
  const c = new URLSearchParams(window.location.search).get('pcover');
  return c === 'bush' || c === 'cloud' || c === 'wave' ? c : undefined;
})();
const BASE = import.meta.env.BASE_URL;

type BushState = 'idle' | 'shake' | 'split';

// Nhịp một lần tìm thấy (ms): "Ú òa!" → tên thú → tiếng kêu thật → ván mới.
// Thời lượng hoạt cảnh .reveal / .split trong Game.module.css khớp với REVEAL_MS.
const NAME_AT = 900;
const SOUND_AT = 2200;
const REVEAL_MS = 5000;

// Khung bụi: rộng 200px, cách nhau 24px, đáy cách mép dưới 52px (Game.module.css).
// Dùng để thú bay ra từ đúng bụi lên giữa màn hình mà không cần đo DOM.
const BUSH_STEP = 224;
const BUSH_RISE = 834 / 2 - (52 + 100);

/** Màu SVG lấy từ tokens.css qua style (thuộc tính fill="var()" không chạy mọi nơi). */
const fill = (token: string, opacity?: number) => ({
  style: { fill: `var(--${token})`, ...(opacity === undefined ? {} : { fillOpacity: opacity }) },
});
const stop = (token: string) => ({ stopColor: `var(--${token})` });

// Bụi cây vẽ trong hệ toạ độ 200×200. Mỗi nửa (trái/phải) là một nhóm để rẽ lá sang hai bên.
// [cx, cy, r]: cụm lá; vẽ lớp tối phía sau rồi lớp có điểm sáng phía trước → có khối, có chiều sâu.
const LEFT_BLOBS: [number, number, number][] = [
  [32, 158, 30],
  [30, 126, 28],
  [50, 98, 32],
  [72, 70, 32],
  [98, 50, 30],
  [62, 140, 36],
  [88, 106, 38],
  [94, 158, 36],
];
const RIGHT_BLOBS: [number, number, number][] = [
  [168, 158, 30],
  [170, 126, 28],
  [150, 96, 32],
  [128, 68, 32],
  [104, 84, 34],
  [138, 140, 36],
  [118, 112, 38],
];

// Hoa trắng và quả mọng đỏ điểm xuyết: [x, y]
const FLOWERS: [number, number][] = [
  [62, 98],
  [138, 132],
  [92, 162],
];
const BERRIES: [number, number][] = [
  [118, 68],
  [70, 140],
  [152, 96],
  [128, 162],
];

/** Lá nhỏ chĩa ra quanh nửa trên mỗi cụm: mép bụi lởm chởm như lá thật thay vì hình tròn trơn. */
function blobLeaves([x, y, r]: [number, number, number]): [number, number, number][] {
  return [-165, -130, -95, -60, -25].map((deg) => {
    const a = (deg * Math.PI) / 180;
    return [x + (r - 3) * Math.cos(a), y + (r - 3) * Math.sin(a), deg + 90];
  });
}

function Blobs({ blobs, leafUrl }: { blobs: [number, number, number][]; leafUrl: string }) {
  return (
    <>
      {blobs.flatMap(blobLeaves).map(([x, y, rot], i) => (
        <path
          key={`e${i}`}
          d="M0 4 C -7 -2, -6 -12, 0 -18 C 6 -12, 7 -2, 0 4 Z"
          transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot})`}
          {...fill(i % 3 ? 'scene-leaf' : 'scene-leaf-dark')}
        />
      ))}
      {blobs.map(([x, y, r]) => (
        <circle key={`d${x}-${y}`} cx={x + 3} cy={y + 6} r={r + 2} {...fill('scene-leaf-deep')} />
      ))}
      {blobs.map(([x, y, r]) => (
        <circle key={`l${x}-${y}`} cx={x} cy={y} r={r} style={{ fill: leafUrl }} />
      ))}
      {/* gân lá sáng phía trên-trái mỗi cụm: bề mặt lá thay vì quả bóng trơn */}
      {blobs.map(([x, y, r]) => (
        <path
          key={`v${x}-${y}`}
          d={`M${x - r * 0.55} ${y - r * 0.05} q ${r * 0.18} ${-r * 0.42} ${r * 0.5} ${-r * 0.52} M${x - r * 0.1} ${y + r * 0.35} q ${r * 0.2} ${-r * 0.3} ${r * 0.52} ${-r * 0.36}`}
          className={styles.vein}
        />
      ))}
    </>
  );
}

function Flower({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle
          key={a}
          cx={x + 5 * Math.cos((a * Math.PI) / 180)}
          cy={y + 5 * Math.sin((a * Math.PI) / 180)}
          r={4.4}
          {...fill('paper')}
        />
      ))}
      <circle cx={x} cy={y} r={3} {...fill('learn-yellow')} />
    </g>
  );
}

function Berry({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6} {...fill('scene-berry')} />
      <circle cx={x - 2} cy={y - 2} r={1.8} {...fill('paper', 0.8)} />
    </g>
  );
}

function Half({ side, leafUrl }: { side: 'L' | 'R'; leafUrl: string }) {
  const mine = ([x]: [number, number]) => (side === 'L' ? x <= 100 : x > 100);
  return (
    <g className={side === 'L' ? styles.halfL : styles.halfR}>
      <Blobs blobs={side === 'L' ? LEFT_BLOBS : RIGHT_BLOBS} leafUrl={leafUrl} />
      {BERRIES.filter(mine).map(([x, y]) => (
        <Berry key={`${x}-${y}`} x={x} y={y} />
      ))}
      {FLOWERS.filter(mine).map(([x, y]) => (
        <Flower key={`${x}-${y}`} x={x} y={y} />
      ))}
    </g>
  );
}

/** Bụi cây xum xuê bằng SVG: hai nửa rẽ ra khi tìm thấy thú, rung lá khi chạm. */
function LushBush() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const leafUrl = `url(#${uid}-leaf)`;
  return (
    <svg className={styles.bushArt} viewBox="0 0 200 200" aria-hidden="true">
      <defs>
        <radialGradient id={`${uid}-leaf`} cx="0.36" cy="0.28" r="0.78">
          <stop offset="0" style={stop('scene-leaf-shine')} />
          <stop offset="0.3" style={stop('scene-leaf-light')} />
          <stop offset="0.7" style={stop('scene-leaf')} />
          <stop offset="1" style={stop('scene-leaf-dark')} />
        </radialGradient>
      </defs>
      <ellipse cx={100} cy={190} rx={94} ry={10} {...fill('scene-tuft', 0.5)} />
      <Half side="R" leafUrl={leafUrl} />
      <Half side="L" leafUrl={leafUrl} />
    </svg>
  );
}

/** Đám mây bồng bềnh (trời): hai nửa tách ra như bụi. */
function CloudArt() {
  const puffs = (side: 'L' | 'R'): [number, number, number][] =>
    side === 'L'
      ? [[38, 128, 34], [70, 96, 42], [96, 128, 40], [60, 146, 30]]
      : [[132, 92, 40], [164, 126, 34], [118, 136, 38], [148, 148, 28]];
  return (
    <svg className={styles.bushArt} viewBox="0 0 200 200" aria-hidden="true">
      {(['R', 'L'] as const).map((side) => (
        <g key={side} className={side === 'L' ? styles.halfL : styles.halfR}>
          {puffs(side).map(([x, y, r]) => (
            <circle key={`s${x}`} cx={x + 2} cy={y + 8} r={r} {...fill('scene-cloud-shade')} />
          ))}
          {puffs(side).map(([x, y, r]) => (
            <circle key={`c${x}`} cx={x} cy={y} r={r} {...fill('world-cloud')} />
          ))}
          {puffs(side).slice(0, 2).map(([x, y, r]) => (
            <circle key={`h${x}`} cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.35} {...fill('paper', 0.9)} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** Con sóng có bọt trắng (biển): hai ngọn sóng rẽ ra hai bên. */
function WaveArt() {
  const wave = (x0: number) =>
    `M${x0} 200 L${x0} 120 Q${x0 + 10} 60 ${x0 + 56} 64 Q${x0 + 96} 68 ${x0 + 92} 104 Q${x0 + 74} 92 ${x0 + 66} 110 Q${x0 + 96} 120 ${x0 + 104} 160 L${x0 + 104} 200 Z`;
  return (
    <svg className={styles.bushArt} viewBox="0 0 200 200" aria-hidden="true">
      {(['R', 'L'] as const).map((side) => {
        const x0 = side === 'L' ? -4 : 96;
        return (
          <g key={side} className={side === 'L' ? styles.halfL : styles.halfR}>
            <path d={wave(x0 + 4)} transform="translate(0 8)" {...fill('world-sea-deep')} />
            <path d={wave(x0)} {...fill('world-sea-top')} />
            <path d={`M${x0 + 14} 96 Q${x0 + 24} 70 ${x0 + 56} 72 Q${x0 + 84} 74 ${x0 + 86} 98`} className={styles.foam} />
            <circle cx={x0 + 90} cy={100} r={7} {...fill('paper')} />
            <circle cx={x0 + 78} cy={112} r={5} {...fill('world-bubble')} />
          </g>
        );
      })}
    </svg>
  );
}

function CoverArt({ cover }: { cover: Cover }) {
  if (cover === 'cloud') return <CloudArt />;
  if (cover === 'wave') return <WaveArt />;
  return <LushBush />;
}

// Lá bay ra khi bụi rung / rẽ: [dx, dy, góc]
const FLY_LEAVES: [number, number, number][] = [
  [-80, -40, -160],
  [70, -64, 140],
  [-26, -96, -70],
  [90, -10, 210],
];

interface BushProps {
  index: number;
  cover: Cover;
  hasAnimal: boolean;
  animalId: AnimalId;
  state: BushState;
  showHint: boolean;
  onTap: () => void;
  isWiggling: boolean;
}

function Bush({ index, cover, hasAnimal, animalId, state, showHint, onTap, isWiggling }: BushProps) {
  const bushClass = [
    styles.bush,
    state === 'shake' ? styles.shake : '',
    state === 'split' ? styles.split : '',
    isWiggling && state === 'idle' ? styles.wiggle : '',
  ]
    .filter(Boolean)
    .join(' ');

  // Thú: trốn sau bụi / ló tai (gợi ý 2 ván đầu). Khi tìm thấy, thú phóng to ra giữa màn hình (Reveal).
  const animalState = showHint && state === 'idle' ? 'peek' : 'hidden';

  return (
    <div className={`${styles.bushContainer} ${index % 2 ? styles.back : ''}`} data-cover={cover}>
      {hasAnimal && (
        <img
          key={animalId}
          className={styles.animal}
          data-state={animalState}
          src={`${BASE}cards/${animalId}.png`}
          alt=""
          draggable={false}
        />
      )}

      <button
        type="button"
        className={bushClass}
        data-testid={`bush-${index}`}
        aria-label={`Bụi cây ${index + 1}`}
        onPointerDown={onTap}
      >
        <CoverArt cover={cover} />
      </button>

      {state !== 'idle' && (
        <div className={styles.flyLeaves} aria-hidden="true">
          {FLY_LEAVES.map(([dx, dy, r]) => (
            <span
              key={`${dx}-${dy}`}
              className={styles.flyLeaf}
              style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, '--r': `${r}deg` } as CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Thú tìm thấy: bay từ bụi lên giữa màn hình, phóng to, lắc lư khi kêu rồi về lại bụi. */
function Reveal({ animalId, bushIndex, bushCount }: { animalId: AnimalId; bushIndex: number; bushCount: number }) {
  const fromX = (bushIndex - (bushCount - 1) / 2) * BUSH_STEP;
  const fromY = BUSH_RISE + (bushIndex % 2 ? 40 : 0);
  return (
    <div className={styles.reveal} data-testid="peek-reveal" data-animal={animalId} aria-hidden="true">
      <div className={styles.revealGlow} />
      <img
        className={styles.revealAnimal}
        src={`${BASE}cards/${animalId}.png`}
        alt=""
        draggable={false}
        style={{ '--from-x': `${fromX}px`, '--from-y': `${fromY}px` } as CSSProperties}
      />
    </div>
  );
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [roundNumber, setRoundNumber] = useState(0);
  const [gameState, setGameState] = useState<PeekState | null>(null);
  const [bushStates, setBushStates] = useState<BushState[]>([]);
  const [wigglingBush, setWigglingBush] = useState<number | null>(null);
  const [reveal, setReveal] = useState<{ animalId: AnimalId; bushIndex: number } | null>(null);
  const roundRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const bushCount = bushCountForAge(ageMonths);
  const hintRounds = hintRoundsForAge(ageMonths);
  const wiggleMs = wiggleMsForAge(ageMonths);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker]
  );

  // Clear all timeouts on unmount
  useEffect(() => {
    return () => {
      for (const t of timeoutsRef.current) clearTimeout(t);
    };
  }, []);

  // Start new round
  const startNewRound = useCallback(
    (prevId?: AnimalId) => {
      const seed = Date.now();
      const state = newRound(bushCount, seed, prevId, FORCE_COVER);
      setGameState(state);
      setBushStates(Array(bushCount).fill('idle'));
      setReveal(null);
      roundRef.current += 1;
      setRoundNumber(roundRef.current);
    },
    [bushCount]
  );

  // Initialize game
  useEffect(() => {
    say('peek.hello');
    startNewRound();
  }, [say, startNewRound]);

  // Wiggle the hiding bush every 3s (only when idle)
  useEffect(() => {
    if (!gameState || gameState.found) return;

    const wiggle = () => {
      if (gameState && !gameState.found) {
        setWigglingBush(gameState.hidingBush);
        const t = setTimeout(() => setWigglingBush(null), 400);
        timeoutsRef.current.push(t);
      }
    };

    const interval = setInterval(wiggle, wiggleMs);
    return () => clearInterval(interval);
  }, [gameState, wiggleMs]);

  // Handle bush tap
  const handleTap = useCallback(
    (bushIndex: number) => {
      if (!gameState || gameState.found) return;

      const result = tap(gameState, bushIndex);

      if (result === 'empty') {
        // Bụi lắc 400ms
        setBushStates((prev) => {
          const next = [...prev];
          next[bushIndex] = 'shake';
          return next;
        });
        say('peek.empty');

        const t = setTimeout(() => {
          setBushStates((prev) => {
            const next = [...prev];
            next[bushIndex] = 'idle';
            return next;
          });
        }, 400);
        timeoutsRef.current.push(t);
      } else {
        // Tìm thấy!
        setGameState((prev) => (prev ? { ...prev, found: true } : null));

        // Bụi rẽ lá, thú bay ra giữa màn hình và phóng to
        setBushStates((prev) => {
          const next = [...prev];
          next[bushIndex] = 'split';
          return next;
        });
        setReveal({ animalId: gameState.animalId, bushIndex });

        // Nói "Ú òa!", rồi tên thú, rồi tiếng kêu thật của thú
        say('peek.found');

        const t1 = setTimeout(() => {
          say(`animal.${gameState.animalId}`);
        }, NAME_AT);
        timeoutsRef.current.push(t1);

        const t2 = setTimeout(() => {
          say(`animal.${gameState.animalId}-sound`);
        }, SOUND_AT);
        timeoutsRef.current.push(t2);

        // Thú về lại bụi xong thì sang ván mới
        const t3 = setTimeout(() => {
          startNewRound(gameState.animalId);
        }, REVEAL_MS);
        timeoutsRef.current.push(t3);
      }
    },
    [gameState, say, startNewRound]
  );

  // E2E hook
  useEffect(() => {
    if (IS_E2E && gameState) {
      (window as Window & { __behocPeek?: { answer(): number } }).__behocPeek = {
        answer: () => gameState.hidingBush,
      };
      return () => {
        delete (window as Window & { __behocPeek?: { answer(): number } }).__behocPeek;
      };
    }
  }, [gameState]);

  const showHint = roundNumber <= hintRounds; // vài ván đầu thú ló tai gợi ý (bé nhỏ được lâu hơn)
  const cover = gameState?.cover ?? 'bush';

  return (
    <div
      data-testid="game-peekaboo"
      data-last-say={lastSay || undefined}
      data-cover={cover}
      className={styles.container}
    >
      {/* Khu vườn (bụi), bầu trời (mây) hoặc biển (sóng) */}
      {cover === 'bush' && <Scenery variant="garden" />}
      {cover === 'cloud' && (
        <div className={styles.skyScene} aria-hidden="true">
          <span className={styles.skySun} />
        </div>
      )}
      {cover === 'wave' && (
        <div className={styles.seaScene} aria-hidden="true">
          <span className={styles.skySun} />
          <span className={styles.seaWater} />
        </div>
      )}

      {/* Khu vực chỗ núp */}
      <div className={styles.bushArea} data-cover={cover}>
        {gameState &&
          Array.from({ length: bushCount }, (_, i) => (
            <Bush
              key={i}
              index={i}
              cover={gameState.cover}
              hasAnimal={i === gameState.hidingBush}
              animalId={gameState.animalId}
              state={bushStates[i] || 'idle'}
              showHint={showHint && i === gameState.hidingBush}
              onTap={() => handleTap(i)}
              isWiggling={wigglingBush === i}
            />
          ))}
      </div>

      {reveal && (
        <Reveal
          key={roundNumber}
          animalId={reveal.animalId}
          bushIndex={reveal.bushIndex}
          bushCount={bushCount}
        />
      )}

      <BackHome onExit={onExit} />
    </div>
  );
}
