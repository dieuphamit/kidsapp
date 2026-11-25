import type { CSSProperties } from 'react';
import type { Level } from '../../core/variety';
import type { Act, MissionId } from './logic';
import { BARN, BRANCH_Y, GROUND_Y, HOME_PAD, MEDKIT, PIER, PUDDLE, ROCK, STAGE_H, STAGE_W, TREE, WATER_Y } from './layout';
import styles from './Game.module.css';

/**
 * Đạo cụ cảnh cứu hộ, vẽ bằng SVG màu phẳng bo tròn (chỉ dùng màu trong tokens.css).
 * SceneBack/SceneFront vẽ theo toạ độ khung 1194×834 nên dùng lại được cho cả cảnh cứu hộ lẫn
 * hình thu nhỏ trong bong bóng tình huống.
 */
const fill = (token: string, opacity?: number): { style: CSSProperties } => ({
  style: { fill: `var(--${token})`, ...(opacity === undefined ? {} : { fillOpacity: opacity }) },
});
const line = (token: string, width: number, opacity?: number): { style: CSSProperties } => ({
  style: {
    stroke: `var(--${token})`,
    strokeWidth: width,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    fill: 'none',
    ...(opacity === undefined ? {} : { strokeOpacity: opacity }),
  },
});

function Barn() {
  const { x, y } = BARN;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={30} y={150} width={290} height={232} rx={18} {...fill('scene-barn')} />
      <rect x={30} y={330} width={290} height={52} {...fill('scene-barn-dark', 0.5)} />
      <path d="M4 170 L175 36 L346 170 Z" {...fill('scene-roof')} />
      <path d="M4 170 L175 36 L346 170 Z" {...line('scene-roof', 22)} />
      <circle cx={175} cy={128} r={26} {...fill('scene-wall')} />
      <rect x={118} y={226} width={114} height={156} rx={16} {...fill('scene-barn-dark')} />
      <path d="M130 240 L220 370 M220 240 L130 370" {...line('scene-fence', 9)} />
      <rect x={48} y={206} width={54} height={60} rx={12} {...fill('scene-wall')} />
      <path d="M75 208 L75 264 M50 236 L100 236" {...line('scene-barn-dark', 6)} />
      <rect x={248} y={206} width={54} height={60} rx={12} {...fill('scene-wall')} />
      <path d="M275 208 L275 264 M250 236 L300 236" {...line('scene-barn-dark', 6)} />
    </g>
  );
}

function Tree({ level }: { level: Level }) {
  const tx = TREE.trunkX;
  const by = BRANCH_Y[level];
  return (
    <g>
      <rect x={tx - 34} y={170} width={68} height={GROUND_Y - 170 + 14} rx={24} {...fill('scene-bark')} />
      <rect x={tx - 34} y={170} width={22} height={GROUND_Y - 170 + 14} rx={11} {...fill('scene-bark-dark', 0.45)} />
      {/* cành bạn thú đang đứng */}
      <path d={`M${tx} ${by + 34} Q${tx - 120} ${by + 24} ${TREE.animalX - 6} ${by + 13}`} {...line('scene-bark', 26)} />
      <circle cx={TREE.animalX - 14} cy={by - 2} r={30} {...fill('scene-leaf')} />
      <circle cx={TREE.animalX + 14} cy={by - 16} r={22} {...fill('scene-leaf-light')} />
      {/* tán lá */}
      <circle cx={tx - 108} cy={196} r={104} {...fill('scene-leaf-dark')} />
      <circle cx={tx + 100} cy={176} r={112} {...fill('scene-leaf-dark')} />
      <circle cx={tx - 6} cy={118} r={118} {...fill('scene-leaf')} />
      <circle cx={tx - 70} cy={150} r={70} {...fill('scene-leaf-light')} />
      <circle cx={tx + 56} cy={96} r={56} {...fill('scene-leaf-light')} />
      <circle cx={tx - 34} cy={76} r={26} {...fill('scene-leaf-shine', 0.8)} />
      <ellipse cx={tx} cy={GROUND_Y + 8} rx={120} ry={18} {...fill('scene-tuft', 0.5)} />
    </g>
  );
}

function Puddle() {
  const cx = PUDDLE.x + PUDDLE.w / 2;
  const cy = PUDDLE.y + PUDDLE.h / 2;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={PUDDLE.w / 2} ry={PUDDLE.h / 2} {...fill('scene-bark')} />
      <ellipse cx={cx - 8} cy={cy - 4} rx={PUDDLE.w / 2 - 22} ry={PUDDLE.h / 2 - 12} {...fill('scene-wood-dark')} />
      <ellipse cx={cx - 90} cy={cy - 12} rx={46} ry={9} {...fill('world-mud', 0.8)} />
      <circle cx={PUDDLE.x - 8} cy={cy + 12} r={14} {...fill('scene-bark')} />
      <circle cx={PUDDLE.x + PUDDLE.w + 6} cy={cy - 6} r={11} {...fill('scene-bark')} />
    </g>
  );
}

function Lake() {
  return (
    <g>
      <rect x={-4} y={WATER_Y} width={STAGE_W + 8} height={STAGE_H - WATER_Y + 4} {...fill('world-water')} />
      <path d={`M-4 ${WATER_Y} Q150 ${WATER_Y - 16} 300 ${WATER_Y} T600 ${WATER_Y} T900 ${WATER_Y} T1200 ${WATER_Y} L1200 ${WATER_Y + 30} L-4 ${WATER_Y + 30} Z`} {...fill('world-water')} />
      <path d={`M40 ${WATER_Y + 26} q40 -12 80 0 M700 ${WATER_Y + 18} q40 -12 80 0 M1010 ${WATER_Y + 40} q40 -12 80 0`} {...line('world-water-light', 7)} />
      {/* cầu gỗ ở bờ: chỗ an toàn */}
      <rect x={PIER.x + 26} y={PIER.y + 20} width={22} height={PIER.h} rx={9} {...fill('scene-wood-dark')} />
      <rect x={PIER.x + PIER.w - 48} y={PIER.y + 20} width={22} height={PIER.h} rx={9} {...fill('scene-wood-dark')} />
      <rect x={PIER.x} y={PIER.y} width={PIER.w} height={34} rx={14} {...fill('scene-wood')} />
      <rect x={PIER.x + 8} y={PIER.y + 4} width={PIER.w - 16} height={9} rx={4} {...fill('scene-wood-light')} />
      {[1, 2, 3].map((k) => (
        <path key={k} d={`M${PIER.x + (PIER.w * k) / 4} ${PIER.y + 4} l0 26`} {...line('scene-wood-dark', 4, 0.6)} />
      ))}
    </g>
  );
}

function Rock() {
  const { x, y, w, h } = ROCK;
  return (
    <g>
      <path d={`M${x + 8} ${y + h} Q${x - 14} ${y + 60} ${x + 46} ${y + 14} Q${x + w / 2} ${y - 14} ${x + w - 60} ${y + 12} Q${x + w + 16} ${y + 70} ${x + w - 4} ${y + h} Z`} {...fill('world-rock')} />
      <path d={`M${x + 46} ${y + 14} Q${x + w / 2} ${y - 14} ${x + w - 60} ${y + 12} Q${x + w / 2} ${y + 44} ${x + 46} ${y + 14} Z`} {...fill('scene-wall', 0.7)} />
      <path d={`M${x + 70} ${y + 90} q30 20 20 70 M${x + w - 90} ${y + 80} q-24 40 -6 90`} {...line('paint-gray', 8, 0.6)} />
      <ellipse cx={x + w / 2} cy={y + h} rx={w / 2 + 26} ry={20} {...fill('scene-hill-shade')} />
      <circle cx={x + 6} cy={y + h - 8} r={22} {...fill('scene-leaf')} />
      <circle cx={x + w - 4} cy={y + h - 6} r={18} {...fill('scene-leaf-light')} />
      <circle cx={x + 36} cy={y + 30} r={20} {...fill('scene-leaf')} />
      <circle cx={x + w - 42} cy={y + 24} r={16} {...fill('scene-leaf-light')} />
      {/* ổ rơm êm ở bãi cỏ: chỗ an toàn */}
      <ellipse cx={HOME_PAD.x + HOME_PAD.w / 2} cy={HOME_PAD.y + HOME_PAD.h / 2} rx={HOME_PAD.w / 2} ry={HOME_PAD.h / 2} {...fill('scene-wicker')} />
      <ellipse cx={HOME_PAD.x + HOME_PAD.w / 2} cy={HOME_PAD.y + HOME_PAD.h / 2 - 8} rx={HOME_PAD.w / 2 - 20} ry={HOME_PAD.h / 2 - 12} {...fill('scene-wicker-light')} />
    </g>
  );
}

function Medkit() {
  const { x, y, w, h } = MEDKIT;
  return (
    <g>
      <path d={`M${x + w / 2 - 26} ${y + 6} q0 -26 26 -26 q26 0 26 26`} {...line('paint-gray', 10)} />
      <rect x={x} y={y} width={w} height={h} rx={22} {...fill('paper')} />
      <rect x={x} y={y} width={w} height={h} rx={22} {...line('scene-cloud-shade', 5)} />
      <rect x={x + w / 2 - 13} y={y + h / 2 - 34} width={26} height={68} rx={8} {...fill('learn-red')} />
      <rect x={x + w / 2 - 34} y={y + h / 2 - 13} width={68} height={26} rx={8} {...fill('learn-red')} />
    </g>
  );
}

/** Lớp nền của cảnh (sau xe và bạn thú). `mini` = trong bong bóng: thêm trời và cỏ. */
export function SceneBack({ mission, level, mini = false }: { mission: MissionId; level: Level; mini?: boolean }) {
  return (
    <svg className={styles.sceneSvg} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
      {mini && (
        <g>
          <rect width={STAGE_W} height={STAGE_H} {...fill('sky-top')} />
          <rect y={GROUND_Y - 46} width={STAGE_W} height={STAGE_H} {...fill('scene-hill-near')} />
          <rect y={GROUND_Y - 46} width={STAGE_W} height={16} {...fill('scene-hill-mid')} />
        </g>
      )}
      {mission === 'fire' && <Barn />}
      {mission === 'tree' && <Tree level={level} />}
      {mission === 'mud' && <Puddle />}
      {mission === 'lake' && <Lake />}
      {mission === 'hurt' && <Medkit />}
      {mission === 'sky' && <Rock />}
    </svg>
  );
}

/** Lớp trước (che chân bạn thú trong bùn, mạn xuồng trong nước). */
export function SceneFront({ mission }: { mission: MissionId }) {
  if (mission !== 'mud' && mission !== 'lake') return null;
  const cx = PUDDLE.x + PUDDLE.w / 2;
  const top = WATER_Y + 34;
  return (
    <svg className={styles.sceneSvgFront} viewBox={`0 0 ${STAGE_W} ${STAGE_H}`} aria-hidden="true">
      {mission === 'mud' ? (
        <g>
          <path d={`M${cx - 176} ${GROUND_Y + 4} Q${cx} ${GROUND_Y - 22} ${cx + 176} ${GROUND_Y + 4} Q${cx + 150} ${PUDDLE.y + PUDDLE.h - 4} ${cx} ${PUDDLE.y + PUDDLE.h - 2} Q${cx - 150} ${PUDDLE.y + PUDDLE.h - 4} ${cx - 176} ${GROUND_Y + 4} Z`} {...fill('scene-wood-dark')} />
          <ellipse cx={cx + 60} cy={GROUND_Y + 20} rx={40} ry={7} {...fill('world-mud', 0.7)} />
        </g>
      ) : (
        <g className={styles.waves}>
          <path d={`M-80 ${top} q40 -14 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 L1280 ${STAGE_H + 4} L-80 ${STAGE_H + 4} Z`} {...fill('world-water', 0.92)} />
          <path d={`M-80 ${top + 54} q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0`} {...line('world-water-light', 7, 0.8)} />
          <path d={`M-40 ${top + 120} q40 -12 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0`} {...line('world-water-light', 7, 0.5)} />
        </g>
      )}
    </svg>
  );
}

/** Ngọn lửa hoạt hình nhỏ với khói tròn; `left` 1 → 0 thì nhỏ dần rồi tắt. */
export function Flame({ left }: { left: number }) {
  const out = left <= 0;
  return (
    <div className={styles.flame} data-out={out ? '' : undefined} style={{ '--left': Math.max(0, Math.min(1, left)) } as CSSProperties}>
      <span className={styles.smoke} data-k="0" />
      <span className={styles.smoke} data-k="1" />
      <span className={styles.smoke} data-k="2" />
      {!out && (
        <svg className={styles.flameSvg} viewBox="0 0 100 120">
          <path d="M50 4 Q86 46 84 78 Q82 114 50 116 Q18 114 16 78 Q14 54 34 34 Q36 52 46 52 Q40 28 50 4 Z" {...fill('learn-orange')} />
          <path d="M50 44 Q70 70 68 88 Q66 110 50 110 Q34 110 32 88 Q32 72 42 62 Q44 72 50 70 Q46 58 50 44 Z" {...fill('learn-yellow')} />
          <ellipse cx={50} cy={96} rx={10} ry={12} {...fill('paper', 0.7)} />
        </svg>
      )}
    </div>
  );
}

/** Dụng cụ bé kéo/chà, vẽ trong ô 100×100. */
export function Tool({ act }: { act: Act }) {
  switch (act) {
    case 'hook':
    case 'pull':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <circle cx={50} cy={22} r={13} {...line('learn-yellow', 10)} />
          <path d="M50 36 L50 58 Q50 84 32 84 Q16 84 18 64" {...line('paint-gray', 13)} />
        </svg>
      );
    case 'buoy':
    case 'tow':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <circle cx={50} cy={50} r={31} {...line('learn-red', 22)} />
          <circle cx={50} cy={50} r={31} style={{ ...line('paper', 22).style, strokeDasharray: '24.3 24.4', strokeLinecap: 'butt' }} />
        </svg>
      );
    case 'plaster':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <g transform="rotate(-24 50 50)">
            <rect x={6} y={31} width={88} height={38} rx={19} {...fill('clay-peach')} />
            <rect x={35} y={35} width={30} height={30} rx={7} {...fill('scene-wall')} />
            {[16, 26, 74, 84].map((x) => (
              <circle key={x} cx={x} cy={50} r={3} {...fill('scene-pot-dark', 0.6)} />
            ))}
          </g>
        </svg>
      );
    case 'basketDown':
    case 'basketUp':
    case 'basketHome':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <path d="M50 2 L16 46 M50 2 L84 46" {...line('scene-wicker-dark', 5)} />
          <path d="M8 46 L92 46 L82 92 Q80 98 72 98 L28 98 Q20 98 18 92 Z" {...fill('scene-wicker')} />
          <path d="M22 60 L78 60 M24 74 L76 74 M26 87 L74 87" {...line('scene-wicker-dark', 4, 0.7)} />
          <rect x={4} y={40} width={92} height={14} rx={7} {...fill('scene-wicker-dark')} />
        </svg>
      );
    case 'wash':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <rect x={12} y={24} width={76} height={54} rx={20} {...fill('learn-yellow')} />
          <rect x={12} y={24} width={76} height={18} rx={9} {...fill('paper', 0.4)} />
          {[[30, 52, 6], [50, 62, 5], [68, 50, 7], [44, 44, 4]].map(([x, y, r]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={r} {...fill('learn-orange', 0.6)} />
          ))}
          <circle cx={84} cy={22} r={9} {...fill('world-bubble')} />
          <circle cx={20} cy={18} r={6} {...fill('world-bubble')} />
        </svg>
      );
    case 'dry':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <rect x={14} y={14} width={72} height={74} rx={14} {...fill('clay-mint')} />
          <path d="M14 34 L86 34 M14 68 L86 68" {...line('paper', 8)} />
          <path d="M22 88 l0 8 M36 88 l0 8 M50 88 l0 8 M64 88 l0 8 M78 88 l0 8" {...line('clay-mint', 5)} />
        </svg>
      );
    case 'clean':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <circle cx={36} cy={54} r={24} {...fill('paper')} />
          <circle cx={62} cy={50} r={26} {...fill('paper')} />
          <circle cx={50} cy={36} r={22} {...fill('paper')} />
          <circle cx={52} cy={66} r={20} {...fill('scene-cloud-shade')} />
          <circle cx={46} cy={46} r={18} {...fill('paper')} />
        </svg>
      );
    case 'spray':
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <path d="M50 12 Q78 50 78 64 A28 28 0 0 1 22 64 Q22 50 50 12 Z" {...fill('world-water')} />
          <ellipse cx={40} cy={62} rx={8} ry={12} {...fill('paper', 0.7)} />
        </svg>
      );
    default:
      // đầu thang / chính bạn thú: tay nắm tròn
      return (
        <svg viewBox="0 0 100 100" className={styles.toolSvg}>
          <circle cx={50} cy={50} r={26} {...fill('learn-yellow')} />
          <circle cx={42} cy={42} r={9} {...fill('paper', 0.7)} />
        </svg>
      );
  }
}

/** Băng dán đã dán lên chỗ đau. */
export function Plaster() {
  return <Tool act="plaster" />;
}

export function Heart() {
  return (
    <svg viewBox="0 0 100 100" className={styles.toolSvg}>
      <path d="M50 88 Q8 56 12 32 Q16 12 34 14 Q46 16 50 30 Q54 16 66 14 Q84 12 88 32 Q92 56 50 88 Z" {...fill('learn-red')} />
      <ellipse cx={32} cy={32} rx={8} ry={11} {...fill('paper', 0.55)} />
    </svg>
  );
}

/** Biểu cảm nhỏ trên đầu bạn thú: lo lắng (giọt mồ hôi), hy vọng (ánh sao), vui (tim). */
export function Emote({ mood }: { mood: 'worried' | 'hope' | 'happy' }) {
  if (mood === 'happy') return <Heart />;
  if (mood === 'hope') {
    return (
      <svg viewBox="0 0 100 100" className={styles.toolSvg}>
        <path d="M50 6 Q56 40 94 50 Q56 60 50 94 Q44 60 6 50 Q44 40 50 6 Z" {...fill('learn-yellow')} />
        <circle cx={50} cy={50} r={9} {...fill('paper', 0.8)} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 100 100" className={styles.toolSvg}>
      <path d="M50 10 Q80 52 80 66 A30 30 0 0 1 20 66 Q20 52 50 10 Z" {...fill('world-water')} />
      <ellipse cx={39} cy={64} rx={8} ry={12} {...fill('paper', 0.7)} />
    </svg>
  );
}

/** Chuông báo trên nóc ga-ra. */
export function Bell() {
  return (
    <svg viewBox="0 0 100 100" className={styles.toolSvg}>
      <path d="M50 12 Q80 14 80 54 L90 74 L10 74 L20 54 Q20 14 50 12 Z" {...fill('learn-yellow')} />
      <path d="M30 30 Q34 20 46 18" {...line('paper', 6, 0.8)} />
      <rect x={8} y={68} width={84} height={12} rx={6} {...fill('learn-orange')} />
      <circle cx={50} cy={86} r={9} {...fill('learn-orange')} />
      <circle cx={50} cy={10} r={7} {...fill('learn-orange')} />
    </svg>
  );
}

/** Mũ đội trưởng cứu hộ. */
export function Helmet() {
  return (
    <svg viewBox="0 0 100 60" className={styles.toolSvg}>
      <path d="M14 46 Q14 6 50 6 Q86 6 86 46 Z" {...fill('learn-red')} />
      <rect x={2} y={42} width={96} height={14} rx={7} {...fill('learn-red')} />
      <rect x={2} y={42} width={96} height={14} rx={7} {...fill('ink', 0.14)} />
      <path d="M50 16 L60 24 L57 38 L43 38 L40 24 Z" {...fill('learn-yellow')} />
      <path d="M26 30 Q28 16 42 12" {...line('paper', 5, 0.6)} />
    </svg>
  );
}
