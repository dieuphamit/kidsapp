import { useId, type CSSProperties } from 'react';
import styles from './Game.module.css';

/**
 * Nền "tắm ở bờ ao": trời, đồi xa, bãi cỏ, ao có lá súng và hoa sen bên trái, vũng bùn (chỗ thú nghịch)
 * và xô gỗ đầy bọt bên phải. SVG tĩnh đúng khung 1194×834, màu phẳng từ tokens.css. Chỉ trang trí.
 */
const fill = (token: string, opacity?: number): { style: CSSProperties } => ({
  style: { fill: `var(--${token})`, ...(opacity === undefined ? {} : { fillOpacity: opacity }) },
});
const stop = (token: string, opacity = 1): CSSProperties => ({ stopColor: `var(--${token})`, stopOpacity: opacity });

/** Lá súng: hình tròn khuyết một góc. */
function Lily({ x, y, r, rot }: { x: number; y: number; r: number; rot: number }) {
  const a = (rot * Math.PI) / 180;
  const p = (da: number) => [x + Math.cos(a + da) * r, y + Math.sin(a + da) * r * 0.45];
  const [x1, y1] = p(0.35);
  const [x2, y2] = p(-0.35);
  return (
    <g>
      <path d={`M${x} ${y} L${x1} ${y1} A${r} ${r * 0.45} 0 1 1 ${x2} ${y2} Z`} {...fill('scene-leaf-dark')} transform="translate(0 3)" />
      <path d={`M${x} ${y} L${x1} ${y1} A${r} ${r * 0.45} 0 1 1 ${x2} ${y2} Z`} {...fill('world-lily')} />
    </g>
  );
}

function Lotus({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[-34, 0, 34].map((d) => (
        <ellipse key={d} cx={x} cy={y - 10} rx={7} ry={15} transform={`rotate(${d} ${x} ${y})`} {...fill('world-lotus')} />
      ))}
      <circle cx={x} cy={y - 6} r={4} {...fill('learn-yellow')} />
    </g>
  );
}

function Reed({ x, y, h, lean }: { x: number; y: number; h: number; lean: number }) {
  return (
    <g>
      <path d={`M${x} ${y} Q${x + lean * 0.4} ${y - h * 0.6} ${x + lean} ${y - h}`} style={{ fill: 'none', stroke: 'var(--world-reed)', strokeWidth: 5, strokeLinecap: 'round' }} />
      <rect x={x + lean - 6} y={y - h - 4} width={12} height={34} rx={6} {...fill('scene-bark')} transform={`rotate(${lean / 3} ${x + lean} ${y - h})`} />
    </g>
  );
}

export function BathScene() {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const id = (n: string) => `${uid}-${n}`;
  const url = (n: string) => `url(#${id(n)})`;
  return (
    <div className={styles.scene} aria-hidden="true">
      <svg className={styles.sceneSvg} viewBox="0 0 1194 834" preserveAspectRatio="xMidYMax slice">
        <defs>
          <linearGradient id={id('sky')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('sky-top')} />
            <stop offset="0.6" style={stop('sky-bottom')} />
          </linearGradient>
          <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={stop('scene-hill-mid')} />
            <stop offset="1" style={stop('scene-hill-near')} />
          </linearGradient>
          <radialGradient id={id('pond')} cx="0.45" cy="0.4" r="0.7">
            <stop offset="0" style={stop('world-water-light')} />
            <stop offset="0.75" style={stop('world-water')} />
            <stop offset="1" style={stop('learn-blue', 0.6)} />
          </radialGradient>
          <linearGradient id={id('wood')} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" style={stop('scene-wood-dark')} />
            <stop offset="0.35" style={stop('scene-wood')} />
            <stop offset="1" style={stop('scene-wood-dark')} />
          </linearGradient>
        </defs>

        <rect width="1194" height="834" style={{ fill: url('sky') }} />
        {/* mây */}
        {[
          [250, 96, 1],
          [760, 70, 0.8],
          [1010, 190, 0.7],
        ].map(([x, y, s]) => (
          <g key={x} transform={`translate(${x} ${y}) scale(${s})`}>
            <ellipse cx={0} cy={18} rx={92} ry={26} {...fill('scene-cloud-shade')} />
            <circle cx={-40} cy={4} r={32} {...fill('paper')} />
            <circle cx={8} cy={-8} r={42} {...fill('paper')} />
            <circle cx={52} cy={8} r={28} {...fill('paper')} />
            <ellipse cx={0} cy={16} rx={88} ry={22} {...fill('paper')} />
          </g>
        ))}
        {/* đồi xa */}
        <path d="M0 470 Q160 380 330 430 T690 410 T1000 400 T1194 430 L1194 834 L0 834 Z" {...fill('scene-hill-far')} />
        <path d="M0 520 Q260 450 520 500 T1000 480 T1194 500 L1194 834 L0 834 Z" style={{ fill: url('grass') }} />
        {/* bụi cây xa */}
        {[
          [70, 470, 46],
          [120, 486, 34],
          [1130, 452, 50],
          [1070, 476, 34],
        ].map(([x, y, r]) => (
          <g key={`${x}-${y}`}>
            <circle cx={x + 4} cy={y + 6} r={r} {...fill('scene-leaf-dark')} />
            <circle cx={x} cy={y} r={r} {...fill('scene-leaf')} />
            <circle cx={x - r * 0.3} cy={y - r * 0.35} r={r * 0.35} {...fill('scene-leaf-light')} />
          </g>
        ))}
        {/* bãi cỏ gần */}
        <path d="M0 640 Q300 600 600 630 T1194 620 L1194 834 L0 834 Z" {...fill('grass')} />

        {/* ao bên trái */}
        <g>
          {[[34, 690, 150, -10], [70, 676, 132, 6], [110, 686, 160, 18]].map(([x, y, h, lean]) => (
            <Reed key={x} x={x} y={y} h={h} lean={lean} />
          ))}
          <ellipse cx={90} cy={782} rx={300} ry={104} {...fill('scene-hill-shade')} />
          <ellipse cx={86} cy={786} rx={284} ry={92} style={{ fill: url('pond') }} />
          <ellipse cx={60} cy={760} rx={150} ry={22} style={{ fill: 'none', stroke: 'var(--paper)', strokeOpacity: 0.55, strokeWidth: 4 }} />
          <ellipse cx={150} cy={808} rx={90} ry={14} style={{ fill: 'none', stroke: 'var(--paper)', strokeOpacity: 0.4, strokeWidth: 3 }} />
          <Lily x={40} y={790} r={34} rot={20} />
          <Lily x={200} y={768} r={28} rot={200} />
          <Lily x={250} y={812} r={24} rot={120} />
          <Lotus x={52} y={786} />
        </g>

        {/* vũng bùn bên phải, chỗ thú vừa nghịch */}
        <g>
          <ellipse cx={1060} cy={642} rx={128} ry={30} {...fill('scene-bark')} />
          <ellipse cx={1054} cy={638} rx={112} ry={22} {...fill('world-mud')} />
          <ellipse cx={1030} cy={634} rx={36} ry={7} {...fill('scene-wood-light', 0.7)} />
          {[[930, 616, 7], [952, 600, 5], [1186, 620, 6], [1170, 604, 4], [990, 668, 5]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} {...fill('scene-bark')} />
          ))}
        </g>

        {/* xô gỗ đầy bọt và bánh xà phòng */}
        <g>
          <ellipse cx={1020} cy={804} rx={96} ry={16} {...fill('scene-hill-shade', 0.7)} />
          <path d="M944 700 L1096 700 L1080 800 L960 800 Z" style={{ fill: url('wood') }} />
          <rect x={940} y={722} width={160} height={10} rx={5} {...fill('scene-bark-dark')} />
          <rect x={950} y={770} width={140} height={10} rx={5} {...fill('scene-bark-dark')} />
          <ellipse cx={1020} cy={700} rx={78} ry={14} {...fill('world-water')} />
          {[[970, 694, 22], [1004, 684, 28], [1044, 688, 24], [1076, 696, 18], [1022, 668, 18], [988, 670, 14]].map(([x, y, r]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x + 2} cy={y + 3} r={r} {...fill('scene-cloud-shade')} />
              <circle cx={x} cy={y} r={r} {...fill('paper')} />
              <circle cx={x - r * 0.35} cy={y - r * 0.35} r={r * 0.22} {...fill('world-bubble')} />
            </g>
          ))}
          <rect x={872} y={772} width={64} height={32} rx={12} {...fill('scene-berry')} transform="rotate(-8 904 788)" />
          <rect x={880} y={772} width={40} height={10} rx={5} {...fill('paper', 0.55)} transform="rotate(-8 904 788)" />
        </g>
      </svg>
    </div>
  );
}
