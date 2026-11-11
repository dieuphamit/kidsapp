import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { bushCountForAge, newRound, tap, type PeekState, type AnimalId } from './logic';
import styles from './Game.module.css';

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');

// Ảnh emoji cho mỗi con vật - dùng emoji đơn giản cho 2.5D CSS
const ANIMAL_EMOJI: Record<AnimalId, string> = {
  // Farm
  cow: '🐄',
  chicken: '🐔',
  duck: '🦆',
  pig: '🐷',
  dog: '🐕',
  sheep: '🐑',
  horse: '🐴',
  rabbit: '🐰',
  // Wild
  elephant: '🐘',
  giraffe: '🦒',
  lion: '🦁',
  tiger: '🐯',
  monkey: '🐵',
  panda: '🐼',
  penguin: '🐧',
  koala: '🐨',
  fox: '🦊',
  bear: '🐻‍❄️',
  parrot: '🦜',
  fish: '🐟',
};

// Vị trí bụi so le (y offset, x spacing)
function getBushPositions(count: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const totalWidth = (count - 1) * 220; // 220px giữa các bụi
  const startX = -totalWidth / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + i * 220,
      y: i % 2 === 0 ? 0 : 20, // so le nhẹ
    });
  }
  return positions;
}

type BushState = 'idle' | 'shake' | 'split';

interface BushProps {
  index: number;
  position: { x: number; y: number };
  hasAnimal: boolean;
  animalEmoji: string;
  state: BushState;
  showHint: boolean;
  onTap: () => void;
  isWiggling: boolean;
}

function Bush({ index, position, hasAnimal, animalEmoji, state, showHint, onTap, isWiggling }: BushProps) {
  const bushClass = [
    styles.bush,
    state === 'shake' ? styles.shake : '',
    state === 'split' ? styles.split : '',
    isWiggling && state === 'idle' ? styles.wiggle : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={styles.bushContainer}
      style={{
        transform: `translateX(${position.x}px) translateY(${position.y}px)`,
      }}
    >
      {/* Con vật đằng sau */}
      <div className={`${styles.animal} ${state === 'split' ? styles.animalJump : ''}`}>
        <span className={styles.animalEmoji}>{animalEmoji}</span>
      </div>

      {/* Bụi cây */}
      <button
        type="button"
        className={bushClass}
        data-testid={`bush-${index}`}
        aria-label={`Bụi cây ${index + 1}`}
        onPointerDown={onTap}
      >
        {/* Gợi ý: phần thú lấp ló (chỉ hiện 2 ván đầu và bụi có thú) */}
        {showHint && hasAnimal && state === 'idle' && (
          <div className={styles.hint}>
            <span className={styles.hintEmoji}>{animalEmoji}</span>
          </div>
        )}
      </button>
    </div>
  );
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [lastSay, setLastSay] = useState('');
  const [roundNumber, setRoundNumber] = useState(0);
  const [gameState, setGameState] = useState<PeekState | null>(null);
  const [bushStates, setBushStates] = useState<BushState[]>([]);
  const [wigglingBush, setWigglingBush] = useState<number | null>(null);
  const roundRef = useRef(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const bushCount = bushCountForAge(ageMonths);
  const bushPositions = getBushPositions(bushCount);

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
      const state = newRound(bushCount, seed, prevId);
      setGameState(state);
      setBushStates(Array(bushCount).fill('idle'));
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

    const interval = setInterval(wiggle, 3000);
    return () => clearInterval(interval);
  }, [gameState]);

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

        // Bụi tách, thú nhảy lên
        setBushStates((prev) => {
          const next = [...prev];
          next[bushIndex] = 'split';
          return next;
        });

        // Nói "Ú òa!"
        say('peek.found');

        // 900ms sau nói tên thú
        const t1 = setTimeout(() => {
          say(`animal.${gameState.animalId}`);
        }, 900);
        timeoutsRef.current.push(t1);

        // 2.5s sau ván mới
        const t2 = setTimeout(() => {
          startNewRound(gameState.animalId);
        }, 2500);
        timeoutsRef.current.push(t2);
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

  const showHint = roundNumber <= 2; // 2 ván đầu có gợi ý

  return (
    <div
      data-testid="game-peekaboo"
      data-last-say={lastSay || undefined}
      className={styles.container}
    >
      {/* Đồng cỏ */}
      <div className={styles.grass} />

      {/* Khu vực bụi */}
      <div className={styles.bushArea}>
        {gameState &&
          bushPositions.map((pos, i) => (
            <Bush
              key={i}
              index={i}
              position={pos}
              hasAnimal={i === gameState.hidingBush}
              animalEmoji={ANIMAL_EMOJI[gameState.animalId]}
              state={bushStates[i] || 'idle'}
              showHint={showHint && i === gameState.hidingBush}
              onTap={() => handleTap(i)}
              isWiggling={wigglingBush === i}
            />
          ))}
      </div>

      <BackHome onExit={onExit} />
    </div>
  );
}
