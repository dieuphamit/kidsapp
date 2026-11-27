import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react';
import styles from './TrainMenu.module.css';
import { ClayButton } from './ClayButton';
import { SeasonLayer } from './SeasonLayer';
import { clientToStage } from './Stage';
import { contentByKey } from '../core/content';
import { buddyImageUrl, buddyName } from '../core/buddy';
import { seasonToday } from '../core/season';
import { useBuddy, useFillName } from './buddyContext';
import { gamesByPlace, type GameManifest } from '../core/games';
import { PLACES, placeByKey } from '../core/places';
import type { Lang } from '../core/i18n';
import type { Speaker } from '../core/audio';

const content = contentByKey();

/** Chờ sau khi chạm toa rồi mở trò (để kịp nghe tên trò). */
export const TRAIN_PICK_DELAY_MS = 500;
/** Còi tàu thật (ghi âm Commons, xem public/audio/sfx/CREDITS.md); sfx không cắt lời Đậu Đậu. */
export const WHISTLE_SFX = 'animal-train';
/** Ngón tay xê dịch quá chừng này (px trong khung) thì là kéo đoàn tàu, không phải chạm toa. */
const DRAG_PX = 10;

export type SceneSeason = 'spring' | 'summer' | 'autumn' | 'winter';

/** Mùa của phong cảnh (cây lá) theo tháng: xuân 3–5, hạ 6–8, thu 9–11, đông 12–2. */
export function sceneSeason(date: Date): SceneSeason {
  const m = date.getMonth() + 1;
  if (m >= 3 && m <= 5) return 'spring';
  if (m >= 6 && m <= 8) return 'summer';
  if (m >= 9 && m <= 11) return 'autumn';
  return 'winter';
}

/** Khu có trò (theo thứ tự PLACES), mỗi khu một đoàn tàu. */
export function trainPlaces(games: GameManifest[]): { key: string; games: GameManifest[] }[] {
  const map = gamesByPlace(games);
  return PLACES.filter((p) => (map.get(p.key)?.length ?? 0) > 0).map((p) => ({ key: p.key, games: map.get(p.key)! }));
}

/** Khu mở đầu: khu của trò vừa chơi (để bé chơi tiếp), không có thì khu đầu tiên. */
export function initialPlace(places: { key: string; games: GameManifest[] }[], lastGameId?: string | null): string | undefined {
  const last = lastGameId ? places.find((p) => p.games.some((g) => g.id === lastGameId)) : undefined;
  return (last ?? places[0])?.key;
}

/* ---- Cỡ đoàn tàu: mọi toa phải nằm trọn trong khung, không cần kéo ---- */
/** Mép trái đoàn tàu trong khung. */
export const TRAIN_LEFT = 16;
/** Mép phải tối đa: chừa 144px sát mép phải cho cổng bố mẹ (góc trên-phải). */
export const TRAIN_RIGHT = 1194 - 144;
/** Đèn đuôi + móc nối giữa hai toa (px trong khung). */
export const TRAIN_TAIL = 12;
export const TRAIN_COUPLER = 16;
/** Đầu tàu thường / thu gọn khi khu nhiều trò. */
export const ENGINE_W = 240;
export const ENGINE_MIN_W = 170;
/** Toa rộng nhất (khu ít trò) và hẹp nhất còn đọc được tên trò (nút ▶ 120px + khe ≥24px giữa hai nút). */
export const CAR_MAX_W = 230;
export const CAR_MIN_W = 140;

export type TrainLayout = {
  engineW: number;
  carW: number;
  coupler: number;
  /** Tổng bề ngang đoàn tàu (từ TRAIN_LEFT). */
  width: number;
  /** true: dù thu nhỏ vẫn không vừa khung → đoàn tàu tự chạy chậm qua lại để lộ mọi toa. */
  overflow: boolean;
};

/**
 * Cỡ đầu tàu và toa theo số trò: toa giãn đều cho vừa khoảng [TRAIN_LEFT, TRAIN_RIGHT] (tối đa CAR_MAX_W);
 * chật thì thu đầu tàu về ENGINE_MIN_W; vẫn chật thì giữ CAR_MIN_W và báo overflow.
 */
export function trainLayout(n: number): TrainLayout {
  const avail = TRAIN_RIGHT - TRAIN_LEFT - TRAIN_TAIL;
  const cars = Math.max(1, n);
  const fit = (engineW: number) => Math.floor((avail - engineW - cars * TRAIN_COUPLER) / cars);
  let engineW = ENGINE_W;
  let carW = Math.min(CAR_MAX_W, fit(engineW));
  if (carW < CAR_MIN_W) {
    engineW = ENGINE_MIN_W;
    carW = Math.min(CAR_MAX_W, fit(engineW));
  }
  const overflow = carW < CAR_MIN_W;
  if (overflow) carW = CAR_MIN_W;
  const width = engineW + cars * (TRAIN_COUPLER + carW) + TRAIN_TAIL;
  return { engineW, carW, coupler: TRAIN_COUPLER, width, overflow };
}

/** Tốc độ tự chạy qua lại khi tàu dài hơn khung (px khung / giây) và lúc dừng ở hai đầu (ms). */
const PAN_SPEED = 60;
const PAN_REST_MS = 1800;

const tok = (name: string): CSSProperties => ({ fill: `var(--${name})` });

/** Màu tán cây theo mùa (chỉ token trong tokens.css). */
const CROWNS: Record<SceneSeason, string[]> = {
  spring: ['world-lotus', 'scene-leaf-light', 'clay-peach', 'scene-leaf'],
  summer: ['scene-leaf', 'scene-leaf-light', 'scene-leaf-dark', 'world-pine-light'],
  autumn: ['learn-orange', 'scene-sun-edge', 'learn-yellow', 'scene-barn'],
  winter: ['world-pine', 'world-pine-light', 'world-pine', 'scene-leaf-dark'],
};

/** Cây nền: [x, y gốc, bán kính tán]. */
const TREES: [number, number, number][] = [
  [60, 560, 104], [250, 548, 128], [450, 560, 96], [640, 545, 136], [850, 556, 110], [1030, 548, 126], [1190, 560, 100],
];

function Tree({ x, y, r, season, i }: { x: number; y: number; r: number; season: SceneSeason; i: number }) {
  const colors = CROWNS[season];
  const c = colors[i % colors.length];
  const trunk = <rect x={x - r * 0.12} y={y - r * 1.1} width={r * 0.24} height={r * 1.1} rx={r * 0.08} style={tok('scene-bark')} />;
  if (season === 'winter') {
    // thông có tuyết
    return (
      <g>
        {trunk}
        <path d={`M${x} ${y - r * 2.6} L${x + r * 0.95} ${y - r * 0.5} L${x - r * 0.95} ${y - r * 0.5} Z`} style={tok(c)} />
        <path d={`M${x} ${y - r * 2.6} L${x + r * 0.42} ${y - r * 1.7} Q${x} ${y - r * 1.55} ${x - r * 0.42} ${y - r * 1.7} Z`} style={tok('paper')} />
        <path d={`M${x - r * 0.95} ${y - r * 0.5} Q${x} ${y - r * 0.2} ${x + r * 0.95} ${y - r * 0.5}`} style={{ stroke: 'var(--paper)', strokeWidth: 8, fill: 'none', strokeLinecap: 'round' }} />
      </g>
    );
  }
  const cy = y - r * 1.55;
  return (
    <g>
      {trunk}
      <circle cx={x - r * 0.55} cy={cy + r * 0.25} r={r * 0.62} style={tok(c)} />
      <circle cx={x + r * 0.55} cy={cy + r * 0.25} r={r * 0.62} style={tok(c)} />
      <circle cx={x} cy={cy - r * 0.15} r={r * 0.78} style={tok(c)} />
      <circle cx={x - r * 0.28} cy={cy - r * 0.42} r={r * 0.26} style={tok('paper')} opacity={0.25} />
      {season === 'spring' && [0, 1, 2, 3].map((k) => (
        <circle key={k} cx={x + Math.cos(k * 1.7 + i) * r * 0.6} cy={cy + Math.sin(k * 1.7 + i) * r * 0.45} r={r * 0.09} style={tok('paper')} />
      ))}
      {season === 'autumn' && [0, 1, 2].map((k) => (
        <circle key={k} cx={x + Math.cos(k * 2.1 + i) * r * 0.55} cy={cy + Math.sin(k * 2.1 + i) * r * 0.4} r={r * 0.1} style={tok('scene-berry')} />
      ))}
    </g>
  );
}

/** Phong cảnh: trời, mặt trời, đồi, hàng cây theo mùa, nền đường ray. SVG tĩnh đúng khung 1194×834. */
function TrainScenery({ season }: { season: SceneSeason }) {
  const sleepers = Array.from({ length: 29 }, (_, i) => i * 42 + 6);
  const tufts = [40, 180, 330, 510, 690, 860, 1010, 1150];
  return (
    <svg className={styles.scenery} viewBox="0 0 1194 834" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id="train-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky-top)' }} />
          <stop offset="0.75" style={{ stopColor: season === 'autumn' ? 'var(--scene-sun-core)' : 'var(--sky-bottom)' }} />
        </linearGradient>
      </defs>
      <rect width="1194" height="834" fill="url(#train-sky)" />
      <circle cx="940" cy="110" r="62" style={tok('scene-sun-edge')} opacity={0.45} />
      <circle cx="940" cy="110" r="48" style={tok('scene-sun')} />
      <path d="M0 400 Q160 290 330 360 T660 340 T980 320 T1194 350 V834 H0 Z" style={tok('scene-hill-far')} />
      <path d="M0 480 Q220 400 420 460 T820 440 T1194 460 V834 H0 Z" style={tok(season === 'winter' ? 'scene-cloud-shade' : 'scene-hill-mid')} />
      {TREES.map(([x, y, r], i) => <Tree key={i} x={x} y={y} r={r} season={season} i={i} />)}
      <rect x="0" y="560" width="1194" height="274" style={tok(season === 'winter' ? 'paper' : 'scene-hill-near')} />
      <path d="M0 560 Q300 548 600 560 T1194 556 V580 H0 Z" style={tok(season === 'winter' ? 'scene-cloud-shade' : 'scene-hill-shade')} opacity={0.35} />
      {/* nền đá dăm + tà vẹt + ray */}
      <rect x="0" y="618" width="1194" height="40" style={tok('world-sand-dark')} />
      {sleepers.map((x) => <rect key={x} x={x} y="620" width="24" height="36" rx="5" style={tok('scene-wood-dark')} />)}
      <rect x="0" y="628" width="1194" height="9" rx="4" style={tok('world-rock')} />
      <rect x="0" y="628" width="1194" height="3" style={tok('paper')} opacity={0.7} />
      <rect x="0" y="644" width="1194" height="6" rx="3" style={tok('scene-bark-dark')} opacity={0.35} />
      {tufts.map((x, i) => (
        <g key={x}>
          <path d={`M${x} 700 q8 -26 14 0 q8 -32 14 0 q8 -24 14 0 Z`} style={tok(season === 'winter' ? 'scene-cloud-shade' : 'scene-tuft')} />
          {season === 'autumn' && i % 2 === 0 && <ellipse cx={x + 70} cy={688} rx={22} ry={17} style={tok('learn-orange')} />}
          {season === 'spring' && <circle cx={x + 60} cy={684} r={7} style={tok(i % 2 ? 'world-lotus' : 'learn-yellow')} />}
        </g>
      ))}
    </svg>
  );
}

/** Đầu tàu, Đậu Đậu (bạn đồng hành đang chọn) ngồi lái trong ca-bin. */
function Engine({ img, name, onTap }: { img: string; name: string; onTap(): void }) {
  return (
    <div className={styles.engine} data-testid="train-engine" onPointerUp={onTap}>
      <span className={`${styles.puff} ${styles.puff1}`} />
      <span className={`${styles.puff} ${styles.puff2}`} />
      <span className={`${styles.puff} ${styles.puff3}`} />
      <svg className={styles.engineArt} viewBox="0 0 340 420" aria-hidden="true">
        {/* ống khói */}
        <path d="M56 140 H112 L100 176 H68 Z" style={tok('ink-soft')} />
        <rect x="70" y="174" width="28" height="52" style={tok('ink-soft')} />
        <rect x="50" y="132" width="68" height="16" rx="8" style={tok('season-gold')} />
        {/* nồi hơi */}
        <rect x="26" y="214" width="196" height="118" rx="54" style={tok('learn-red')} />
        <rect x="40" y="226" width="170" height="20" rx="10" style={tok('paper')} opacity={0.25} />
        {[78, 120, 162].map((x) => <rect key={x} x={x} y="214" width="12" height="118" style={tok('season-gold')} />)}
        <path d="M134 216 a24 24 0 0 1 48 0 Z" style={tok('season-gold')} />
        {/* đèn pha */}
        <circle cx="26" cy="270" r="22" style={tok('season-gold')} />
        <circle cx="26" cy="270" r="13" style={tok('scene-sun-core')} />
        {/* ca-bin */}
        <rect x="196" y="118" width="134" height="214" rx="22" style={tok('learn-blue')} />
        <rect x="214" y="146" width="98" height="104" rx="18" style={tok('sky-top')} />
        <rect x="184" y="96" width="158" height="30" rx="15" style={tok('ink-soft')} />
        {[204, 232, 260, 288, 316].map((x) => <circle key={x} cx={x} cy="111" r="6" style={tok('learn-yellow')} />)}
        <rect x="206" y="268" width="114" height="16" rx="8" style={tok('paper')} opacity={0.35} />
        {/* khung gầm, lưới cản */}
        <rect x="14" y="326" width="324" height="28" rx="12" style={tok('ink')} />
        <path d="M14 340 L-4 392 H44 L40 340 Z" style={tok('learn-blue')} />
        {/* bánh xe */}
        <g className={styles.wheel}><circle cx="84" cy="378" r="32" style={tok('ink')} /><circle cx="84" cy="378" r="22" style={tok('scene-cloud-shade')} /><rect x="80" y="356" width="8" height="44" style={tok('ink-soft')} /><circle cx="84" cy="378" r="7" style={tok('season-gold')} /></g>
        <g className={styles.wheel}><circle cx="160" cy="378" r="32" style={tok('ink')} /><circle cx="160" cy="378" r="22" style={tok('scene-cloud-shade')} /><rect x="156" y="356" width="8" height="44" style={tok('ink-soft')} /><circle cx="160" cy="378" r="7" style={tok('season-gold')} /></g>
        <g className={styles.wheel}><circle cx="262" cy="366" r="44" style={tok('ink')} /><circle cx="262" cy="366" r="32" style={tok('learn-red')} /><rect x="257" y="334" width="10" height="64" style={tok('ink-soft')} /><rect x="230" y="361" width="64" height="10" style={tok('ink-soft')} /><circle cx="262" cy="366" r="9" style={tok('season-gold')} /></g>
        <rect x="84" y="372" width="180" height="10" rx="5" style={tok('world-rock')} />
      </svg>
      <img className={styles.driver} src={img} alt={name} draggable={false} />
    </div>
  );
}

type Props = {
  games: GameManifest[]; // đã lọc theo tuổi và bố mẹ bật/tắt
  lang: Lang;
  speaker: Speaker;
  onPick(g: GameManifest): void;
  lastGameId?: string | null;
};

/**
 * Menu kiểu đoàn tàu: mỗi khu một đoàn tàu, Đậu Đậu lái đầu tàu, mỗi toa là một trò (nút ▶ to).
 * Thanh tab dưới chọn khu: đoàn tàu mới chạy vào kèm tiếng còi. Toa co giãn theo số trò (trainLayout) để mọi toa
 * nằm trọn trong khung; khu quá nhiều trò thì đoàn tàu tự chạy chậm qua lại (bé vẫn kéo ngang được).
 */
export function TrainMenu({ games, lang, speaker, onPick, lastGameId }: Props) {
  const buddy = useBuddy();
  const fill = useFillName();
  const places = useMemo(() => trainPlaces(games), [games]);
  const [placeKey, setPlaceKey] = useState(() => initialPlace(places, lastGameId));
  const [arrival, setArrival] = useState(0);
  const [moving, setMoving] = useState(true);
  const [lastSay, setLastSay] = useState('');
  const [hop, setHop] = useState<string | null>(null);
  const locked = useRef(false);
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x0: number; s0: number; moved: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const glide = useRef(0);
  const season = useMemo(() => sceneSeason(seasonToday(window.location.search)), []);

  const current = places.find((p) => p.key === placeKey) ?? places[0];
  const layout = useMemo(() => trainLayout(current?.games.length ?? 0), [current]);
  // Trò vừa chơi đọc từ máy sau lần vẽ đầu: bé chưa chọn tab thì mở đúng khu của trò đó
  const touched = useRef(false);
  useEffect(() => {
    if (!touched.current && lastGameId) setPlaceKey(initialPlace(places, lastGameId));
  }, [lastGameId, places]);

  const say = (key: string) => {
    speaker.say(key);
    setLastSay(key);
  };

  useEffect(() => {
    say('ui.train-hello');
    speaker.sfx(WHISTLE_SFX);
    return () => {
      if (pending.current) clearTimeout(pending.current);
      cancelAnimationFrame(glide.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const choosePlace = (key: string) => {
    if (locked.current) return;
    touched.current = true;
    say(key);
    if (key === current?.key) return;
    cancelAnimationFrame(glide.current);
    if (viewport.current) viewport.current.scrollLeft = 0;
    setPlaceKey(key);
    setArrival((n) => n + 1);
    setMoving(true);
    speaker.sfx(WHISTLE_SFX);
  };

  const pickCar = (g: GameManifest) => {
    if (locked.current) return;
    locked.current = true;
    say(g.titleKey ?? g.place);
    setHop(g.id);
    pending.current = setTimeout(() => onPick(g), TRAIN_PICK_DELAY_MS);
  };

  /* ---- Kéo ngang: toạ độ trong khung (clientToStage) nên đúng cả khi khung co giãn/xoay ---- */
  const onMove = (e: PointerEvent) => {
    const d = drag.current;
    const el = viewport.current;
    if (!d || !el) return;
    const { x } = clientToStage(e.clientX, e.clientY);
    if (Math.abs(x - d.x0) > DRAG_PX) d.moved = true;
    const now = performance.now();
    if (now > d.lastT) d.v = (x - d.lastX) / (now - d.lastT);
    d.lastX = x;
    d.lastT = now;
    if (d.moved) el.scrollLeft = d.s0 - (x - d.x0);
  };
  const onUp = () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    const d = drag.current;
    drag.current = null;
    const el = viewport.current;
    if (!d?.moved || !el) return;
    // trôi thêm một đoạn rồi dừng dần
    let v = d.v * 16;
    const step = () => {
      v *= 0.92;
      if (Math.abs(v) < 0.5) return;
      el.scrollLeft -= v;
      glide.current = requestAnimationFrame(step);
    };
    glide.current = requestAnimationFrame(step);
  };
  const onDown = (e: ReactPointerEvent) => {
    if (e.button > 0 || !viewport.current) return;
    cancelAnimationFrame(glide.current);
    const { x } = clientToStage(e.clientX, e.clientY);
    drag.current = { x0: x, s0: viewport.current.scrollLeft, moved: false, lastX: x, lastT: performance.now(), v: 0 };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  };
  useEffect(() => () => {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Tàu dài hơn khung (khu quá nhiều trò): tự chạy chậm qua lại để bé thấy hết toa; bé kéo thì nhường bé
  useEffect(() => {
    const el = viewport.current;
    if (!layout.overflow || moving || !el) return;
    let dir = 1;
    let pos = el.scrollLeft;
    let last = performance.now();
    let restUntil = last + PAN_REST_MS;
    let raf = 0;
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      if (drag.current || Math.abs(el.scrollLeft - pos) > 2) {
        pos = el.scrollLeft;
        restUntil = now + PAN_REST_MS;
      } else if (now >= restUntil) {
        const max = el.scrollWidth - el.clientWidth;
        pos += (dir * PAN_SPEED * dt) / 1000;
        if (pos >= max || pos <= 0) {
          pos = Math.min(max, Math.max(0, pos));
          dir = pos >= max ? -1 : 1;
          restUntil = now + PAN_REST_MS;
        }
        el.scrollLeft = pos;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [layout.overflow, moving, current?.key, arrival]);

  /** Chạm (không kéo) vào tranh của toa cũng là chọn trò. */
  const tapped = () => !drag.current?.moved;

  const hello = () => {
    if (!tapped()) return;
    say('ui.hello');
    speaker.sfx(WHISTLE_SFX);
  };

  return (
    <div className={styles.menu} data-testid="train-menu" data-place={current?.key} data-season={season} data-last-say={lastSay || undefined}>
      <TrainScenery season={season} />
      <span className={`${styles.cloud} ${styles.cloud1}`} aria-hidden="true" />
      <span className={`${styles.cloud} ${styles.cloud2}`} aria-hidden="true" />
      <SeasonLayer speaker={speaker} />

      <div className={styles.bubble} aria-hidden="true">{content.get('ui.train-hello')?.[lang]}</div>

      <div className={styles.viewport} ref={viewport} data-testid="train-viewport" data-overflow={layout.overflow || undefined} onPointerDown={onDown}>
        <div
          key={`${current?.key}-${arrival}`}
          className={styles.train}
          data-testid="train"
          data-moving={moving || undefined}
          style={{ '--engine-w': `${layout.engineW}px`, '--car-w': `${layout.carW}px`, '--coupler-w': `${layout.coupler}px`, paddingLeft: TRAIN_LEFT } as CSSProperties}
          onAnimationEnd={(e) => { if (e.target === e.currentTarget) setMoving(false); }}
        >
          <Engine img={buddyImageUrl(buddy.character)} name={buddyName(buddy.name, lang)} onTap={hello} />
          {current?.games.map((g, i) => {
            const title = fill(g.title[lang], lang);
            const place = placeByKey(g.place);
            return (
              <div key={g.id} className={styles.carWrap}>
                <span className={styles.coupler} aria-hidden="true" />
                <div
                  className={hop === g.id ? `${styles.car} ${styles.hop}` : styles.car}
                  data-testid={`train-car-${g.id}`}
                  style={{ '--car': `var(--clay-${g.color})`, '--awning': `var(--clay-${place?.color ?? 'butter'})`, animationDelay: `${i * 90}ms` } as CSSProperties}
                >
                  <span className={styles.awning} aria-hidden="true" />
                  <div className={styles.body}>
                    <div className={styles.window} aria-hidden="true" onPointerUp={() => { if (tapped()) pickCar(g); }}>
                      <span className={styles.deco}>{place?.icon}</span>
                      <span className={styles.gameIcon}>{g.icon}</span>
                      <span className={styles.plate}>{title}</span>
                    </div>
                  </div>
                  <div className={styles.play}>
                    <ClayButton color="peach" size={120} label={title} activateOn="release" onPress={() => pickCar(g)} style={{ borderRadius: '50%' }}>
                      <svg className={styles.playIcon} viewBox="0 0 40 40" aria-hidden="true"><path d="M13 8 L33 20 L13 32 Z" style={tok('paper')} /></svg>
                    </ClayButton>
                  </div>
                  <span className={styles.chassis} aria-hidden="true" />
                  <span className={`${styles.carWheel} ${styles.wheelL}`} aria-hidden="true" />
                  <span className={`${styles.carWheel} ${styles.wheelR}`} aria-hidden="true" />
                </div>
              </div>
            );
          })}
          <span className={styles.tail} aria-hidden="true" />
        </div>
      </div>

      <nav className={styles.tabs} aria-label="Khu vui chơi">
        {places.map((p) => {
          const meta = placeByKey(p.key);
          const name = fill(content.get(p.key)?.[lang] ?? '', lang);
          const on = p.key === current?.key;
          return (
            <div key={p.key} className={on ? `${styles.tab} ${styles.tabOn}` : styles.tab} data-testid={`train-tab-${p.key.slice('place.'.length)}`}>
              <ClayButton color={meta?.color ?? 'butter'} size={on ? 150 : 120} label={name} selected={on} onPress={() => choosePlace(p.key)}>
                <span className={styles.tabIcon} aria-hidden="true">{meta?.icon}</span>
                {on && <span className={styles.tabName} aria-hidden="true">{name}</span>}
              </ClayButton>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
