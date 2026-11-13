import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { createHabitatHerd, type Herd } from '../../core/herd';
import { startReact, type Agent } from '../../core/steer';
import { animalVoiceKeys, HABITAT_IDS } from '../../core/worldAnimals';
import { contentByKey } from '../../core/content';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { clientToStage } from '../../ui/Stage';
import { BACKDROP, HABITAT_ICON } from './scenery';
import { arrived, createSwipe, dragEnd, dragMove, dragStart, go, mountedRange, stepSwipe, visibleRange } from './swipe';
import styles from './world.module.css';
import { speciesCount, voiceId } from './voice';

const WorldScene = lazy(() => import('./WorldScene'));

const IS_E2E = typeof window !== 'undefined' && window.location.search.includes('e2e=1');
/** Tiếng kêu thật dài 1–2.6s; đọc tên sau tiếng kêu */
const NAME_DELAY = 2000;
const ALL_FRIENDS_DELAY = 1700;

type Sparkle = { id: number; x: number; y: number };

export default function Game({ speaker, onExit }: GameProps) {
  const swipe = useMemo(() => createSwipe(HABITAT_IDS.length, 0), []);
  const herds = useMemo<Herd[]>(() => HABITAT_IDS.map((h, i) => createHabitatHerd(h, 7 + i * 13)), []);
  const content = useMemo(() => contentByKey(), []);

  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState<number[]>(() => mountedRange(swipe));
  const [visible, setVisible] = useState<number[]>(() => visibleRange(swipe));
  const [loaded, setLoaded] = useState<number[]>(() => HABITAT_IDS.map(() => 0));
  const [lastSay, setLastSay] = useState('');
  const [badge, setBadge] = useState({ n: 0, index: 0 });
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [lastTap, setLastTap] = useState('');

  const bgRefs = useRef<(HTMLDivElement | null)[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const announced = useRef(0);
  const greeted = useRef(HABITAT_IDS.map(() => new Set<string>()));
  const pendingTap = useRef<{ index: number; id: string; agent: Agent } | null>(null);
  const pointer = useRef<{ id: number; x: number; y: number } | null>(null);
  const sparkleId = useRef(0);

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );
  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    for (const t of timers.current) clearTimeout(t);
    timers.current = [];
  }, []);

  // Lời chào khi vào trò
  useEffect(() => {
    say('world.hello');
    return clearTimers;
  }, [say, clearTimers]);

  // Vòng lặp: lò xo của dải, nền chuyển màu theo vị trí, dựng/bật khu theo vị trí, đọc tên khu khi tới nơi
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let mKey = '';
    let vKey = '';
    const frame = (now: number) => {
      stepSwipe(swipe, (now - last) / 1000);
      last = now;
      bgRefs.current.forEach((el, i) => {
        if (el) el.style.opacity = String(Math.max(0, 1 - Math.abs(swipe.pos - i)));
      });
      const m = mountedRange(swipe);
      const v = visibleRange(swipe);
      if (m.join() !== mKey) {
        mKey = m.join();
        setMounted(m);
      }
      if (v.join() !== vKey) {
        vKey = v.join();
        setVisible(v);
      }
      setIndex(swipe.target);
      if (arrived(swipe) && swipe.target !== announced.current) {
        announced.current = swipe.target;
        clearTimers();
        say(`world.${HABITAT_IDS[swipe.target]}`);
        setBadge((b) => ({ n: b.n + 1, index: swipe.target }));
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [swipe, say, clearTimers]);

  const onLoaded = useCallback((i: number) => {
    setLoaded((l) => l.map((n, j) => (j === i ? n + 1 : n)));
  }, []);

  // Chạm thú: động tác phản hồi ngay lúc pointerdown (AnimatedAnimal); tiếng kêu/tên đọc khi nhấc tay mà không kéo
  const onTap = useCallback((i: number, id: string, agent: Agent) => {
    pendingTap.current = { index: i, id, agent };
  }, []);

  const speakAnimal = useCallback(
    (i: number, id: string) => {
      setLastTap(id);
      clearTimers();
      const [sound, name] = animalVoiceKeys(voiceId(id), (k) => content.has(k));
      if (sound) say(sound);
      if (name) later(() => say(name), NAME_DELAY);
      const seen = greeted.current[i];
      const first = !seen.has(id);
      seen.add(id);
      if (first && seen.size === speciesCount(i)) {
        // chào đủ các bạn trong khu: cả khu nhảy mừng
        later(() => {
          say('world.all-friends');
          for (const a of herds[i].agents) startReact(a);
        }, NAME_DELAY + ALL_FRIENDS_DELAY);
      }
      return first;
    },
    [content, say, later, clearTimers, herds],
  );

  const endPointer = useCallback(
    (e: PointerEvent) => {
      const p = pointer.current;
      if (!p || e.pointerId !== p.id) return;
      pointer.current = null;
      const wasDrag = swipe.moved;
      dragEnd(swipe, e.timeStamp / 1000);
      const tap = pendingTap.current;
      pendingTap.current = null;
      if (wasDrag || !tap || e.type === 'pointercancel') return;
      const first = speakAnimal(tap.index, tap.id);
      if (first) {
        const id = ++sparkleId.current;
        setSparkles((s) => [...s, { id, x: p.x, y: p.y }]);
        setTimeout(() => setSparkles((s) => s.filter((k) => k.id !== id)), 1000);
      }
    },
    [swipe, speakAnimal],
  );

  const moveListener = useCallback(
    (e: PointerEvent) => {
      const p = pointer.current;
      if (!p || e.pointerId !== p.id) return;
      const pt = clientToStage(e.clientX, e.clientY);
      dragMove(swipe, pt.x, e.timeStamp / 1000);
    },
    [swipe],
  );

  useEffect(() => {
    window.addEventListener('pointermove', moveListener);
    window.addEventListener('pointerup', endPointer);
    window.addEventListener('pointercancel', endPointer);
    return () => {
      window.removeEventListener('pointermove', moveListener);
      window.removeEventListener('pointerup', endPointer);
      window.removeEventListener('pointercancel', endPointer);
    };
  }, [moveListener, endPointer]);

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      // một ngón: ngón thứ hai đặt xuống trong lúc kéo bị bỏ qua (luật 6)
      if (pointer.current) return;
      const pt = clientToStage(e.clientX, e.clientY);
      pointer.current = { id: e.pointerId, x: pt.x, y: pt.y };
      dragStart(swipe, pt.x, e.timeStamp / 1000);
    },
    [swipe],
  );

  const press = useCallback(
    (dir: 1 | -1) => {
      go(swipe, dir);
    },
    [swipe],
  );

  // e2e: chạm thẳng một con theo id (khi khó trúng toạ độ trên WebGL phần mềm)
  useEffect(() => {
    if (!IS_E2E) return;
    window.__behocTap = (id: string) => {
      const agent = herds[swipe.target].agents.find((a) => a.id === id || a.id.startsWith(`${id}-`));
      if (agent) startReact(agent);
      speakAnimal(swipe.target, id);
    };
    return () => {
      delete window.__behocTap;
    };
  }, [herds, swipe, speakAnimal]);

  const habitat = HABITAT_IDS[index];
  const members = herds[index].members.length;
  const ready = loaded[index] >= members;

  return (
    <div
      data-testid="game-world"
      data-habitat={habitat}
      data-ready={ready ? 'true' : undefined}
      data-last-say={lastSay || undefined}
      data-last-tap={lastTap || undefined}
      className={styles.root}
    >
      {HABITAT_IDS.map((h, i) => (
        <div
          key={h}
          ref={(el) => {
            bgRefs.current[i] = el;
          }}
          className={styles.backdrop}
          style={{ background: BACKDROP[h], opacity: i === 0 ? 1 : 0 }}
        />
      ))}
      <div className={styles.stage} data-testid="world-drag" onPointerDown={onPointerDown}>
        <Suspense fallback={null}>
          <WorldScene swipe={swipe} herds={herds} mounted={mounted} visible={visible} current={index} onTap={onTap} onLoaded={onLoaded} />
        </Suspense>
      </div>

      <div key={badge.n} className={styles.badge} aria-hidden="true" data-testid="world-badge">
        {HABITAT_ICON[HABITAT_IDS[badge.index]]}
      </div>
      {sparkles.map((s) => (
        <div key={s.id} className={styles.sparkle} style={{ left: s.x, top: s.y }} aria-hidden="true">
          ✨
        </div>
      ))}

      {index > 0 && (
        <ClayButton color="butter" size={120} label="Sang trái" onPress={() => press(-1)} style={{ position: 'fixed', left: 24, top: 357, zIndex: 30 }}>
          ◀
        </ClayButton>
      )}
      {index < HABITAT_IDS.length - 1 && (
        <ClayButton color="butter" size={120} label="Sang phải" onPress={() => press(1)} style={{ position: 'fixed', right: 24, top: 357, zIndex: 30 }}>
          ▶
        </ClayButton>
      )}
      <div className={styles.dots} aria-hidden="true" data-testid="world-dots" data-current={index}>
        {HABITAT_IDS.map((h, i) => (
          <span key={h} className={i === index ? `${styles.dot} ${styles.dotOn}` : styles.dot} />
        ))}
      </div>
      <BackHome onExit={onExit} />
    </div>
  );
}
