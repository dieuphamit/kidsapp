import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { Scenery } from '../../ui/Scenery';
import type { ClayColor } from '../../core/tokens';
import {
  TOPIC_IDS,
  TOPIC_COVER,
  thingsOf,
  newDeck,
  currentCard,
  nextCard,
  prevCard,
  shouldQuiz,
  makeQuiz,
  answer,
  afterQuiz,
  findCountForAge,
  quizLayout,
  topicLayout,
  VIEW_CARD,
  PREV_BOX,
  NEXT_BOX,
  HELLO_KEY,
  FIND_KEY,
  topicKey,
  nameKey,
  askKey,
  thisKey,
  yesKey,
  soundKey,
  cardPath,
  type Box,
  type Deck,
  type Quiz,
  type TopicId,
} from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
const img = (id: string) => `${BASE}${cardPath(id)}`;

/** Đọc tên rồi mới phát tiếng thật của xe. */
const SOUND_AFTER_MS = 1300;
/** Tên chủ đề rồi tới tên thẻ đầu. */
const TOPIC_SAY_MS = 1200;
/** "Giờ mình chơi tìm thẻ nhé!" rồi mới hỏi. */
const FIND_ASK_MS = 1800;
/** Chạm sai: thẻ nói tên mình, sau đó thẻ đúng nhún gợi ý và hỏi lại. */
const HINT_MS = 1700;
/** Chạm đúng: ăn mừng bao lâu rồi về xem thẻ kế. */
const WIN_MS = 3400;

type Phase = 'topics' | 'view' | 'quiz';

const TOPIC_COLOR: Record<TopicId, ClayColor> = { clothes: 'peach', kitchen: 'mint', vehicles: 'butter', home: 'lilac' };

declare global {
  interface Window {
    __behocWords?: {
      phase(): Phase;
      card(): string | null;
      quiz(): Quiz | null;
      topic(): TopicId | null;
    };
  }
}

const boxStyle = (b: Box): CSSProperties => ({ left: b.x, top: b.y, width: b.size, height: b.size });

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const [phase, setPhase] = useState<Phase>('topics');
  const [deck, setDeck] = useState<Deck | null>(null);
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [won, setWon] = useState(false);
  const [lastSay, setLastSay] = useState('');
  /** Bộ đếm để chạy lại hoạt ảnh: thẻ nhún khi chạm; thẻ nói tên; thẻ đúng gợi ý. */
  const [bounce, setBounce] = useState<{ id: string; n: number } | null>(null);
  const [hint, setHint] = useState(0);
  const [pressed, setPressed] = useState<string | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const cancelLater = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  /** Đọc tên thẻ, xe cộ thì phát thêm tiếng thật. */
  const sayCard = useCallback(
    (id: string, delay = 0) => {
      const run = () => {
        say(nameKey(id));
        const s = soundKey(id);
        if (s) later(() => say(s), SOUND_AFTER_MS);
      };
      if (delay) later(run, delay);
      else run();
    },
    [say, later],
  );

  // Câu chào
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(HELLO_KEY);
  }, [say]);

  // Tải trước ảnh thẻ của chủ đề đang chơi để lật thẻ không bị trống
  useEffect(() => {
    if (!deck) return;
    for (const t of thingsOf(deck.topic)) {
      const im = new Image();
      im.src = img(t.id);
    }
  }, [deck?.topic]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickTopic = (topic: TopicId) => {
    cancelLater();
    const d = newDeck(topic);
    setDeck(d);
    setQuiz(null);
    setWon(false);
    setPhase('view');
    say(topicKey(topic));
    sayCard(currentCard(d), TOPIC_SAY_MS);
  };

  const backToTopics = () => {
    cancelLater();
    setPhase('topics');
    setQuiz(null);
    setWon(false);
    say(HELLO_KEY);
  };

  const showCard = (d: Deck) => {
    cancelLater();
    setDeck(d);
    setPhase('view');
    sayCard(currentCard(d));
  };

  const goNext = () => {
    if (!deck) return;
    if (shouldQuiz(deck, ageMonths)) {
      cancelLater();
      const q = makeQuiz(deck, findCountForAge(ageMonths), Math.random, currentCard(deck));
      setQuiz(q);
      setWon(false);
      setHint(0);
      setPhase('quiz');
      say(FIND_KEY);
      later(() => say(askKey(q.target)), FIND_ASK_MS);
      return;
    }
    showCard(nextCard(deck));
  };

  const goPrev = () => {
    if (deck) showCard(prevCard(deck));
  };

  const tapCard = () => {
    if (!deck) return;
    const id = currentCard(deck);
    cancelLater();
    setBounce({ id, n: Date.now() });
    sayCard(id);
  };

  const tapChoice = (id: string) => {
    if (!quiz || !deck || won) return;
    cancelLater();
    setBounce({ id, n: Date.now() });
    if (answer(quiz, id) === 'ok') {
      setWon(true);
      say(yesKey(id));
      const s = soundKey(id);
      if (s) later(() => say(s), 1700);
      later(() => {
        setQuiz(null);
        setWon(false);
        showCard(afterQuiz(deck));
      }, WIN_MS);
      return;
    }
    // Không âm báo sai: thẻ vừa chạm tự nói tên, rồi thẻ đúng nhún nhẹ và hỏi lại
    say(thisKey(id));
    later(() => {
      setHint((n) => n + 1);
      say(askKey(quiz.target));
    }, HINT_MS);
  };

  // Móc cho e2e (?e2e=1)
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocWords = {
      phase: () => phase,
      card: () => (deck && phase === 'view' ? currentCard(deck) : null),
      quiz: () => (quiz ? { target: quiz.target, choices: [...quiz.choices] } : null),
      topic: () => deck?.topic ?? null,
    };
    return () => {
      delete window.__behocWords;
    };
  });

  const press = (id: string) => ({
    'data-pressed': pressed === id ? '' : undefined,
    onPointerUp: () => setPressed(null),
    onPointerLeave: () => setPressed(null),
    onPointerCancel: () => setPressed(null),
  });

  const card = deck && phase === 'view' ? currentCard(deck) : null;
  const slots = quiz ? quizLayout(quiz.choices.length) : [];

  return (
    <div className={styles.scene} data-testid="game-words" data-phase={phase} data-last-say={lastSay} data-lang={lang}>
      <Scenery variant="room" />
      <BackHome onExit={onExit} />

      {phase !== 'topics' && deck && (
        <ClayButton
          color={TOPIC_COLOR[deck.topic]}
          size={120}
          label="Chọn chủ đề"
          onPress={backToTopics}
          style={{ position: 'fixed', top: 24, left: 168, zIndex: 40, padding: 10 }}
        >
          <span className={styles.topicsIcon} aria-hidden="true">
            {TOPIC_IDS.map((t) => (
              <img key={t} src={img(TOPIC_COVER[t])} alt="" draggable={false} />
            ))}
          </span>
        </ClayButton>
      )}

      {phase === 'topics' &&
        topicLayout().map((b, i) => {
          const t = TOPIC_IDS[i];
          return (
            <div key={t} className={styles.topicSlot} style={{ ...boxStyle(b), animationDelay: `${i * 80}ms` }} data-testid={`topic-${t}`}>
              <ClayButton color={TOPIC_COLOR[t]} size={b.size} label={`topic-${t}`} onPress={() => pickTopic(t)} className={styles.topicBtn}>
                <img src={img(TOPIC_COVER[t])} alt="" draggable={false} className={styles.topicImg} />
              </ClayButton>
            </div>
          );
        })}

      {card && (
        <>
          <div
            key={`card-${deck!.index}-${card}`}
            className={styles.card}
            style={boxStyle(VIEW_CARD)}
            role="button"
            aria-label={`card-${card}`}
            data-testid="card"
            data-card={card}
            {...press('card')}
            onPointerDown={() => {
              setPressed('card');
              tapCard();
            }}
          >
            <div key={bounce?.id === card ? bounce.n : 0} className={styles.cardMove} data-bounce={bounce?.id === card ? '' : undefined}>
              <img src={img(card)} alt="" draggable={false} className={styles.cardImg} />
            </div>
          </div>
          <ClayButton color="mint" size={PREV_BOX.size} label="Thẻ trước" onPress={goPrev} style={{ position: 'absolute', ...boxStyle(PREV_BOX), zIndex: 5 }}>
            <span className={styles.arrow} aria-hidden="true">◀</span>
          </ClayButton>
          <ClayButton color="peach" size={NEXT_BOX.size} label="Thẻ sau" onPress={goNext} style={{ position: 'absolute', ...boxStyle(NEXT_BOX), zIndex: 5 }}>
            <span className={styles.arrow} aria-hidden="true">▶</span>
          </ClayButton>
        </>
      )}

      {phase === 'quiz' &&
        quiz &&
        quiz.choices.map((id, i) => {
          const b = slots[i];
          const isTarget = id === quiz.target;
          const bounced = bounce?.id === id ? bounce.n : 0;
          const hinted = isTarget && hint > 0 && !won ? hint : 0;
          return (
            <div
              key={`${quiz.target}-${id}`}
              className={styles.choice}
              style={{ ...boxStyle(b), animationDelay: `${i * 90}ms` }}
              role="button"
              aria-label={`choice-${id}`}
              data-testid={`choice-${id}`}
              data-choice={id}
              data-win={won && isTarget ? '' : undefined}
              data-dim={won && !isTarget ? '' : undefined}
              {...press(id)}
              onPointerDown={() => {
                setPressed(id);
                tapChoice(id);
              }}
            >
              <div
                key={`${bounced}-${hinted}`}
                className={styles.cardMove}
                data-bounce={bounced ? '' : undefined}
                data-hint={hinted ? '' : undefined}
              >
                <img src={img(id)} alt="" draggable={false} className={styles.cardImg} />
              </div>
              {won && isTarget && (
                <div className={styles.sparkles} aria-hidden="true" data-testid="sparkles">
                  {[...Array(10)].map((_, k) => (
                    <span key={k} style={{ '--a': `${k * 36}deg`, animationDelay: `${(k % 3) * 120}ms` } as CSSProperties}>
                      {k % 2 ? '✨' : '⭐'}
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
    </div>
  );
}
