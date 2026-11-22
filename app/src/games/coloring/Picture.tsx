import { useId, type PointerEvent } from 'react';
import { VIEW, type Picture } from './pictures';
import type { FillId, Fills } from './paint';
import styles from './Picture.module.css';

/** Vệt loang: màu mới lan từ chỗ chạm ra khắp vùng (toạ độ trong khung 400). */
export type Splash = { region: string; x: number; y: number; prev: FillId | undefined; n: number };

type Props = {
  pic: Picture;
  fills: Fills;
  className?: string;
  onRegionDown?(region: string, e: PointerEvent<SVGPathElement>): void;
  splash?: Splash | null;
  /** Vùng vừa tô nảy nhẹ (n đổi để chạy lại hiệu ứng). */
  pop?: { region: string; n: number } | null;
  testId?: string;
};

function fillStyle(f: FillId | undefined, ids: { rainbow: string; sparkle: string }): string {
  if (!f) return 'var(--paper)';
  if (f === 'rainbow') return `url(#${ids.rainbow})`;
  if (f === 'sparkle') return `url(#${ids.sparkle})`;
  return `var(--paint-${f})`;
}

const RAINBOW = ['red', 'orange', 'yellow', 'green', 'sky', 'blue', 'purple'] as const;
const STAR = 'M10 2 L12.4 7.6 L18 10 L12.4 12.4 L10 18 L7.6 12.4 L2 10 L7.6 7.6 Z';

export function PictureSvg({ pic, fills, className, onRegionDown, splash, pop, testId }: Props) {
  const uid = useId().replace(/:/g, '');
  const ids = { rainbow: `rb${uid}`, sparkle: `sp${uid}`, clip: `cl${uid}` };
  const splashRegion = splash ? pic.regions.find((r) => r.id === splash.region) : undefined;
  return (
    <svg viewBox={`0 0 ${VIEW} ${VIEW}`} className={className} data-testid={testId} data-picture={pic.id}>
      <defs>
        <linearGradient id={ids.rainbow} x1="0" y1="0" x2="1" y2="1">
          {RAINBOW.map((c, i) => (
            <stop key={c} offset={i / (RAINBOW.length - 1)} style={{ stopColor: `var(--paint-${c})` }} />
          ))}
        </linearGradient>
        <pattern id={ids.sparkle} width="40" height="40" patternUnits="userSpaceOnUse">
          <rect width="40" height="40" style={{ fill: 'var(--paint-gold)' }} />
          <path d={STAR} style={{ fill: 'var(--paint-glint)' }} />
          <path d={STAR} transform="translate(22 20) scale(0.7)" style={{ fill: 'var(--paint-white)' }} />
          <circle cx="32" cy="8" r="2.5" style={{ fill: 'var(--paint-pink)' }} />
          <circle cx="8" cy="32" r="2" style={{ fill: 'var(--paint-white)' }} />
        </pattern>
        {splashRegion && (
          <clipPath id={ids.clip}>
            <path d={splashRegion.d} />
          </clipPath>
        )}
      </defs>
      {pic.regions.map((r) => {
        const f = fills[r.id];
        const shown = splash?.region === r.id ? splash.prev : f;
        const popping = pop?.region === r.id;
        return (
          <g key={r.id}>
            <path
              key={popping ? `p${pop.n}` : 'p'}
              d={r.d}
              className={popping ? `${styles.region} ${styles.pop}` : styles.region}
              style={{ fill: fillStyle(shown, ids) }}
              data-testid={onRegionDown ? `region-${r.id}` : undefined}
              data-fill={f ?? ''}
              onPointerDown={onRegionDown ? (e) => onRegionDown(r.id, e) : undefined}
            />
            {splash && splashRegion && splash.region === r.id && (
              <g clipPath={`url(#${ids.clip})`} pointerEvents="none">
                <circle
                  key={splash.n}
                  cx={splash.x}
                  cy={splash.y}
                  r={VIEW}
                  className={styles.splash}
                  style={{ fill: fillStyle(f, ids) }}
                />
                <path d={r.d} className={styles.outline} />
              </g>
            )}
          </g>
        );
      })}
      <g pointerEvents="none">
        {pic.details.map((d, i) => (
          <path key={i} d={d.d} className={styles[d.kind]} />
        ))}
      </g>
    </svg>
  );
}
