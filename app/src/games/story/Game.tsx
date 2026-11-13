import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { Scenery } from '../../ui/Scenery';
import { useBuddyLook } from '../../ui/buddyContext';
import { clientToStage, stageRect } from '../../ui/Stage';
import { canDrop, newRound, type Round, type StoryId } from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;
/** Thời gian chờ một câu đọc xong trước câu sau (Speaker không báo hết câu). */
const LINE_MS = 2200;
const RETURN_MS = 500;
const ZOOM_MS = 300;
const NEXT_ROUND_MS = 3000;
const CARD = 240;
/** Nghiêng nhẹ từng tranh trong khay. */
const TILTS = [-6, 5, -3];

declare global {
  interface Window {
    __behocStory?: { story(): string; drop(step: number): void };
  }
}

interface Drag {
  step: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  moved: boolean;
}

interface Back {
  step: number;
  dx: number;
  dy: number;
}

const img = (story: StoryId, step: number) => `${BASE}cards/story/${story}-${step}.png`;

export default function Game({ lang, speaker, ageMonths, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [round, setRound] = useState<Round>(() => newRound(Date.now(), null, ageMonths));
  /** Bước của tranh trong từng ô (null = ô trống). Ô 1 có sẵn tranh đầu. */
  const [slots, setSlots] = useState<(number | null)[]>(() => round.steps.map((s, i) => (i === 0 ? s : null)));
  const [lastSay, setLastSay] = useState('');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [back, setBack] = useState<Back | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);
  const [landed, setLanded] = useState<number | null>(null);
  const [glow, setGlow] = useState<number | null>(null);
  const [retelling, setRetelling] = useState(false);

  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trayRefs = useRef(new Map<number, HTMLDivElement>());
  /** Chuỗi câu nói đang chờ: hủy khi có chuỗi mới để câu không chồng nhau. */
  const speech = useRef<number[]>([]);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  /** Nói lần lượt các câu, mỗi câu chờ câu trước xong; `then` chạy sau câu cuối. */
  const sayChain = useCallback(
    (lines: { key: string; act?: () => void }[], then?: () => void) => {
      speech.current.forEach(clearTimeout);
      speech.current = [];
      lines.forEach((l, i) => {
        const run = () => {
          l.act?.();
          say(l.key);
        };
        if (i === 0) run();
        else speech.current.push(window.setTimeout(run, i * LINE_MS));
      });
      if (then) speech.current.push(window.setTimeout(then, lines.length * LINE_MS));
    },
    [say],
  );

  useEffect(
    () => () => {
      speech.current.forEach(clearTimeout);
      timers.current.forEach(clearTimeout);
    },
    [],
  );

  const startRound = useCallback(
    (r: Round, hello: boolean) => {
      setRound(r);
      setSlots(r.steps.map((s, i) => (i === 0 ? s : null)));
      setGlow(null);
      setRetelling(false);
      const lines = [{ key: `story.${r.story}-1` }, { key: 'story.next' }];
      sayChain(hello ? [{ key: 'story.hello' }, ...lines] : lines);
    },
    [sayChain],
  );

  // Vào game: chào, đọc tranh 1 rồi hỏi tiếp theo
  const firstRound = useRef(round);
  useEffect(() => {
    startRound(firstRound.current, true);
  }, [startRound]);

  const retell = useCallback(
    (r: Round) => {
      setRetelling(true);
      const lines = r.steps.map((step, i) => ({ key: `story.${r.story}-${step}`, act: () => setGlow(i) }));
      later(() => {
        sayChain([...lines, { key: 'story.done', act: () => setGlow(null) }], () => {
          later(() => startRound(newRound(Date.now(), r.story, ageMonths), false), NEXT_ROUND_MS - LINE_MS);
        });
      }, LINE_MS);
    },
    [later, sayChain, startRound, ageMonths],
  );

  /** Tranh trôi về khay từ điểm thả (toạ độ khung). */
  const floatBack = useCallback(
    (step: number, at: { x: number; y: number }) => {
      const el = trayRefs.current.get(step);
      if (el) {
        const r = stageRect(el);
        setBack({ step, dx: at.x - (r.left + r.width / 2), dy: at.y - (r.top + r.height / 2) });
      } else {
        setBack({ step, dx: 0, dy: 0 });
      }
      later(() => setBack((b) => (b?.step === step ? null : b)), RETURN_MS);
    },
    [later],
  );

  const dropInto = useCallback(
    (step: number, slotIndex: number, at: { x: number; y: number }) => {
      if (retelling) return;
      const filled = slots.map((s) => s !== null);
      if (canDrop(slotIndex, step, filled, round.steps)) {
        const next = slots.map((s, i) => (i === slotIndex ? step : s));
        setSlots(next);
        setLanded(slotIndex);
        later(() => setLanded((l) => (l === slotIndex ? null : l)), 400);
        const key = `story.${round.story}-${step}`;
        if (next.every((s) => s !== null)) {
          sayChain([{ key }]);
          retell(round);
        } else {
          sayChain([{ key }, { key: 'story.next' }]);
        }
        return;
      }
      floatBack(step, at);
      // nhắc lại câu của ô đã xếp gần nhất, rồi hỏi tiếp
      const prev = [...slots].reverse().find((s) => s !== null) ?? round.steps[0];
      sayChain([{ key: `story.${round.story}-${prev}` }, { key: 'story.next' }]);
    },
    [retelling, slots, round, later, sayChain, retell, floatBack],
  );

  // E2E: ?e2e=1 → window.__behocStory; drop(step) thả vào ô trống đầu tiên
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocStory = {
      story: () => round.story,
      drop: (step) => {
        const idx = slots.findIndex((s) => s === null);
        if (idx < 0) return;
        const el = slotRefs.current[idx];
        const r = el ? stageRect(el) : { left: 0, top: 0, width: 0, height: 0 };
        dropInto(step, idx, { x: r.left + r.width / 2, y: r.top + r.height / 2 });
      },
    };
    return () => {
      delete window.__behocStory;
    };
  });

  const onCardDown = (e: RPointerEvent<HTMLDivElement>, step: number) => {
    if (retelling || back?.step === step) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    setPressed(step);
    setDrag({ step, x: p.x, y: p.y, sx: p.x, sy: p.y, moved: false });
  };

  const onMove = (e: RPointerEvent) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.sx, p.y - drag.sy) > 16;
    setDrag({ ...drag, x: p.x, y: p.y, moved });
  };

  const onUp = (e: RPointerEvent) => {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    setPressed(null);
    if (!d.moved) {
      // chạm: tranh phóng to một chút, không nói đáp án
      setZoom(d.step);
      later(() => setZoom((z) => (z === d.step ? null : z)), ZOOM_MS);
      return;
    }
    const p = clientToStage(e.clientX, e.clientY);
    const hit = slotRefs.current.findIndex((el) => {
      if (!el) return false;
      const r = stageRect(el);
      return p.x >= r.left && p.x <= r.right && p.y >= r.top && p.y <= r.bottom;
    });
    if (hit >= 0) dropInto(d.step, hit, p);
    else floatBack(d.step, p);
  };

  const trayCards = round.tray.filter((s) => !slots.includes(s));
  const dragging = drag?.moved ? drag : null;

  return (
    <div
      className={styles.scene}
      data-testid="game-story"
      data-last-say={lastSay}
      data-story={round.story}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <Scenery variant="room" />
      <BackHome onExit={onExit} />

      <div className={styles.slots}>
        {round.steps.map((_, i) => {
          const step = slots[i];
          return (
            <div key={`${round.story}-${i}`} className={styles.slotCol}>
              {i > 0 && <span className={styles.arrow} aria-hidden="true" />}
              <div
                ref={(el) => {
                  slotRefs.current[i] = el;
                }}
                className={styles.slot}
                data-testid={`story-slot-${i}`}
                data-filled={step ?? undefined}
                data-glow={glow === i || undefined}
              >
                {step !== null && (
                  <div className={styles.slotCard} data-landed={landed === i || undefined}>
                    <img src={img(round.story, step)} alt="" draggable={false} className={styles.img} />
                  </div>
                )}
              </div>
              <div className={styles.dots} aria-hidden="true">
                {Array.from({ length: i + 1 }, (_, k) => (
                  <span key={k} className={styles.dot} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.tray}>
        {trayCards.map((step, i) => {
          const isBack = back?.step === step;
          const style = {
            '--tilt': `${TILTS[i % TILTS.length]}deg`,
            '--dx': `${isBack ? back.dx : 0}px`,
            '--dy': `${isBack ? back.dy : 0}px`,
          } as CSSProperties;
          return (
            <div
              key={`${round.story}-${step}`}
              ref={(el) => {
                if (el) trayRefs.current.set(step, el);
                else trayRefs.current.delete(step);
              }}
              className={styles.traySpot}
            >
              <div
                className={styles.card}
                style={style}
                data-testid={`story-card-${step}`}
                aria-label={`Tranh ${step}`}
                data-hidden={dragging?.step === step || undefined}
                data-pressed={pressed === step || undefined}
                data-zoom={zoom === step || undefined}
                data-returning={isBack || undefined}
                onPointerDown={(e) => onCardDown(e, step)}
              >
                <img src={img(round.story, step)} alt="" draggable={false} className={styles.img} />
              </div>
            </div>
          );
        })}
      </div>

      {dragging && (
        <div
          className={`${styles.card} ${styles.dragging}`}
          style={{ left: dragging.x - CARD / 2, top: dragging.y - CARD / 2 }}
          aria-hidden="true"
        >
          <img src={img(round.story, dragging.step)} alt="" draggable={false} className={styles.img} />
        </div>
      )}

      {/* Đậu Đậu nảy nhẹ mỗi lần nói (key đổi → chạy lại animation) */}
      <img key={lastSay} src={buddy.img} alt="" draggable={false} className={styles.daudau} />
    </div>
  );
}
