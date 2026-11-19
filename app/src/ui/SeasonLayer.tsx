import { useEffect, type CSSProperties, type ReactNode } from 'react';
import styles from './SeasonLayer.module.css';
import { dayStamp, greetingKey, seasonFromLocation, seasonToday, type SeasonId } from '../core/season';
import { loadSeasonPref, useSeasonPref } from '../core/seasonPref';
import type { Speaker } from '../core/audio';

/** Chờ câu "ui.where" của bản đồ nói xong rồi mới chào mùa. */
export const GREET_DELAY_MS = 2600;
const GREET_KEY = 'behoc.seasonGreet';

const fill = (token: string) => ({ style: { fill: `var(--${token})` } });
const stroke = (token: string, width: number) => ({ style: { stroke: `var(--${token})`, strokeWidth: width, fill: 'none' } });

/* ---------- Tết: đèn lồng đỏ, cành mai/đào, cánh hoa rơi ---------- */

function Lantern() {
  return (
    <svg viewBox="0 0 60 100" className={styles.lanternArt}>
      <rect x={18} y={0} width={24} height={9} rx={3} {...fill('season-gold')} />
      <ellipse cx={30} cy={40} rx={28} ry={31} {...fill('season-lantern')} />
      <ellipse cx={30} cy={40} rx={14} ry={31} {...stroke('season-lantern-dark', 2.5)} />
      <path d="M30 9 V71" {...stroke('season-lantern-dark', 2.5)} />
      <ellipse cx={18} cy={30} rx={5} ry={11} {...fill('paper')} opacity={0.35} />
      <rect x={18} y={68} width={24} height={9} rx={3} {...fill('season-gold')} />
      <rect x={27} y={76} width={6} height={22} rx={3} {...fill('season-gold')} />
    </svg>
  );
}

function Flower({ x, y, r, petal, heart }: { x: number; y: number; r: number; petal: string; heart: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <circle key={a} cx={0} cy={-r} r={r * 0.85} transform={`rotate(${a})`} {...fill(petal)} />
      ))}
      <circle r={r * 0.55} {...fill(heart)} />
    </g>
  );
}

function BlossomBranch() {
  const mai = { petal: 'learn-yellow', heart: 'learn-orange' };
  const dao = { petal: 'world-lotus', heart: 'scene-berry' };
  return (
    <svg viewBox="0 0 320 170" className={styles.branch}>
      <path d="M-10 18 C70 30 140 40 210 78 C250 100 280 120 312 150" {...stroke('season-branch', 11)} strokeLinecap="round" />
      <path d="M96 36 C110 70 104 100 120 128" {...stroke('season-branch', 7)} strokeLinecap="round" />
      <path d="M180 64 C200 40 230 30 262 26" {...stroke('season-branch', 6)} strokeLinecap="round" />
      <Flower x={40} y={26} r={11} {...mai} />
      <Flower x={88} y={50} r={9} {...dao} />
      <Flower x={118} y={126} r={12} {...mai} />
      <Flower x={108} y={88} r={8} {...mai} />
      <Flower x={160} y={56} r={12} {...mai} />
      <Flower x={214} y={36} r={10} {...dao} />
      <Flower x={262} y={26} r={11} {...mai} />
      <Flower x={232} y={98} r={12} {...dao} />
      <Flower x={290} y={136} r={10} {...mai} />
      <Flower x={196} y={78} r={7} {...mai} />
    </svg>
  );
}

/* ---------- Trung thu: trăng rằm, đèn ông sao, sao lấp lánh ---------- */

const STAR = (cx: number, cy: number, R: number, r: number) =>
  Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? R : r;
    return `${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

function StarLantern({ body }: { body: string }) {
  return (
    <svg viewBox="0 0 100 130" className={styles.starArt}>
      <polygon points={STAR(50, 52, 48, 20)} style={{ fill: `var(--${body})`, stroke: 'var(--season-gold)', strokeWidth: 4, strokeLinejoin: 'round' }} />
      <polygon points={STAR(50, 52, 26, 11)} {...fill('season-moon')} opacity={0.55} />
      <circle cx={50} cy={52} r={7} {...fill('season-gold')} />
      <rect x={18} y={88} width={5} height={30} rx={2.5} transform="rotate(14 20 88)" {...fill('season-gold')} />
      <rect x={77} y={88} width={5} height={30} rx={2.5} transform="rotate(-14 80 88)" {...fill('season-gold')} />
    </svg>
  );
}

const TWINKLES: [number, number, number][] = [
  [180, 40, 0], [300, 96, 0.6], [400, 34, 1.2], [790, 40, 0.3], [880, 100, 0.9], [1000, 160, 1.5], [250, 300, 0.4], [960, 300, 1.1],
];

/* ---------- Giáng Sinh: tuyết rơi, cây thông nhỏ, dây đèn ---------- */

function XmasTree() {
  const balls: [number, number, string][] = [
    [56, 70, 'learn-red'], [86, 92, 'learn-blue'], [44, 118, 'learn-yellow'], [96, 140, 'learn-red'], [62, 150, 'learn-purple'], [30, 160, 'learn-orange'],
  ];
  return (
    <svg viewBox="0 0 140 200" className={styles.treeArt}>
      <rect x={58} y={168} width={24} height={30} rx={6} {...fill('scene-bark')} />
      <path d="M70 18 L128 172 Q70 184 12 172 Z" {...fill('world-pine')} />
      <path d="M70 18 L112 116 Q70 128 28 116 Z" {...fill('world-pine-light')} />
      <path d="M70 18 L96 70 Q70 78 44 70 Z" {...fill('world-pine')} />
      <path d="M22 150 Q70 166 120 146" {...stroke('paper', 5)} strokeLinecap="round" opacity={0.85} />
      <path d="M38 102 Q72 116 106 98" {...stroke('paper', 5)} strokeLinecap="round" opacity={0.85} />
      {balls.map(([x, y, c], i) => <circle key={i} cx={x} cy={y} r={7} {...fill(c)} />)}
      <polygon points={STAR(70, 18, 18, 8)} {...fill('season-gold')} />
    </svg>
  );
}

const BULBS = ['learn-red', 'learn-yellow', 'learn-green', 'learn-blue', 'learn-orange', 'learn-purple'];

function Garland({ width }: { width: number }) {
  const n = Math.round(width / 46);
  // dây võng hai nhịp (hai đường cong bậc hai), bóng đèn treo theo dây
  const sag = (t: number) => 12 + 22 * Math.sin(Math.PI * ((t * 2) % 1));
  return (
    <svg viewBox={`0 0 ${width} 60`} width={width} height={60} className={styles.garland}>
      <path
        d={`M0 12 Q${width / 4} 56 ${width / 2} 12 Q${(3 * width) / 4} 56 ${width} 12`}
        {...stroke('scene-leaf-dark', 3)}
      />
      {Array.from({ length: n }, (_, i) => {
        const t = (i + 0.5) / n;
        return (
          <ellipse
            key={i}
            cx={t * width}
            cy={sag(t) + 8}
            rx={7}
            ry={10}
            className={i % 2 ? styles.bulbB : styles.bulbA}
            {...fill(BULBS[i % BULBS.length])}
          />
        );
      })}
    </svg>
  );
}

/* ---------- Hạt rơi (cánh hoa / tuyết): vị trí cố định theo chỉ số, chỉ chạy CSS ---------- */

function Falling({ count, kind }: { count: number; kind: 'petal' | 'snow' }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => {
        const left = ((i * 211) % 1150) + 10;
        const size = kind === 'snow' ? 8 + ((i * 7) % 9) : 14 + ((i * 5) % 8);
        const dur = 9 + ((i * 13) % 8);
        const style = {
          left,
          width: size,
          height: size,
          animationDuration: `${dur}s, ${3 + (i % 3)}s`,
          animationDelay: `${-((i * 1.7) % dur)}s, ${-(i % 4)}s`,
        } as CSSProperties;
        const tone = kind === 'snow' ? styles.snow : i % 3 === 0 ? styles.petalPink : styles.petalYellow;
        return <span key={i} className={`${styles.fall} ${tone}`} style={style} data-testid={`season-${kind}`} />;
      })}
    </>
  );
}

/* ---------- Lớp trang trí ---------- */

function Hanging({ x, len, delay, children }: { x: number; len: number; delay: number; children: ReactNode }) {
  return (
    <div className={styles.hang} style={{ left: x, animationDelay: `${delay}s` } as CSSProperties}>
      <span className={styles.cord} style={{ height: len }} />
      {children}
    </div>
  );
}

function Back({ season }: { season: SeasonId }) {
  if (season === 'tet') {
    return (
      <>
        <div className={styles.branchWrap}><BlossomBranch /></div>
        <Hanging x={330} len={120} delay={0}><Lantern /></Hanging>
        <Hanging x={400} len={190} delay={-1.2}><Lantern /></Hanging>
        <Hanging x={760} len={180} delay={-0.6}><Lantern /></Hanging>
        <Hanging x={830} len={110} delay={-1.8}><Lantern /></Hanging>
      </>
    );
  }
  if (season === 'trungthu') {
    return (
      <>
        <div className={styles.dusk} />
        <div className={styles.moon}>
          <span className={styles.crater} style={{ left: 30, top: 34, width: 22, height: 22 }} />
          <span className={styles.crater} style={{ left: 66, top: 62, width: 16, height: 16 }} />
          <span className={styles.crater} style={{ left: 44, top: 78, width: 12, height: 12 }} />
        </div>
        {TWINKLES.map(([x, y, d], i) => (
          <span key={i} className={styles.twinkle} style={{ left: x, top: y, animationDelay: `${d}s` }} />
        ))}
        <Hanging x={330} len={110} delay={0}><StarLantern body="season-lantern" /></Hanging>
        <Hanging x={410} len={200} delay={-1.4}><StarLantern body="learn-yellow" /></Hanging>
        <Hanging x={750} len={190} delay={-0.7}><StarLantern body="clay-lilac" /></Hanging>
        <Hanging x={830} len={100} delay={-2}><StarLantern body="season-lantern" /></Hanging>
      </>
    );
  }
  return (
    <>
      <div className={styles.garlandLeft}><Garland width={400} /></div>
      <div className={styles.garlandRight}><Garland width={260} /></div>
      <div className={styles.tree}><XmasTree /></div>
      <div className={styles.snowCap} />
    </>
  );
}

function Front({ season }: { season: SeasonId }) {
  if (season === 'tet') return <Falling count={10} kind="petal" />;
  if (season === 'xmas') return <Falling count={26} kind="snow" />;
  return null;
}

type Props = { speaker: Speaker; search?: string; now?: Date };

/**
 * Lớp trang trí theo mùa phủ lên bản đồ: không nhận chạm (pointer-events: none), chỉ DOM/SVG và CSS.
 * Mỗi ngày có mùa, Đậu Đậu chào một câu (một lần mỗi ngày).
 */
export function SeasonLayer({ speaker, search = window.location.search, now }: Props) {
  const pref = useSeasonPref();
  useEffect(() => { void loadSeasonPref(); }, []);
  const season = pref === 'off' ? null : seasonFromLocation(search, now);

  useEffect(() => {
    if (!season) return;
    const stamp = `${dayStamp(seasonToday(search, now))}:${season}`;
    let last: string | null = null;
    try { last = localStorage.getItem(GREET_KEY); } catch { /* không có bộ nhớ: vẫn chào */ }
    if (last === stamp) return;
    const t = setTimeout(() => {
      speaker.say(greetingKey(season));
      try { localStorage.setItem(GREET_KEY, stamp); } catch { /* bỏ qua */ }
    }, GREET_DELAY_MS);
    return () => clearTimeout(t);
    // chỉ chào lại khi đổi mùa/ngày
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season]);

  if (!season) return null;
  return (
    <>
      <div className={styles.back} data-testid="season-layer" data-season={season} aria-hidden="true"><Back season={season} /></div>
      <div className={styles.front} aria-hidden="true"><Front season={season} /></div>
    </>
  );
}
