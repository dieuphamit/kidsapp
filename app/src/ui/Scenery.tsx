import { useId, type CSSProperties } from 'react';
import styles from './Scenery.module.css';

/**
 * Phong cảnh nền dùng chung cho các trò 2D: trời, mặt trời, mây trôi, ba lớp đồi có đổ bóng,
 * cỏ, hoa, cây... Vẽ bằng một SVG tĩnh đúng khung Stage 1194×834 (nhẹ, không ảnh).
 * Chỉ trang trí: aria-hidden, không nhận chạm (pointer-events: none).
 */
export type SceneryVariant = 'garden' | 'farm' | 'meadow' | 'orchard' | 'room';

const W = 1194;
const H = 834;

/** Màu lấy từ tokens.css (SVG cần style, thuộc tính fill="var(--x)" không chạy trên mọi trình duyệt). */
const fill = (token: string, opacity?: number): { style: CSSProperties } => ({
  style: { fill: `var(--${token})`, ...(opacity === undefined ? {} : { fillOpacity: opacity }) },
});
const stop = (token: string, opacity = 1): CSSProperties => ({ stopColor: `var(--${token})`, stopOpacity: opacity });

/** Đường chân trời (y của lớp đồi xa) theo từng cảnh. */
const HORIZON: Record<Exclude<SceneryVariant, 'room'>, number> = {
  garden: 430,
  farm: 440,
  meadow: 450,
  orchard: 470,
};

export function Scenery({ variant }: { variant: SceneryVariant }) {
  // id gradient phải duy nhất trong trang; useId có ký tự đặc biệt nên lọc bớt
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;

  return (
    <div className={styles.scenery} aria-hidden="true" data-scenery={variant}>
      <svg className={styles.svg} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('sky-top')} />
            <stop offset="0.7" style={stop('sky-bottom')} />
          </linearGradient>
          <radialGradient id={id('glow')}>
            <stop offset="0" style={stop('scene-sun-core', 0.9)} />
            <stop offset="0.45" style={stop('scene-sun', 0.35)} />
            <stop offset="1" style={stop('scene-sun', 0)} />
          </radialGradient>
          <radialGradient id={id('sun')} cx="0.4" cy="0.38" r="0.65">
            <stop offset="0" style={stop('scene-sun-core')} />
            <stop offset="0.55" style={stop('scene-sun')} />
            <stop offset="1" style={stop('scene-sun-edge')} />
          </radialGradient>
          <linearGradient id={id('cloud')} gradientUnits="userSpaceOnUse" x1="0" y1="10" x2="0" y2="78">
            <stop offset="0.35" style={stop('paper')} />
            <stop offset="1" style={stop('scene-cloud-shade')} />
          </linearGradient>
          <linearGradient id={id('far')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('scene-hill-far')} />
            <stop offset="0.5" style={stop('scene-hill-mid')} />
          </linearGradient>
          <linearGradient id={id('mid')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('scene-hill-mid')} />
            <stop offset="0.45" style={stop('scene-hill-near')} />
          </linearGradient>
          <linearGradient id={id('near')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('scene-hill-near')} />
            <stop offset="0.55" style={stop('grass')} />
            <stop offset="1" style={stop('scene-hill-shade')} />
          </linearGradient>
          <radialGradient id={id('leaf')} cx="0.38" cy="0.3" r="0.75">
            <stop offset="0" style={stop('scene-leaf-shine')} />
            <stop offset="0.35" style={stop('scene-leaf-light')} />
            <stop offset="0.75" style={stop('scene-leaf')} />
            <stop offset="1" style={stop('scene-leaf-dark')} />
          </radialGradient>
          <linearGradient id={id('bark')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={stop('scene-bark')} />
            <stop offset="1" style={stop('scene-bark-dark')} />
          </linearGradient>
          <radialGradient id={id('fruit')} cx="0.35" cy="0.3" r="0.7">
            <stop offset="0" style={stop('clay-peach')} />
            <stop offset="0.45" style={stop('learn-red')} />
            <stop offset="1" style={stop('scene-barn-dark')} />
          </radialGradient>
        </defs>

        {variant === 'room' ? (
          <Room id={id} url={url} />
        ) : (
          <Outdoor variant={variant} horizon={HORIZON[variant]} url={url} />
        )}
      </svg>
    </div>
  );
}

type UrlFn = (name: string) => string;

/* ---------------- Ngoài trời ---------------- */

function Outdoor({ variant, horizon: y, url }: { variant: Exclude<SceneryVariant, 'room'>; horizon: number; url: UrlFn }) {
  return (
    <>
      <rect width={W} height={H} style={{ fill: url('sky') }} />
      <Sun url={url} />
      <Clouds url={url} />

      {/* Đồi xa: nhạt, hơi xanh lam (phối cảnh không khí) */}
      <path
        d={`M0 ${y} C 180 ${y - 60}, 360 ${y - 40}, 520 ${y - 8} S 860 ${y - 72}, ${W} ${y - 24} V${H} H0Z`}
        style={{ fill: url('far') }}
      />
      {/* Đồi giữa */}
      <path
        d={`M0 ${y + 80} C 200 ${y + 26}, 420 ${y + 48}, 640 ${y + 92} S 1000 ${y + 36}, ${W} ${y + 70} V${H} H0Z`}
        style={{ fill: url('mid') }}
      />
      <path
        d={`M0 ${y + 80} C 200 ${y + 26}, 420 ${y + 48}, 640 ${y + 92} S 1000 ${y + 36}, ${W} ${y + 70}`}
        className={styles.rimLight}
      />

      {variant === 'farm' && <Barn x={968} y={y + 96} />}
      {variant === 'farm' && <Haystack x={238} y={y + 112} />}
      {variant === 'orchard' && (
        <>
          <Tree x={300} y={y + 70} s={0.42} url={url} fruit />
          <Tree x={880} y={y + 64} s={0.38} url={url} fruit />
        </>
      )}

      {/* Đồi gần */}
      <path
        d={`M0 ${y + 196} C 260 ${y + 146}, 520 ${y + 176}, 760 ${y + 186} S 1080 ${y + 146}, ${W} ${y + 166} V${H} H0Z`}
        style={{ fill: url('near') }}
      />
      <path
        d={`M0 ${y + 196} C 260 ${y + 146}, 520 ${y + 176}, 760 ${y + 186} S 1080 ${y + 146}, ${W} ${y + 166}`}
        className={styles.rimLight}
      />

      {variant === 'farm' && <Fence y={y + 168} />}

      <Tufts y={y} />
      <Flowers y={y} dense={variant === 'meadow' || variant === 'garden'} />

      {variant === 'garden' && (
        <>
          <Tree x={70} y={y + 150} s={0.95} url={url} />
          <Tree x={1130} y={y + 140} s={0.85} url={url} />
        </>
      )}
      {variant === 'meadow' && (
        <>
          <Tree x={95} y={y + 168} s={1.05} url={url} />
          <Tree x={1110} y={y + 150} s={0.7} url={url} />
        </>
      )}
      {variant === 'orchard' && (
        <>
          <Tree x={80} y={y + 190} s={1.05} url={url} fruit />
          <Tree x={1115} y={y + 176} s={1} url={url} fruit />
        </>
      )}
      {variant === 'farm' && <Tree x={60} y={y + 150} s={0.8} url={url} />}
    </>
  );
}

function Sun({ url }: { url: UrlFn }) {
  return (
    <g className={styles.sun}>
      <circle cx={1000} cy={128} r={150} style={{ fill: url('glow') }} />
      <circle cx={1000} cy={128} r={54} style={{ fill: url('sun') }} />
    </g>
  );
}

/** Một đám mây phồng: các vòng tròn chồng nhau, đáy bằng, đổ bóng dưới. Hệ toạ độ 0..190 × 0..80. */
function Cloud({ x, y, s, url, slow }: { x: number; y: number; s: number; url: UrlFn; slow?: boolean }) {
  return (
    <g className={slow ? styles.cloudSlow : styles.cloud}>
      <g transform={`translate(${x} ${y}) scale(${s})`} style={{ fill: url('cloud') }}>
        <circle cx={48} cy={50} r={28} />
        <circle cx={86} cy={36} r={38} />
        <circle cx={128} cy={44} r={30} />
        <circle cx={158} cy={56} r={20} />
        <rect x={22} y={50} width={156} height={28} rx={14} />
      </g>
    </g>
  );
}

function Clouds({ url }: { url: UrlFn }) {
  return (
    <>
      <Cloud x={230} y={58} s={1} url={url} />
      <Cloud x={600} y={150} s={0.7} url={url} slow />
      <Cloud x={780} y={36} s={0.55} url={url} slow />
    </>
  );
}

/** Cây tán tròn: thân có sáng tối, tán nhiều cụm lá (mỗi cụm có điểm sáng riêng), tuỳ chọn có quả. */
function Tree({ x, y, s, url, fruit }: { x: number; y: number; s: number; url: UrlFn; fruit?: boolean }) {
  const blobs: [number, number, number][] = [
    [-52, -128, 46],
    [52, -124, 48],
    [0, -160, 60],
    [-32, -196, 42],
    [36, -198, 40],
    [-8, -112, 42],
  ];
  const fruits: [number, number][] = [
    [-40, -120],
    [30, -150],
    [55, -112],
    [-12, -186],
    [-60, -160],
    [10, -118],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <ellipse cx={0} cy={4} rx={70} ry={12} {...fill('scene-tuft', 0.35)} />
      <path d="M-14 4 C -12 -40, -10 -80, -7 -120 L 7 -120 C 10 -80, 12 -40, 14 4 Z" style={{ fill: url('bark') }} />
      <path d="M-4 -60 L -26 -96 M 4 -78 L 24 -104" className={styles.branch} />
      {/* lớp lá tối phía sau tạo chiều sâu */}
      {blobs.map(([bx, by, r], i) => (
        <circle key={`d${i}`} cx={bx + 4} cy={by + 6} r={r + 4} {...fill('scene-leaf-dark')} />
      ))}
      {blobs.map(([bx, by, r], i) => (
        <circle key={`l${i}`} cx={bx} cy={by} r={r} style={{ fill: url('leaf') }} />
      ))}
      {fruit &&
        fruits.map(([fx, fy], i) => (
          <g key={`f${i}`}>
            <circle cx={fx} cy={fy} r={11} style={{ fill: url('fruit') }} />
            <circle cx={fx - 3.5} cy={fy - 4} r={3} {...fill('paper', 0.75)} />
          </g>
        ))}
    </g>
  );
}

/** Kho thóc nhỏ đỏ hồng mái tím, viền trắng. Gốc toạ độ = góc dưới trái. */
function Barn({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={92} cy={2} rx={110} ry={12} {...fill('scene-tuft', 0.35)} />
      <path d="M0 0 V-108 L92 -168 L184 -108 V0 Z" {...fill('scene-barn')} />
      <path d="M150 0 V-130 L184 -108 V0 Z" {...fill('scene-barn-dark', 0.55)} />
      <path d="M-14 -102 L92 -178 L198 -102" className={styles.roof} />
      <rect x={58} y={-80} width={68} height={80} rx={6} {...fill('scene-barn-dark')} />
      <path d="M58 -80 L126 0 M126 -80 L58 0" className={styles.trim} />
      <rect x={58} y={-80} width={68} height={80} rx={6} className={styles.trimBox} />
      <circle cx={92} cy={-126} r={17} {...fill('scene-fence')} />
      <circle cx={92} cy={-126} r={11} {...fill('scene-barn-dark')} />
    </g>
  );
}

function Haystack({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <ellipse cx={0} cy={2} rx={66} ry={10} {...fill('scene-tuft', 0.35)} />
      <path d="M-58 0 C -60 -50, -30 -82, 0 -84 C 30 -82, 60 -50, 58 0 Z" {...fill('scene-wicker-light')} />
      <path d="M10 -84 C 40 -78, 60 -50, 58 0 L 22 0 C 30 -40, 24 -70, 10 -84 Z" {...fill('scene-wicker', 0.7)} />
      <path d="M-40 -30 q 10 -8 20 0 M -12 -56 q 10 -8 20 0 M 14 -24 q 10 -8 20 0" className={styles.straw} />
    </g>
  );
}

/** Hàng rào gỗ trắng chạy ngang, cột đầu nhọn. */
function Fence({ y }: { y: number }) {
  const posts: number[] = [];
  for (let x = 20; x < W; x += 74) posts.push(x);
  return (
    <g>
      <rect x={0} y={y - 52} width={W} height={11} rx={5} {...fill('scene-fence')} />
      <rect x={0} y={y - 26} width={W} height={11} rx={5} {...fill('scene-fence')} />
      <rect x={0} y={y - 43} width={W} height={3} {...fill('scene-fence-shade')} />
      <rect x={0} y={y - 17} width={W} height={3} {...fill('scene-fence-shade')} />
      {posts.map((px) => (
        <g key={px}>
          <path d={`M${px - 9} ${y} V${y - 62} L${px} ${y - 74} L${px + 9} ${y - 62} V${y} Z`} {...fill('scene-fence')} />
          <path d={`M${px + 3} ${y} V${y - 66} L${px + 9} ${y - 62} V${y} Z`} {...fill('scene-fence-shade')} />
        </g>
      ))}
    </g>
  );
}

/** Các khóm cỏ nhỏ rải trên đồi gần (vị trí cố định, không ngẫu nhiên để ảnh chụp ổn định). */
function Tufts({ y }: { y: number }) {
  const spots: [number, number][] = [
    [60, 240], [210, 300], [340, 228], [470, 330], [560, 252], [690, 300], [820, 236],
    [940, 318], [1060, 250], [1150, 330], [130, 360], [400, 384], [760, 372], [1010, 390],
  ];
  return (
    <g className={styles.tufts}>
      {spots.map(([x, dy]) => (
        <path key={`${x}-${dy}`} d={`M${x} ${y + dy} l-7 -15 M${x} ${y + dy} l0 -19 M${x} ${y + dy} l7 -15`} />
      ))}
    </g>
  );
}

/** Hoa nhỏ năm cánh: trắng, hồng đào, tím nhạt, nhuỵ vàng. */
function Flowers({ y, dense }: { y: number; dense: boolean }) {
  const all: [number, number, string][] = [
    [110, 262, 'paper'], [250, 336, 'clay-peach'], [395, 270, 'clay-lilac'], [520, 360, 'paper'],
    [655, 276, 'clay-peach'], [790, 340, 'paper'], [905, 268, 'clay-lilac'], [1090, 300, 'clay-peach'],
    [180, 300, 'clay-lilac'], [600, 318, 'paper'], [990, 352, 'paper'], [455, 250, 'clay-peach'],
  ];
  const list = dense ? all : all.slice(0, 7);
  return (
    <g>
      {list.map(([x, dy, color]) => {
        const cy = y + dy;
        return (
          <g key={`${x}-${dy}`}>
            {[0, 72, 144, 216, 288].map((a) => (
              <circle
                key={a}
                cx={x + 6 * Math.cos((a * Math.PI) / 180)}
                cy={cy + 6 * Math.sin((a * Math.PI) / 180)}
                r={5}
                {...fill(color)}
              />
            ))}
            <circle cx={x} cy={cy} r={3.6} {...fill('learn-yellow')} />
          </g>
        );
      })}
    </g>
  );
}

/* ---------------- Trong phòng (Ghép hình) ---------------- */

function Room({ id, url }: { id: (n: string) => string; url: UrlFn }) {
  const floorY = 650;
  return (
    <>
      <defs>
        <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop('scene-wall')} />
          <stop offset="1" style={stop('scene-wall-low')} />
        </linearGradient>
        <pattern id={id('dots')} width="56" height="56" patternUnits="userSpaceOnUse">
          <circle cx="14" cy="14" r="5" {...fill('scene-wall-dot')} />
          <circle cx="42" cy="42" r="5" {...fill('scene-wall-dot')} />
        </pattern>
        <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={stop('scene-wood')} />
          <stop offset="1" style={stop('scene-wood-dark')} />
        </linearGradient>
        <linearGradient id={id('curtain')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" style={stop('clay-peach')} />
          <stop offset="0.3" style={stop('scene-wall-dot')} />
          <stop offset="0.6" style={stop('clay-peach')} />
          <stop offset="1" style={stop('scene-pot')} />
        </linearGradient>
      </defs>

      {/* Tường + giấy dán tường chấm bi */}
      <rect width={W} height={floorY} style={{ fill: url('wall') }} />
      <rect width={W} height={floorY} style={{ fill: url('dots') }} />

      {/* Cửa sổ nhìn ra đồi xanh */}
      <g transform="translate(469 22) scale(0.8)">
        <rect x={-14} y={-6} width={348} height={196} rx={22} {...fill('scene-wood')} />
        <rect x={0} y={6} width={320} height={172} rx={12} style={{ fill: url('sky') }} />
        <circle cx={250} cy={52} r={26} style={{ fill: url('sun') }} />
        <path d="M0 132 C 80 100, 160 118, 220 128 S 300 110, 320 118 V178 H0 Z" {...fill('scene-hill-mid')} />
        <path d="M0 156 C 100 136, 200 150, 320 144 V178 H0 Z" {...fill('scene-hill-near')} />
        <rect x={154} y={6} width={12} height={172} {...fill('scene-wood')} />
        <rect x={0} y={86} width={320} height={10} {...fill('scene-wood')} />
        <rect x={-22} y={180} width={364} height={18} rx={9} {...fill('scene-wood-dark')} />
        {/* rèm hai bên */}
        <path d="M-40 -18 H40 C 30 60, 20 120, 46 196 H-40 Z" style={{ fill: url('curtain') }} />
        <path d="M280 -18 H360 V196 H274 C 300 120, 290 60, 280 -18 Z" style={{ fill: url('curtain') }} />
        <rect x={-50} y={-26} width={420} height={14} rx={7} {...fill('scene-wood-dark')} />
      </g>

      {/* Chân tường + sàn gỗ */}
      <rect x={0} y={floorY - 14} width={W} height={16} {...fill('paper')} />
      <rect x={0} y={floorY - 14} width={W} height={3} {...fill('scene-wall-dot')} />
      <rect x={0} y={floorY} width={W} height={H - floorY} style={{ fill: url('floor') }} />
      <g className={styles.planks}>
        {[688, 734, 788].map((py) => (
          <line key={py} x1={0} y1={py} x2={W} y2={py} />
        ))}
        {[[180, 650, 688], [620, 650, 688], [980, 650, 688], [400, 688, 734], [860, 688, 734], [120, 734, 788], [560, 734, 788], [1040, 734, 788], [330, 788, 834], [780, 788, 834]].map(
          ([x, y1, y2]) => (
            <line key={`${x}-${y1}`} x1={x} y1={y1} x2={x} y2={y2} />
          ),
        )}
      </g>

      {/* Thảm tròn tím nhạt dưới bàn ghép */}
      <ellipse cx={597} cy={748} rx={360} ry={58} {...fill('clay-lilac')} />
      <ellipse cx={597} cy={748} rx={330} ry={46} className={styles.rugStitch} />

      {/* Chậu cây góc phải */}
      <g transform="translate(1108 800)">
        <ellipse cx={0} cy={6} rx={56} ry={10} {...fill('scene-wood-dark', 0.6)} />
        {[[-30, -70, -30], [26, -76, 28], [0, -96, 0], [-14, -60, -55], [16, -58, 55]].map(([lx, ly, rot]) => (
          <ellipse key={`${lx}-${ly}`} cx={lx} cy={ly} rx={16} ry={40} transform={`rotate(${rot} ${lx} ${ly})`} style={{ fill: url('leaf') }} />
        ))}
        <path d="M-40 -34 H40 L30 6 H-30 Z" {...fill('scene-pot')} />
        <path d="M10 -34 H40 L30 6 H6 Z" {...fill('scene-pot-dark', 0.6)} />
        <rect x={-46} y={-44} width={92} height={16} rx={6} {...fill('scene-pot-dark')} />
      </g>
    </>
  );
}
