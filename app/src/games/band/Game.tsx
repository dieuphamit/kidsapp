import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { clientToStage, stageRect } from '../../ui/Stage';
import { BAND_ANIMALS, beatMs, emptySlots, hasAnimals, nextBeat, place, remove, type Slots, type Tempo } from './logic';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

/** Chờ lời chào nói xong rồi mới bắt đầu vòng lặp. */
export const LOOP_START_MS = 1800;
/** Kéo xa hơn ngưỡng này (px trong khung) thì là kéo, không phải chạm. */
const DRAG_PX = 20;

const NAME_VI: Record<string, string> = {
  cow: 'Con bò',
  chicken: 'Con gà',
  duck: 'Con vịt',
  pig: 'Con lợn',
  dog: 'Con chó',
  sheep: 'Con cừu',
};

interface Drag {
  id: string;
  x: number;
  y: number;
  startX: number;
  startY: number;
  moved: boolean;
  over: number | null;
}

declare global {
  interface Window {
    __behocBand?: {
      slots(): (string | null)[];
      put(i: number, id: string): void;
    };
  }
}

export default function Game({ speaker, onExit }: GameProps) {
  const [slots, setSlots] = useState<Slots>(() => place(emptySlots(), 0, 'dog'));
  const [tempo, setTempo] = useState<Tempo>('normal');
  const [ready, setReady] = useState(false);
  const [beat, setBeat] = useState(-1);
  const [tick, setTick] = useState(0);
  const [lastSay, setLastSay] = useState('');
  const [drag, setDrag] = useState<Drag | null>(null);
  const [landed, setLanded] = useState<{ slot: number; n: number } | null>(null);
  const [backHome, setBackHome] = useState<{ id: string; n: number } | null>(null);

  const slotsRef = useRef(slots);
  const beatRef = useRef(-1);
  const slotEls = useRef<(HTMLDivElement | null)[]>([]);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    say('band.hello');
    const t = setTimeout(() => setReady(true), LOOP_START_MS);
    return () => clearTimeout(t);
  }, [say]);

  // Vòng lặp 4 nhịp: chỉ chạy khi có ít nhất một con vật trên sân khấu.
  const playing = ready && hasAnimals(slots);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const b = nextBeat(beatRef.current);
      beatRef.current = b;
      setBeat(b);
      setTick((n) => n + 1);
      const animal = slotsRef.current[b];
      if (animal) say(`animal.${animal}-sound`);
    }, beatMs(tempo));
    return () => clearInterval(id);
  }, [playing, tempo, say]);

  useEffect(() => {
    if (playing) return;
    beatRef.current = -1;
  }, [playing]);

  const put = useCallback((i: number, id: string) => {
    setSlots((s) => place(s, i, id));
    setLanded((l) => ({ slot: i, n: (l?.n ?? 0) + 1 }));
  }, []);

  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocBand = {
      slots: () => [...slotsRef.current],
      put: (i, id) => put(i, id),
    };
    return () => {
      delete window.__behocBand;
    };
  }, [put]);

  const takeOff = (i: number) => {
    const id = slots[i];
    if (!id) return;
    setSlots((s) => remove(s, i));
    setBackHome((b) => ({ id, n: (b?.n ?? 0) + 1 }));
  };

  const pickTempo = (t: Exclude<Tempo, 'normal'>) => {
    if (tempo === t) {
      setTempo('normal');
      return;
    }
    setTempo(t);
    say(t === 'slow' ? 'band.slow' : 'band.fast');
  };

  // ---- Kéo từ khay ----
  const slotAt = (x: number, y: number): number | null => {
    for (let i = 0; i < slotEls.current.length; i++) {
      const el = slotEls.current[i];
      if (!el) continue;
      const r = stageRect(el);
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return i;
    }
    return null;
  };

  const onTrayDown = (e: ReactPointerEvent<HTMLDivElement>, id: string) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const p = clientToStage(e.clientX, e.clientY);
    setDrag({ id, x: p.x, y: p.y, startX: p.x, startY: p.y, moved: false, over: null });
  };

  const onMove = (e: ReactPointerEvent) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.startX, p.y - drag.startY) > DRAG_PX;
    setDrag({ ...drag, x: p.x, y: p.y, moved, over: moved ? slotAt(p.x, p.y) : null });
  };

  const onUp = (e: ReactPointerEvent) => {
    if (!drag) return;
    const p = clientToStage(e.clientX, e.clientY);
    const moved = drag.moved || Math.hypot(p.x - drag.startX, p.y - drag.startY) > DRAG_PX;
    if (!moved) {
      say(`animal.${drag.id}-sound`);
    } else {
      const i = slotAt(p.x, p.y);
      if (i !== null) put(i, drag.id);
    }
    setDrag(null);
  };

  const onCancel = () => setDrag(null);

  const showBeat = playing && beat >= 0;

  return (
    <div
      className={styles.scene}
      data-testid="game-band"
      data-last-say={lastSay}
      data-beat={showBeat ? beat : undefined}
      data-tempo={tempo}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onCancel}
    >
      {/* Rèm sân khấu */}
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.spot} />
        <div className={`${styles.drape} ${styles.drapeLeft}`} />
        <div className={`${styles.drape} ${styles.drapeRight}`} />
        <div className={styles.valance} />
        <div className={styles.notes}>
          <span>♪</span>
          <span>♫</span>
          <span>♪</span>
        </div>
      </div>

      <BackHome onExit={onExit} />

      <div className={styles.tempo}>
        <div className={styles.tempoWrap} data-testid="tempo-slow" data-active={tempo === 'slow' ? '' : undefined}>
          <ClayButton color="leaf" size={120} label="Chậm" onPress={() => pickTempo('slow')}>
            🐢
          </ClayButton>
        </div>
        <div className={styles.tempoWrap} data-testid="tempo-fast" data-active={tempo === 'fast' ? '' : undefined}>
          <ClayButton color="peach" size={120} label="Nhanh" onPress={() => pickTempo('fast')}>
            🐇
          </ClayButton>
        </div>
      </div>

      {/* Bục gỗ */}
      <div className={styles.podium} aria-hidden="true">
        <div className={styles.podiumTop} />
        <div className={styles.podiumFront} />
      </div>

      {/* 4 ô nhịp */}
      <div className={styles.slots}>
        {slots.map((id, i) => {
          const active = showBeat && beat === i;
          return (
            <div
              key={i}
              ref={(el) => {
                slotEls.current[i] = el;
              }}
              className={styles.slot}
              data-testid={`slot-${i}`}
              data-animal={id ?? undefined}
              data-active={active ? '' : undefined}
              data-over={drag?.over === i ? '' : undefined}
            >
              <span className={styles.slotDots} aria-hidden="true">
                {Array.from({ length: i + 1 }, (_, k) => (
                  <i key={k} />
                ))}
              </span>
              {id ? (
                <div
                  key={landed?.slot === i ? `land-${landed.n}` : 'still'}
                  className={styles.onStage}
                  data-landed={landed?.slot === i ? '' : undefined}
                >
                  <ClayButton color="butter" size={168} label={`Ô ${i + 1}: ${id}`} onPress={() => takeOff(i)}>
                    <span key={active ? `hop-${tick}` : 'rest'} className={active ? styles.hop : styles.rest}>
                      <img src={`${BASE}cards/${id}.png`} alt="" className={styles.stageImg} draggable={false} />
                    </span>
                  </ClayButton>
                </div>
              ) : (
                <span className={styles.restNote} aria-hidden="true">
                  𝄽
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Khay con vật */}
      <div className={styles.tray}>
        {BAND_ANIMALS.map((id) => {
          const lifted = drag?.id === id && drag.moved;
          const pressed = drag?.id === id;
          return (
            <div
              key={backHome?.id === id ? `back-${backHome.n}` : id}
              className={styles.trayItem}
              data-testid={`tray-${id}`}
              aria-label={NAME_VI[id]}
              data-pressed={pressed ? '' : undefined}
              data-lifted={lifted ? '' : undefined}
              data-back={backHome?.id === id ? '' : undefined}
              onPointerDown={(e) => onTrayDown(e, id)}
            >
              <img src={`${BASE}cards/${id}.png`} alt="" className={styles.trayImg} draggable={false} />
            </div>
          );
        })}
      </div>

      {/* Con vật đang kéo */}
      {drag?.moved && (
        <div className={styles.dragging} style={{ left: drag.x - 80, top: drag.y - 80 }} aria-hidden="true">
          <img src={`${BASE}cards/${drag.id}.png`} alt="" className={styles.trayImg} draggable={false} />
        </div>
      )}
    </div>
  );
}
