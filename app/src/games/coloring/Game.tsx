import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { GameProps } from '../../core/games';
import { useSayThen } from '../../ui/useSayThen';
import type { Lang } from '../../core/i18n';
import type { ClayColor } from '../../core/tokens';
import { contentByKey } from '../../core/content';
import { BackHome } from '../../ui/BackHome';
import { ClayButton } from '../../ui/ClayButton';
import { clientToStage } from '../../ui/Stage';
import { useBuddyLook } from '../../ui/buddyContext';
import { GROUPS, PICTURES, VIEW, picturesOf, type GroupId, type Picture } from './pictures';
import {
  canRedo,
  canUndo,
  fillKey,
  isComplete,
  newHistory,
  paint,
  redo,
  undo,
  type FillId,
  type Fills,
  type History,
} from './paint';
import { loadArt, saveArt, withFills, type Art } from './store';
import { playPop } from './sound';
import { PictureSvg, type Splash } from './Picture';
import { ART, CURRENT, LEFT, PALETTE_SETS, PAPER, SWAP_SLOT, SWATCH_SLOTS, setOf } from './layout';
import styles from './Game.module.css';

const content = contentByKey();
const text = (key: string, lang: Lang) => content.get(key)?.[lang] ?? key;

const HELLO_KEY = 'coloring.hello';
const START_KEY = 'coloring.start';
const DONE_KEY = 'coloring.done';
const groupKey = (g: GroupId) => `coloring.group.${g}`;
const picKey = (id: string) => `coloring.pic.${id}`;

const EASEL_COLORS: ClayColor[] = ['peach', 'mint', 'butter', 'leaf'];
const EASEL = { size: 210, top: 180, gap: 48 };
const TAB = { size: 120, gap: 24, top: 690 };

const LABELS: Record<Lang, { easel: string; undo: string; redo: string; swap: string }> = {
  vi: { easel: 'Về giá vẽ', undo: 'Hoàn tác', redo: 'Làm lại', swap: 'Đổi bộ màu' },
  ja: { easel: 'えらぶ がめんへ', undo: 'もどす', redo: 'やりなおす', swap: 'ほかの いろ' },
  en: { easel: 'Back to easels', undo: 'Undo', redo: 'Redo', swap: 'More colors' },
};

const CONFETTI_COLORS = ['red', 'orange', 'yellow', 'lime', 'teal', 'sky', 'purple', 'pink'];
const CONFETTI = Array.from({ length: 28 }, (_, i) => ({
  x: (i * 37) % 100,
  d: (i * 83) % 900,
  c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  r: (i * 47) % 360,
  star: i % 4 === 0,
}));

const CELEBRATE_MS = 4200;
const START_HINT_MS = 1700;
const SPLASH_MS = 450;

type Screen = 'pick' | 'paint';

export default function Game({ lang, speaker, onExit }: GameProps) {
  const buddy = useBuddyLook(lang);
  const [screen, setScreen] = useState<Screen>('pick');
  const [group, setGroup] = useState<GroupId>('animals');
  const [art, setArt] = useState<Art>({});
  const [pic, setPic] = useState<Picture>(PICTURES[0]);
  const [hist, setHist] = useState<History>(() => newHistory());
  const [color, setColor] = useState<FillId>('red');
  const [colorSet, setColorSet] = useState(() => setOf('red'));
  const [splash, setSplash] = useState<Splash | null>(null);
  const [pop, setPop] = useState<{ region: string; n: number } | null>(null);
  const [celebrate, setCelebrate] = useState<number | null>(null);
  const [ripple, setRipple] = useState<{ x: number; y: number; n: number } | null>(null);
  const [lastSay, setLastSay] = useState('');

  const live = useRef({ hist, art, pic, color });
  useLayoutEffect(() => {
    live.current = { hist, art, pic, color };
  });
  const tick = useRef(0);
  const hinted = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  /** Huỷ câu nhắc "chạm để tô" còn chờ sau tên tranh (bé đã chọn màu/tô thì thôi nhắc). */
  const hintCancel = useRef<(() => void) | null>(null);
  const splashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const later = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
    return t;
  }, []);
  useEffect(
    () => () => {
      timers.current.forEach(clearTimeout);
      if (splashTimer.current) clearTimeout(splashTimer.current);
    },
    [],
  );

  const say = useCallback(
    (key: string) => {
      speaker.say(key);
      setLastSay(key);
    },
    [speaker],
  );
  const sayAll = useSayThen(speaker, setLastSay);
  const cancelHint = () => {
    hintCancel.current?.();
    hintCancel.current = null;
  };

  // Chào và đọc tranh đã tô từ máy
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    say(HELLO_KEY);
    let alive = true;
    void loadArt().then((a) => {
      if (alive) setArt((cur) => ({ ...a, ...cur }));
    });
    return () => {
      alive = false;
    };
  }, [say]);

  /** Ghi bước tô mới: lưu máy ngay. */
  const commit = useCallback((h: History) => {
    const { art: a, pic: p } = live.current;
    const nextArt = withFills(a, p.id, h.present);
    live.current = { ...live.current, hist: h, art: nextArt };
    setHist(h);
    setArt(nextArt);
    void saveArt(nextArt);
  }, []);

  const openPicture = (p: Picture) => {
    const fills: Fills = live.current.art[p.id] ?? {};
    const h = newHistory(fills);
    live.current = { ...live.current, pic: p, hist: h };
    setPic(p);
    setHist(h);
    setSplash(null);
    setPop(null);
    setCelebrate(null);
    setColorSet(setOf(live.current.color));
    setScreen('paint');
    cancelHint();
    if (!hinted.current) {
      hinted.current = true;
      // tên tranh rồi câu nhắc, NỐI TIẾP: tên dài tới ~3s, trước đây câu nhắc hẹn 1700ms nên cắt tên
      hintCancel.current = sayAll([picKey(p.id), START_KEY], { fallbackMs: START_HINT_MS });
    } else {
      say(picKey(p.id));
    }
  };

  const backToEasels = () => {
    cancelHint();
    setCelebrate(null);
    setScreen('pick');
    say(groupKey(group));
  };

  const pickGroup = (g: GroupId) => {
    setGroup(g);
    say(groupKey(g));
  };

  const pickColor = (f: FillId) => {
    cancelHint();
    setColor(f);
    say(fillKey(f));
  };

  const fillRegion = (region: string, e: PointerEvent<SVGPathElement>) => {
    e.stopPropagation();
    cancelHint();
    const { hist: h, pic: p, color: f } = live.current;
    const prev = h.present[region];
    const next = paint(h, region, f);
    const n = ++tick.current;
    // Luôn có phản hồi: nảy + bụp, kể cả khi tô lại đúng màu cũ
    setPop({ region, n });
    playPop(n, f === 'sparkle');
    if (next === h) return;
    const pt = clientToStage(e.clientX, e.clientY);
    setSplash({ region, x: ((pt.x - ART.left) / ART.size) * VIEW, y: ((pt.y - ART.top) / ART.size) * VIEW, prev, n });
    if (splashTimer.current) clearTimeout(splashTimer.current);
    splashTimer.current = setTimeout(() => setSplash(null), SPLASH_MS);
    commit(next);
    const ids = p.regions.map((r) => r.id);
    if (!isComplete(h.present, ids) && isComplete(next.present, ids)) {
      setCelebrate(n);
      later(() => say(DONE_KEY), 450);
      later(() => setCelebrate((c) => (c === n ? null : c)), CELEBRATE_MS);
    }
  };

  /** Đổi sang bộ màu kế: bụp + các ô màu mới nảy lên (phản hồi ngay lúc chạm). */
  const swapColors = () => {
    cancelHint();
    setColorSet((i) => (i + 1) % PALETTE_SETS.length);
    playPop(++tick.current);
  };

  const step = (dir: 'undo' | 'redo') => {
    const h = live.current.hist;
    const next = dir === 'undo' ? undo(h) : redo(h);
    if (next === h) return;
    setSplash(null);
    const changed = Object.keys({ ...h.present, ...next.present }).find((k) => h.present[k] !== next.present[k]);
    if (changed) setPop({ region: changed, n: ++tick.current });
    playPop(tick.current);
    commit(next);
  };

  /** Chạm chỗ giấy trống: gợn nhỏ (mọi lần chạm đều có phản hồi). */
  const onPaperDown = (e: PointerEvent<HTMLDivElement>) => {
    const pt = clientToStage(e.clientX, e.clientY);
    setRipple({ x: pt.x, y: pt.y, n: Date.now() });
  };

  // Móc cho e2e (?e2e=1): đọc tranh đang tô và màu từng vùng
  useEffect(() => {
    if (new URLSearchParams(location.search).get('e2e') !== '1') return;
    window.__behocColoring = {
      picture: () => live.current.pic.id,
      fills: () => ({ ...live.current.hist.present }),
    };
    return () => {
      delete window.__behocColoring;
    };
  });

  const regionIds = pic.regions.map((r) => r.id);
  const done = isComplete(hist.present, regionIds);

  return (
    <div
      className={styles.scene}
      data-testid="game-coloring"
      data-screen={screen}
      data-last-say={lastSay}
      data-color={color}
      data-picture={screen === 'paint' ? pic.id : ''}
      data-done={screen === 'paint' && done ? '' : undefined}
      data-group={group}
    >
      <BackHome onExit={onExit} />
      {screen === 'pick' ? (
        <Room lang={lang} group={group} art={art} onGroup={pickGroup} onPicture={openPicture} />
      ) : (
        <div className={styles.studio}>
          <ClayButton
            color="butter"
            size={120}
            label={LABELS[lang].easel}
            onPress={backToEasels}
            style={{ position: 'absolute', ...LEFT.easel }}
          >
            🖼️
          </ClayButton>

          {/* Màu đang cầm (chỉ để nhìn) */}
          <div
            className={styles.current}
            style={{ left: CURRENT.left, top: CURRENT.top, width: CURRENT.width, height: CURRENT.height }}
            aria-hidden="true"
            data-testid="coloring-current"
          >
            <span className={styles.currentDrop} style={ballStyle(color)} />
            <span className={styles.currentBrush}>🖌️</span>
          </div>

          <ClayButton
            color="peach"
            size={120}
            label={LABELS[lang].undo}
            onPress={() => step('undo')}
            className={canUndo(hist) ? undefined : styles.off}
            style={{ position: 'absolute', ...LEFT.undo }}
          >
            ↩️
          </ClayButton>
          <ClayButton
            color="peach"
            size={120}
            label={LABELS[lang].redo}
            onPress={() => step('redo')}
            className={canRedo(hist) ? undefined : styles.off}
            style={{ position: 'absolute', ...LEFT.redo }}
          >
            ↪️
          </ClayButton>

          <div
            className={styles.paper}
            style={{ left: PAPER.left, top: PAPER.top, width: PAPER.width, height: PAPER.height }}
            onPointerDown={onPaperDown}
            data-testid="coloring-paper"
          >
            <PictureSvg
              pic={pic}
              fills={hist.present}
              className={styles.art}
              style={{ left: ART.left - PAPER.left, top: ART.top - PAPER.top, width: ART.size, height: ART.size }}
              onRegionDown={fillRegion}
              splash={splash}
              pop={pop}
              testId="coloring-art"
            />
          </div>

          {ripple && (
            <span key={ripple.n} className={styles.ripple} style={{ left: ripple.x - 40, top: ripple.y - 40 }} aria-hidden="true" />
          )}

          <div className={styles.palette} data-testid="coloring-palette" data-set={colorSet}>
            <span className={styles.trayTall} aria-hidden="true" />
            <span className={styles.trayLow} aria-hidden="true" />
            {PALETTE_SETS[colorSet].map((f, i) => (
              <ClayButton
                key={`${colorSet}-${f}`}
                color="butter"
                size={120}
                label={text(fillKey(f), lang)}
                onPress={() => pickColor(f)}
                selected={color === f}
                className={styles.ballBtn}
                style={{ position: 'absolute', ...SWATCH_SLOTS[i], animationDelay: `${i * 40}ms` }}
              >
                <span className={styles.ball} style={ballStyle(f)} data-testid={`paint-${f}`} />
                {f === 'sparkle' && <span className={styles.ballIcon}>✨</span>}
              </ClayButton>
            ))}
            <ClayButton
              color="lilac"
              size={120}
              label={LABELS[lang].swap}
              onPress={swapColors}
              className={styles.swapBtn}
              style={{ position: 'absolute', ...SWAP_SLOT }}
            >
              {/* Hé lộ bộ màu kế tiếp: ba giọt màu nhỏ */}
              <span className={styles.swapDots} data-testid="coloring-swap">
                {PALETTE_SETS[(colorSet + 1) % PALETTE_SETS.length].slice(0, 3).map((f) => (
                  <span key={f} className={styles.swapDot} style={ballStyle(f)} />
                ))}
              </span>
            </ClayButton>
          </div>

          {celebrate !== null && (
            <div className={styles.party} data-testid="coloring-party" aria-hidden="true">
              {CONFETTI.map((c, i) => (
                <span
                  key={`${celebrate}-${i}`}
                  className={c.star ? styles.star : styles.confetti}
                  style={{
                    left: `${c.x}%`,
                    animationDelay: `${c.d}ms`,
                    background: c.star ? undefined : `var(--paint-${c.c})`,
                    rotate: `${c.r}deg`,
                  }}
                >
                  {c.star ? '⭐' : null}
                </span>
              ))}
              <img src={buddy.img} alt="" draggable={false} className={styles.buddy} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ballStyle(f: FillId): CSSProperties {
  if (f === 'rainbow') {
    return {
      background:
        'conic-gradient(var(--paint-red), var(--paint-orange), var(--paint-yellow), var(--paint-green), var(--paint-sky), var(--paint-blue), var(--paint-purple), var(--paint-red))',
    };
  }
  if (f === 'sparkle') return { background: 'var(--paint-gold)' };
  return { background: `var(--paint-${f})` };
}

type RoomProps = {
  lang: Lang;
  group: GroupId;
  art: Art;
  onGroup(g: GroupId): void;
  onPicture(p: Picture): void;
};

/** Phòng vẽ: giá vẽ mỗi giá một tranh của nhóm đang chọn, tab nhóm ở dưới. */
function Room({ lang, group, art, onGroup, onPicture }: RoomProps) {
  const pics = picturesOf(group);
  const rowW = pics.length * EASEL.size + (pics.length - 1) * EASEL.gap;
  const x0 = (1194 - rowW) / 2;
  const tabsW = GROUPS.length * TAB.size + (GROUPS.length - 1) * TAB.gap;
  const t0 = (1194 - tabsW) / 2;
  return (
    <div className={styles.room} data-testid="coloring-room">
      <div className={styles.bunting} aria-hidden="true">
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} style={{ background: `var(--paint-${CONFETTI_COLORS[i % CONFETTI_COLORS.length]})` }} />
        ))}
      </div>
      <div className={styles.floor} aria-hidden="true" />
      <span className={styles.cup} aria-hidden="true">🖍️</span>
      <span className={styles.plant} aria-hidden="true">🪴</span>

      {pics.map((p, i) => {
        const fills = art[p.id] ?? {};
        const complete = isComplete(fills, p.regions.map((r) => r.id));
        const c = EASEL_COLORS[i % EASEL_COLORS.length];
        return (
          <div
            key={p.id}
            className={styles.easel}
            style={{ left: x0 + i * (EASEL.size + EASEL.gap), top: EASEL.top, '--easel': `var(--clay-${c})` } as CSSProperties}
          >
            <span className={styles.knob} aria-hidden="true" />
            <span className={styles.legs} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <ClayButton color={c} size={EASEL.size} label={text(picKey(p.id), lang)} onPress={() => onPicture(p)} className={styles.board}>
              <span className={styles.canvas} data-testid={`easel-${p.id}`} data-filled={Object.keys(fills).length}>
                <PictureSvg pic={p} fills={fills} className={styles.thumb} />
              </span>
              {complete && <span className={styles.badge}>⭐</span>}
            </ClayButton>
          </div>
        );
      })}

      <div className={styles.tray} aria-hidden="true" />
      {GROUPS.map((g, i) => (
        <ClayButton
          key={g.id}
          color={g.id === group ? 'butter' : 'lilac'}
          size={TAB.size}
          label={text(groupKey(g.id), lang)}
          onPress={() => onGroup(g.id)}
          selected={g.id === group}
          className={styles.tab}
          style={{ position: 'absolute', left: t0 + i * (TAB.size + TAB.gap), top: TAB.top }}
        >
          <span data-testid={`tab-${g.id}`}>{g.icon}</span>
        </ClayButton>
      ))}
    </div>
  );
}

declare global {
  interface Window {
    __behocColoring?: {
      picture(): string;
      fills(): Record<string, string>;
    };
  }
}
