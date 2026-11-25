import { useState, useEffect, useCallback, useRef } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { useSayThen } from '../../ui/useSayThen';
import {
  newRound,
  flip,
  hideFlipped,
  isDone,
  reveal,
  startLevel,
  loadLevel,
  saveLevel,
  progressLevel,
  ALL_CARDS,
  type GameState,
} from './logic';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { pictureSayKey, pictureUrl } from '../../content/pictures';
import styles from './Game.module.css';

// Grid layout based on number of pairs
function getLayout(pairs: number): string {
  switch (pairs) {
    case 2: return '2x2';
    case 3: return '3x2';
    case 4: return '4x2';
    case 6: return '4x3';
    default: return '2x2';
  }
}

/** Độ dài ước lượng một câu khi loa không báo được lúc hết tiếng (test); loa thật chờ câu trước phát hết. */
const SAY_MS = 1200;
/** Khen xong chừng này thì sang ván mới. */
const NEXT_ROUND_MS = 1000;

export default function Game({ speaker, ageMonths, options, onExit }: GameProps) {
  const difficulty = options?.difficulty ?? 'auto';
  const topic = options?.topic ?? 'mix';
  const [state, setState] = useState<GameState | null>(null);
  const [lastSay, setLastSay] = useState('');
  // null cho tới khi đọc xong cấp đã lưu, để không bày một ván thừa rồi đổi ngay
  const [level, setLevel] = useState<number | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showStars, setShowStars] = useState(false);
  const [wins, setWins] = useState(0);
  const [justMatched, setJustMatched] = useState<number[]>([]);
  const processing = useRef(false);
  const isE2E = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1';

  const say = useCallback((key: string) => {
    speaker.say(key);
    setLastSay(key);
  }, [speaker]);
  const sayAll = useSayThen(speaker, setLastSay);

  // Mọi hẹn giờ gom lại, xoá khi thoát trò (không còn giọng đọc phát sau khi bé về nhà)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Initialize level from storage or age
  useEffect(() => {
    loadLevel().then((saved) => {
      // Bố mẹ chọn độ khó cố định thì bắt đầu theo độ khó đó, không theo cấp đã lưu
      if (saved !== null && difficulty === 'auto') {
        setLevel(saved);
      } else {
        setLevel(startLevel(ageMonths));
      }
    });
  }, [ageMonths, difficulty]);

  // Start new round when level or cards change
  useEffect(() => {
    if (level === null) return;
    const seed = Date.now();
    // Trí nhớ ngắn: ưu tiên thẻ khác ván vừa chơi
    const newState = newRound(level, seed, ALL_CARDS, topic, recentPicks<string>('memory'));
    rememberPicks('memory', newState.cards.map((c) => c.id), 1);
    newState.wins = wins;
    setState(newState);
    setShowPreview(true);
    setJustMatched([]);
    processing.current = false;

    // Say hello on first play of a level
    const hello = setTimeout(() => say('memory.hello'), 500);

    // Hide preview after 2s
    const timer = setTimeout(() => {
      setShowPreview(false);
    }, 2000);

    return () => {
      clearTimeout(hello);
      clearTimeout(timer);
    };
  }, [level, wins, say, topic]);

  // Expose reveal function for e2e testing
  useEffect(() => {
    if (isE2E && state) {
      (window as Window & { __behocMemory?: { reveal(): string[] } }).__behocMemory = {
        reveal: () => reveal(state),
      };
    }
    return () => {
      if (isE2E) {
        delete (window as Window & { __behocMemory?: unknown }).__behocMemory;
      }
    };
  }, [isE2E, state]);

  const handleCardClick = useCallback((index: number) => {
    if (!state || showPreview || processing.current) return;

    const card = state.cards[index];
    if (card.flipped || card.matched) return;

    // Immediate feedback
    const result = flip(state, index);
    if (result === 'invalid') return;

    setState({ ...state });

    if (result !== 'match') {
      // Say card name
      say(pictureSayKey(card.id));
    }

    if (result === 'first') {
      return;
    }

    processing.current = true;

    if (result === 'match') {
      // Match!
      const [idx1, idx2] = [state.flippedIndices[0], index];
      setJustMatched([idx1, idx2]);
      const done = isDone(state);
      // Đọc tên thẻ cho hết rồi mới "Giống nhau rồi!"; xong ván thì khen sau cùng, khen xong mới sang ván mới
      sayAll([pictureSayKey(card.id), 'memory.match', ...(done ? ['memory.done'] : [])], {
        fallbackMs: SAY_MS,
        onDone: () => {
          if (!done) return;
          const { newLevel, wins: newWins } = progressLevel(state);
          if (newLevel !== level) {
            saveLevel(newLevel);
          }
          later(() => {
            setShowStars(false);
            setLevel(newLevel);
            setWins(newWins);
          }, NEXT_ROUND_MS);
        },
      });

      later(() => {
        setJustMatched([]);
        if (done) {
          // Round complete!
          later(() => setShowStars(true), 500);
        } else {
          processing.current = false;
        }
      }, 300);
    } else {
      // No match - wait 1.2s then hide
      later(() => {
        hideFlipped(state);
        setState({ ...state });
        processing.current = false;
      }, 1200);
    }
  }, [state, showPreview, say, sayAll, later, level]);

  if (!state) {
    return <div className={styles.scene} data-testid="game-memory" data-last-say="" data-level="0" />;
  }

  const pairs = state.cards.length / 2;
  const layout = getLayout(pairs);
  const isSmall = pairs === 6;

  return (
    <div
      className={styles.scene}
      data-testid="game-memory"
      data-last-say={lastSay}
      data-level={level}
    >
      <BackHome onExit={onExit} />

      <div className={styles.grid} data-layout={layout}>
        {state.cards.map((card, index) => {
          const isFlipped = card.flipped || card.matched || showPreview;
          const isMatched = card.matched || justMatched.includes(index);
          const isPreviewFade = !showPreview && !card.flipped && !card.matched;

          return (
            <div
              key={index}
              className={`${styles.card} ${isPreviewFade ? styles.previewFade : ''}`}
              data-flipped={isFlipped}
              data-matched={isMatched && card.matched}
              data-small={isSmall}
              onPointerDown={() => handleCardClick(index)}
            >
              <div className={styles.cardInner}>
                <div className={styles.cardFace + ' ' + styles.cardBack}>
                  <span className={styles.pawPrint}>🐾</span>
                </div>
                <div className={styles.cardFace + ' ' + styles.cardFront}>
                  <img
                    className={styles.cardImage}
                    src={pictureUrl(card.id)}
                    alt={card.id}
                    draggable={false}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showStars && (
        <div className={styles.stars}>
          {[...Array(12)].map((_, i) => (
            <span
              key={i}
              className={styles.star}
              style={{
                left: `${5 + i * 8}%`,
                top: `${30 + (i % 3) * 15}%`,
                animationDelay: `${i * 80}ms`,
              }}
            >
              ⭐
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
