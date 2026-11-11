import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../core/games';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { newQuestion, choiceCountForAge, type FarmAnimal, type QuizQuestion } from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

interface CardState {
  animClass: string;
  sparkles: { id: number; x: number; y: number }[];
}

export default function Game({ speaker, ageMonths, onExit }: GameProps) {
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [lastSay, setLastSay] = useState('');
  const [cardStates, setCardStates] = useState<Map<FarmAnimal, CardState>>(new Map());
  const [locked, setLocked] = useState(false);
  const prevIdRef = useRef<FarmAnimal | undefined>(undefined);
  const sparkleIdRef = useRef(0);
  const isFirstRef = useRef(true);
  const isE2E = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('e2e');

  // Expose answer for E2E testing
  useEffect(() => {
    if (isE2E && question) {
      (window as Window & { __behocQuiz?: { answer(): string } }).__behocQuiz = {
        answer: () => question.answer,
      };
    }
    return () => {
      if (isE2E) {
        delete (window as Window & { __behocQuiz?: { answer(): string } }).__behocQuiz;
      }
    };
  }, [isE2E, question]);

  const saySpeaker = useCallback((key: string) => {
    speaker.say(key);
    setLastSay(key);
  }, [speaker]);

  const playSoundKey = useCallback(() => {
    if (question) {
      saySpeaker(`animal.${question.answer}-sound`);
    }
  }, [question, saySpeaker]);

  const generateNewQuestion = useCallback(() => {
    const count = choiceCountForAge(ageMonths);
    const seed = Date.now();
    const q = newQuestion(count, seed, prevIdRef.current);
    setQuestion(q);
    prevIdRef.current = q.answer;
    setCardStates(new Map());
    setLocked(false);
    return q;
  }, [ageMonths]);

  // Initialize quiz on mount
  useEffect(() => {
    const q = generateNewQuestion();
    // Say hello only on first question
    if (isFirstRef.current) {
      isFirstRef.current = false;
      saySpeaker('quiz.hello');
      // Play sound after hello
      const timer = setTimeout(() => {
        saySpeaker(`animal.${q.answer}-sound`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCorrect = useCallback((animal: FarmAnimal, cardEl: HTMLButtonElement) => {
    setLocked(true);

    // Create sparkles
    const rect = cardEl.getBoundingClientRect();
    const newSparkles: { id: number; x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      newSparkles.push({
        id: sparkleIdRef.current++,
        x: Math.random() * rect.width,
        y: Math.random() * rect.height,
      });
    }

    setCardStates((prev) => {
      const next = new Map(prev);
      next.set(animal, { animClass: styles.cardBounce, sparkles: newSparkles });
      return next;
    });

    // Say animal name then "great"
    saySpeaker(`animal.${animal}`);
    setTimeout(() => {
      saySpeaker('ui.great');
    }, 1200);

    // New question after 2s
    setTimeout(() => {
      const q = generateNewQuestion();
      // Play new sound
      setTimeout(() => {
        saySpeaker(`animal.${q.answer}-sound`);
      }, 500);
    }, 2000);
  }, [generateNewQuestion, saySpeaker]);

  const handleWrong = useCallback((animal: FarmAnimal) => {
    setCardStates((prev) => {
      const next = new Map(prev);
      next.set(animal, { animClass: styles.cardShake, sparkles: [] });
      return next;
    });

    // Say "again" then replay sound
    saySpeaker('quiz.again');
    setTimeout(() => {
      playSoundKey();
    }, 1200);

    // Clear animation after it finishes
    setTimeout(() => {
      setCardStates((prev) => {
        const next = new Map(prev);
        next.delete(animal);
        return next;
      });
    }, 400);
  }, [saySpeaker, playSoundKey]);

  const handleCardPress = useCallback((animal: FarmAnimal, e: React.PointerEvent<HTMLButtonElement>) => {
    if (locked || !question) return;

    const cardEl = e.currentTarget;

    if (animal === question.answer) {
      handleCorrect(animal, cardEl);
    } else {
      handleWrong(animal);
    }
  }, [locked, question, handleCorrect, handleWrong]);

  if (!question) return null;

  return (
    <div className={styles.container} data-testid="game-sound-quiz" data-last-say={lastSay}>
      {/* Sân trại: đồi, kho thóc, hàng rào */}
      <Scenery variant="farm" />

      <ClayButton
        color="lilac"
        label="Về nhà"
        onPress={onExit}
        size={120}
        style={{ position: 'absolute', top: 24, left: 24, zIndex: 2 }}
      >
        🏠
      </ClayButton>

      <div className={styles.topRow}>
        <ClayButton
          color="peach"
          label="Nghe lại"
          onPress={playSoundKey}
          size={160}
        >
          🔊
        </ClayButton>
      </div>

      <div className={styles.cardsRow}>
        {question.choices.map((animal) => {
          const state = cardStates.get(animal);
          return (
            <button
              key={animal}
              type="button"
              className={`${styles.card} ${state?.animClass ?? ''}`}
              aria-label={animal}
              data-testid={`card-${animal}`}
              onPointerDown={(e) => handleCardPress(animal, e)}
            >
              <img
                src={`${BASE}cards/${animal}.png`}
                alt={animal}
                className={styles.cardImg}
                draggable={false}
              />
              {state?.sparkles.map((s) => (
                <span
                  key={s.id}
                  className={styles.sparkle}
                  style={{ left: s.x, top: s.y }}
                />
              ))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
