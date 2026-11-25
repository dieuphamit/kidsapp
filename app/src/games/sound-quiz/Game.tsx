import { useState, useEffect, useRef, useCallback } from 'react';
import type { GameProps } from '../../core/games';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import { recentPicks, rememberPicks } from '../../core/gameOptions';
import { pictureUrl } from '../../content/pictures';
import { useSayThen } from '../../ui/useSayThen';
import { useBuddyLook } from '../../ui/buddyContext';
import { newQuestion, choiceCountForAge, isRoundEnd, ANSWER_MEMORY, type SoundAnimal, type QuizQuestion } from './logic';
import styles from './Game.module.css';

/**
 * Các số dưới đây là độ dài ước lượng của từng câu, chỉ dùng khi loa không báo được lúc hết
 * tiếng (test unit). Loa thật chờ câu trước phát hết rồi mới nói câu sau.
 */
const HELLO_SAY_MS = 1500;
const NAME_SAY_MS = 1200;
const AGAIN_SAY_MS = 1200;
/** Khen xong chừng này thì ra câu mới; câu mới hiện chừng này thì phát tiếng kêu. */
const NEXT_MS = 500;
const NEXT_SOUND_MS = 500;
/** Ăn mừng sau mỗi lượt: câu chúc mừng dài chừng này (loa giả), nói xong nghỉ chút rồi chơi tiếp. */
const PARTY_SAY_MS = 3200;
const PARTY_REST_MS = 900;
const DONE_KEY = 'quiz.done';

interface CardState {
  animClass: string;
  sparkles: { id: number; x: number; y: number }[];
}

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [question, setQuestion] = useState<QuizQuestion | null>(null);
  const [lastSay, setLastSay] = useState('');
  const [cardStates, setCardStates] = useState<Map<SoundAnimal, CardState>>(new Map());
  const [locked, setLocked] = useState(false);
  const [party, setParty] = useState(false);
  /** Số câu đúng từ lúc vào trò: chỉ để biết lúc nào ăn mừng, không hiện ra cho bé. */
  const correct = useRef(0);
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
  const sayAll = useSayThen(speaker, setLastSay);

  // Mọi hẹn giờ gom lại, xoá khi thoát trò (không còn giọng đọc phát sau khi bé về nhà)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const playSoundKey = useCallback(() => {
    if (question) {
      saySpeaker(`animal.${question.answer}-sound`);
    }
  }, [question, saySpeaker]);

  const generateNewQuestion = useCallback(() => {
    const count = choiceCountForAge(ageMonths);
    // Trí nhớ ngắn: không ra lại con vật của vài ván gần đây (kể cả lần vào trò trước)
    const q = newQuestion(count, undefined, recentPicks<SoundAnimal>('sound-quiz'));
    rememberPicks('sound-quiz', [q.answer], ANSWER_MEMORY);
    setQuestion(q);
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
      // Câu chào nói hết rồi mới phát tiếng kêu
      sayAll(['quiz.hello', `animal.${q.answer}-sound`], { fallbackMs: HELLO_SAY_MS });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCorrect = useCallback((animal: SoundAnimal, cardEl: HTMLButtonElement) => {
    setLocked(true);

    // Create sparkles
    // Kích thước trong khung Stage (không dùng getBoundingClientRect vì khung bị co giãn/xoay)
    const w = cardEl.offsetWidth;
    const h = cardEl.offsetHeight;
    const newSparkles: { id: number; x: number; y: number }[] = [];
    for (let i = 0; i < 4; i++) {
      newSparkles.push({
        id: sparkleIdRef.current++,
        x: Math.random() * w,
        y: Math.random() * h,
      });
    }

    setCardStates((prev) => {
      const next = new Map(prev);
      next.set(animal, { animClass: styles.cardBounce, sparkles: newSparkles });
      return next;
    });

    const nextQuestion = () => {
      setParty(false);
      const q = generateNewQuestion();
      later(() => saySpeaker(`animal.${q.answer}-sound`), NEXT_SOUND_MS);
    };
    const roundEnd = isRoundEnd(++correct.current);

    // Đọc tên con vật cho hết rồi mới khen; khen xong mới ra câu mới (hoặc ăn mừng cuối lượt)
    sayAll([`animal.${animal}`, 'ui.great'], {
      fallbackMs: NAME_SAY_MS,
      onDone: () =>
        later(() => {
          if (!roundEnd) {
            nextQuestion();
            return;
          }
          // Hết một lượt: bạn đồng hành nhảy mừng, rồi chơi tiếp
          setParty(true);
          sayAll([DONE_KEY], { fallbackMs: PARTY_SAY_MS, onDone: () => later(nextQuestion, PARTY_REST_MS) });
        }, NEXT_MS),
    });
  }, [generateNewQuestion, saySpeaker, sayAll, later]);

  const handleWrong = useCallback((animal: SoundAnimal) => {
    setCardStates((prev) => {
      const next = new Map(prev);
      next.set(animal, { animClass: styles.cardShake, sparkles: [] });
      return next;
    });

    // "Nghe lại nào!" nói hết rồi mới phát lại tiếng kêu
    if (question) sayAll(['quiz.again', `animal.${question.answer}-sound`], { fallbackMs: AGAIN_SAY_MS });

    // Clear animation after it finishes
    later(() => {
      setCardStates((prev) => {
        const next = new Map(prev);
        next.delete(animal);
        return next;
      });
    }, 400);
  }, [question, sayAll, later]);

  const handleCardPress = useCallback((animal: SoundAnimal, e: React.PointerEvent<HTMLButtonElement>) => {
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
    <div className={styles.container} data-testid="game-sound-quiz" data-last-say={lastSay} data-party={party ? '' : undefined}>
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
                src={pictureUrl(animal)}
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

      {/* Ăn mừng sau mỗi lượt: bạn đồng hành nhảy, sao bay; không điểm số */}
      {party && (
        <div className={styles.party} data-testid="party">
          <img src={buddy.img} alt={buddy.name} className={styles.partyBuddy} draggable={false} />
          {[...Array(10)].map((_, k) => (
            <span key={k} className={styles.partyStar} style={{ left: `${8 + k * 9}%`, animationDelay: `${(k % 5) * 180}ms` }} aria-hidden="true">
              {k % 2 ? '⭐' : '🎵'}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
