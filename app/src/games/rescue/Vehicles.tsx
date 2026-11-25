import type { CSSProperties, ReactNode } from 'react';
import type { VehicleId } from './logic';
import styles from './Game.module.css';

/**
 * Sáu chiếc xe cứu hộ vẽ bằng SVG màu phẳng, bo tròn kiểu đất sét (chỉ dùng màu trong tokens.css).
 * Khung vẽ 380×250, xe quay mặt sang phải, bánh chạm đáy khung. Bánh xe, đèn nháy, cánh quạt là
 * phần tử riêng để CSS cho quay/nháy khi `moving` / `lights`.
 */
const fill = (token: string, opacity?: number): { style: CSSProperties } => ({
  style: { fill: `var(--${token})`, ...(opacity === undefined ? {} : { fillOpacity: opacity }) },
});
const line = (token: string, width: number): { style: CSSProperties } => ({
  style: { stroke: `var(--${token})`, strokeWidth: width, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' },
});

function Wheel({ cx, cy = 204, r = 42 }: { cx: number; cy?: number; r?: number }) {
  return (
    <g className={styles.wheel}>
      <circle cx={cx} cy={cy} r={r} {...fill('paint-black')} />
      <circle cx={cx} cy={cy} r={r * 0.56} {...fill('paint-gray')} />
      <circle cx={cx} cy={cy} r={r * 0.2} {...fill('paper')} />
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + 0.4;
        return <circle key={k} cx={cx + Math.cos(a) * r * 0.38} cy={cy + Math.sin(a) * r * 0.38} r={r * 0.09} {...fill('paint-black')} />;
      })}
    </g>
  );
}

/** Đèn ưu tiên trên nóc: nháy khi xe nổ máy. */
function Beacon({ x, y, color = 'learn-blue' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <rect x={x - 4} y={y + 16} width={44} height={10} rx={5} {...fill('paint-gray')} />
      <rect className={styles.beacon} x={x} y={y} width={36} height={22} rx={11} {...fill(color)} />
      <circle className={styles.beaconGlow} cx={x + 18} cy={y + 10} r={30} {...fill(color, 0.35)} />
    </g>
  );
}

const Window = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={12} {...fill('world-water-light')} />
    <rect x={x + 6} y={y + 6} width={w * 0.3} height={h * 0.34} rx={6} {...fill('paper', 0.7)} />
  </g>
);

const Headlight = ({ x, y }: { x: number; y: number }) => <rect x={x} y={y} width={16} height={22} rx={8} {...fill('learn-yellow')} />;

function Firetruck() {
  return (
    <>
      <rect x={14} y={92} width={256} height={110} rx={24} {...fill('learn-red')} />
      <rect x={248} y={66} width={116} height={136} rx={28} {...fill('learn-red')} />
      <rect x={26} y={100} width={220} height={22} rx={11} {...fill('paper', 0.28)} />
      <rect x={14} y={152} width={350} height={14} {...fill('paper')} />
      <Window x={292} y={84} w={58} h={50} />
      {/* cuộn vòi nước */}
      <circle cx={92} cy={132} r={30} {...fill('learn-yellow')} />
      <circle cx={92} cy={132} r={19} {...line('learn-orange', 7)} />
      <circle cx={92} cy={132} r={7} {...fill('learn-orange')} />
      <rect x={150} y={108} width={74} height={38} rx={10} {...fill('scene-barn-dark')} />
      <rect x={158} y={116} width={24} height={22} rx={5} {...fill('learn-yellow')} />
      <rect x={190} y={116} width={24} height={22} rx={5} {...fill('paper')} />
      {/* súng phun nước trên nóc */}
      <rect x={270} y={46} width={36} height={24} rx={8} {...fill('paint-gray')} />
      <path d="M284 56 L316 30" {...line('paint-gray', 16)} />
      <circle cx={318} cy={30} r={10} {...fill('learn-yellow')} />
      <Beacon x={196} y={66} />
      <Headlight x={352} y={128} />
      <rect x={346} y={178} width={28} height={20} rx={8} {...fill('paint-gray')} />
      <Wheel cx={84} />
      <Wheel cx={292} />
    </>
  );
}

function LadderTruck({ noLadder }: { noLadder?: boolean }) {
  return (
    <>
      <rect x={14} y={124} width={256} height={78} rx={22} {...fill('learn-orange')} />
      <rect x={248} y={80} width={116} height={122} rx={28} {...fill('learn-orange')} />
      <rect x={14} y={160} width={350} height={12} {...fill('learn-yellow')} />
      <Window x={292} y={96} w={58} h={46} />
      {/* bàn xoay chân thang */}
      <rect x={296} y={56} width={68} height={26} rx={10} {...fill('paint-gray')} />
      <circle cx={330} cy={66} r={9} {...fill('paint-black')} />
      {/* thang gấp nằm trên thùng xe */}
      {!noLadder && (
        <g>
          <path d="M22 108 L318 74 M22 86 L318 52" {...line('scene-wicker', 10)} />
          {[0, 1, 2, 3, 4, 5, 6].map((k) => (
            <path key={k} d={`M${46 + k * 40} ${105 - k * 4.6} L${46 + k * 40} ${83 - k * 4.6}`} {...line('scene-wicker', 8)} />
          ))}
        </g>
      )}
      <Beacon x={200} y={98} color="learn-yellow" />
      <Headlight x={352} y={134} />
      <rect x={346} y={178} width={28} height={20} rx={8} {...fill('paint-gray')} />
      <Wheel cx={84} />
      <Wheel cx={292} />
    </>
  );
}

function Tractor() {
  return (
    <>
      <rect x={292} y={54} width={14} height={62} rx={7} {...fill('paint-gray')} />
      <rect x={148} y={108} width={196} height={86} rx={24} {...fill('learn-green')} />
      <rect x={160} y={116} width={170} height={18} rx={9} {...fill('paper', 0.3)} />
      <rect x={66} y={34} width={128} height={126} rx={24} {...fill('learn-green')} />
      <rect x={54} y={22} width={152} height={22} rx={11} {...fill('scene-leaf-dark')} />
      <Window x={84} y={54} w={92} h={58} />
      <rect x={230} y={140} width={84} height={26} rx={10} {...fill('scene-leaf-dark')} />
      {/* tời kéo phía trước */}
      <rect x={334} y={154} width={38} height={32} rx={10} {...fill('learn-yellow')} />
      <circle cx={366} cy={170} r={8} {...fill('paint-black')} />
      <Beacon x={112} y={0} color="learn-orange" />
      <Headlight x={338} y={118} />
      <Wheel cx={100} cy={176} r={70} />
      <Wheel cx={300} cy={208} r={38} />
    </>
  );
}

function Boat({ onLand }: { onLand?: boolean }) {
  return (
    <>
      <rect x={228} y={14} width={8} height={50} rx={4} {...fill('paint-gray')} />
      <path d="M236 16 L276 28 L236 40 Z" {...fill('learn-orange')} />
      <rect x={104} y={70} width={150} height={86} rx={20} {...fill('paper')} />
      <rect x={94} y={58} width={170} height={22} rx={11} {...fill('learn-red')} />
      <circle cx={146} cy={116} r={22} {...fill('world-water-light')} />
      <circle cx={146} cy={116} r={22} {...line('learn-blue', 6)} />
      <circle cx={208} cy={116} r={22} {...fill('world-water-light')} />
      <circle cx={208} cy={116} r={22} {...line('learn-blue', 6)} />
      <path d="M8 146 L372 146 Q356 226 296 226 L70 226 Q22 226 8 146 Z" {...fill('learn-blue')} />
      <path d="M12 160 L368 160" {...line('paper', 10)} />
      <path d="M30 150 L352 150" {...line('paper', 6)} style={{ ...line('paper', 6).style, strokeOpacity: 0.35 }} />
      {/* phao tròn treo bên mạn và cọc buộc dây ở mũi */}
      <circle cx={300} cy={190} r={17} {...line('learn-red', 11)} />
      <rect x={348} y={130} width={16} height={22} rx={6} {...fill('paint-gray')} />
      <Beacon x={152} y={36} />
      {onLand && (
        <g>
          <rect x={56} y={222} width={250} height={12} rx={6} {...fill('paint-gray')} />
          <Wheel cx={110} cy={232} r={16} />
          <Wheel cx={250} cy={232} r={16} />
        </g>
      )}
    </>
  );
}

function Ambulance() {
  return (
    <>
      <rect x={14} y={58} width={266} height={144} rx={26} {...fill('paper')} />
      <rect x={256} y={92} width={108} height={110} rx={26} {...fill('paper')} />
      <rect x={14} y={58} width={266} height={144} rx={26} {...line('scene-cloud-shade', 5)} />
      <rect x={14} y={154} width={350} height={18} {...fill('learn-red')} />
      <Window x={296} y={106} w={54} h={42} />
      <Window x={32} y={78} w={56} h={50} />
      {/* chữ thập */}
      <circle cx={170} cy={106} r={42} {...fill('scene-wall-low')} />
      <rect x={156} y={76} width={28} height={60} rx={8} {...fill('learn-red')} />
      <rect x={140} y={92} width={60} height={28} rx={8} {...fill('learn-red')} />
      <Beacon x={150} y={34} />
      <Headlight x={352} y={136} />
      <rect x={346} y={180} width={28} height={18} rx={8} {...fill('paint-gray')} />
      <Wheel cx={84} />
      <Wheel cx={292} />
    </>
  );
}

function Heli() {
  return (
    <g transform="translate(0 28)">
      <rect x={22} y={112} width={130} height={24} rx={12} {...fill('learn-yellow')} />
      <rect x={14} y={70} width={24} height={70} rx={12} {...fill('learn-orange')} />
      <g className={styles.tailRotor}>
        <rect x={22} y={52} width={8} height={56} rx={4} {...fill('paint-gray')} />
        <rect x={-2} y={76} width={56} height={8} rx={4} {...fill('paint-gray')} />
      </g>
      <ellipse cx={206} cy={128} rx={124} ry={68} {...fill('learn-yellow')} />
      <ellipse cx={186} cy={92} rx={84} ry={20} {...fill('paper', 0.32)} />
      <path d="M232 84 Q318 80 322 136 Q300 160 232 160 Z" {...fill('world-water-light')} />
      <path d="M246 96 Q276 92 290 104" {...line('paper', 8)} />
      <rect x={96} y={150} width={220} height={14} {...fill('learn-orange')} />
      <circle cx={150} cy={122} r={20} {...fill('world-water-light')} />
      {/* càng đáp */}
      <path d="M150 190 L150 208 M256 190 L256 208" {...line('paint-gray', 9)} />
      <path d="M112 212 L300 212" {...line('paint-gray', 11)} />
      {/* trục và cánh quạt */}
      <rect x={198} y={38} width={14} height={26} rx={6} {...fill('paint-gray')} />
      <g className={styles.rotor}>
        <rect x={30} y={30} width={350} height={14} rx={7} {...fill('paint-gray')} />
      </g>
      <circle cx={205} cy={37} r={11} {...fill('paint-black')} />
      <rect className={styles.beacon} x={196} y={186} width={22} height={14} rx={7} {...fill('learn-red')} />
    </g>
  );
}

export function Vehicle({
  id,
  moving = false,
  lights = false,
  onLand = false,
  noLadder = false,
}: {
  id: VehicleId;
  /** Bánh quay, cánh quạt quay nhanh. */
  moving?: boolean;
  /** Đèn ưu tiên nháy. */
  lights?: boolean;
  /** Xuồng nằm trên xe đẩy (trong ga-ra, lúc ăn mừng). */
  onLand?: boolean;
  /** Xe thang đã dựng thang (thang do Game vẽ riêng). */
  noLadder?: boolean;
}) {
  let body: ReactNode;
  if (id === 'firetruck') body = <Firetruck />;
  else if (id === 'ladder') body = <LadderTruck noLadder={noLadder} />;
  else if (id === 'tractor') body = <Tractor />;
  else if (id === 'boat') body = <Boat onLand={onLand} />;
  else if (id === 'ambulance') body = <Ambulance />;
  else body = <Heli />;
  return (
    <svg
      className={styles.vehicleSvg}
      viewBox="0 0 380 250"
      data-vehicle={id}
      data-moving={moving ? '' : undefined}
      data-lights={lights ? '' : undefined}
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}
