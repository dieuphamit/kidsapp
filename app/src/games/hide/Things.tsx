import type { CSSProperties } from 'react';
import styles from './Game.module.css';
import { FLOOR_Y, type ObjId, type RoomObject } from './logic';

/**
 * Đồ vật vẽ bằng CSS (2.5D, màu token). Phần "back" (z 2) nằm sau Đậu Đậu khi bé ở trong/dưới,
 * phần "front" (z 4) che mép trước để Đậu Đậu như đang nấp vào trong.
 */
type P = { cls?: 'back' | 'front' | 'trunk'; soft?: boolean; s: CSSProperties; className?: string };

function Part({ cls = 'back', soft, s, className }: P) {
  const cn = [styles.part, styles[cls], soft ? styles.soft : '', className ?? ''].filter(Boolean).join(' ');
  return <div className={cn} style={s} />;
}

const v = (t: string) => `var(--${t})`;
const ROUND = '50%';

const DRAW: Record<ObjId, () => P[]> = {
  table: () => [
    { s: { left: 42, top: 26, width: 20, height: 150, borderRadius: 10, background: v('scene-wood') } },
    { s: { left: 148, top: 26, width: 20, height: 150, borderRadius: 10, background: v('scene-wood') } },
    { soft: true, s: { left: 0, top: 0, width: 210, height: 34, borderRadius: 16, background: v('scene-wood-light') } },
    { cls: 'front', soft: true, s: { left: 14, top: 26, width: 28, height: 174, borderRadius: 12, background: v('scene-wood-dark') } },
    { cls: 'front', soft: true, s: { left: 168, top: 26, width: 28, height: 174, borderRadius: 12, background: v('scene-wood-dark') } },
  ],
  box: () => [
    { s: { left: -26, top: 8, width: 80, height: 28, borderRadius: 10, background: v('scene-wicker'), transform: 'rotate(-22deg)' } },
    { s: { left: 156, top: 8, width: 80, height: 28, borderRadius: 10, background: v('scene-wicker'), transform: 'rotate(22deg)' } },
    { s: { left: 6, top: 4, width: 198, height: 60, borderRadius: 14, background: v('scene-wicker-dark') } },
    { cls: 'front', soft: true, s: { left: 0, top: 30, width: 210, height: 140, borderRadius: 18, background: v('scene-wicker') } },
    { cls: 'front', s: { left: 86, top: 30, width: 38, height: 70, borderRadius: '0 0 10px 10px', background: v('scene-wicker-light') } },
  ],
  bed: () => [
    { soft: true, s: { left: 0, top: 0, width: 38, height: 220, borderRadius: 20, background: v('scene-barn') } },
    { cls: 'front', soft: true, s: { left: 20, top: 40, width: 176, height: 52, borderRadius: 22, background: v('paper') } },
    { cls: 'front', s: { left: 36, top: 26, width: 62, height: 34, borderRadius: 17, background: v('paper'), boxShadow: v('shadow-clay') } },
    { cls: 'front', soft: true, s: { left: 92, top: 36, width: 106, height: 64, borderRadius: 24, background: v('clay-lilac') } },
    { cls: 'front', soft: true, s: { left: 20, top: 92, width: 180, height: 30, borderRadius: 12, background: v('scene-barn-dark') } },
    { cls: 'front', soft: true, s: { left: 184, top: 60, width: 26, height: 160, borderRadius: 13, background: v('scene-barn') } },
  ],
  chair: () => [
    { soft: true, s: { left: 34, top: 0, width: 142, height: 110, borderRadius: 30, background: v('clay-mint') } },
    { s: { left: 44, top: 90, width: 20, height: 70, borderRadius: 10, background: v('scene-wood-dark') } },
    { s: { left: 146, top: 90, width: 20, height: 70, borderRadius: 10, background: v('scene-wood-dark') } },
    { cls: 'front', soft: true, s: { left: 10, top: 150, width: 190, height: 32, borderRadius: 16, background: v('scene-wood') } },
    { cls: 'front', soft: true, s: { left: 22, top: 172, width: 24, height: 108, borderRadius: 12, background: v('scene-wood-dark') } },
    { cls: 'front', soft: true, s: { left: 164, top: 172, width: 24, height: 108, borderRadius: 12, background: v('scene-wood-dark') } },
  ],
  pot: () => [
    { soft: true, s: { left: -28, top: 34, width: 48, height: 26, borderRadius: 13, background: v('scene-pot-dark') } },
    { soft: true, s: { left: 190, top: 34, width: 48, height: 26, borderRadius: 13, background: v('scene-pot-dark') } },
    { s: { left: 4, top: 0, width: 202, height: 44, borderRadius: ROUND, background: v('scene-pot-dark') } },
    { cls: 'front', soft: true, s: { left: 0, top: 22, width: 210, height: 118, borderRadius: '20px 20px 80px 80px', background: v('scene-pot') } },
    { cls: 'front', s: { left: -4, top: 16, width: 218, height: 22, borderRadius: 11, background: v('clay-peach'), boxShadow: v('shadow-clay') } },
  ],
  basket: () => [
    { s: { left: 28, top: -78, width: 154, height: 154, borderRadius: ROUND, border: `14px solid ${v('scene-wicker-dark')}`, borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: 'rotate(-45deg)' } },
    { s: { left: 4, top: 0, width: 202, height: 44, borderRadius: ROUND, background: v('scene-wicker-dark') } },
    { cls: 'front', soft: true, className: styles.wicker, s: { left: 0, top: 22, width: 210, height: 118, borderRadius: '18px 18px 60px 60px' } },
    { cls: 'front', s: { left: -4, top: 14, width: 218, height: 22, borderRadius: 11, background: v('scene-wicker-light'), boxShadow: v('shadow-clay') } },
  ],
  tree: () => [
    { cls: 'trunk', soft: true, s: { left: 82, top: 180, width: 46, height: 200, borderRadius: '18px 18px 8px 8px', background: v('scene-bark') } },
    {
      soft: true,
      s: {
        left: -10,
        top: 0,
        width: 230,
        height: 240,
        borderRadius: '50% 50% 46% 46%',
        background: `radial-gradient(circle at 38% 30%, ${v('scene-leaf-shine')}, ${v('scene-leaf-light')} 30%, ${v('scene-leaf')} 65%, ${v('scene-leaf-dark')})`,
      },
    },
    { s: { left: 40, top: 70, width: 26, height: 26, borderRadius: ROUND, background: v('learn-red'), boxShadow: v('shadow-clay') } },
    { s: { left: 150, top: 110, width: 26, height: 26, borderRadius: ROUND, background: v('learn-red'), boxShadow: v('shadow-clay') } },
    { s: { left: 96, top: 170, width: 26, height: 26, borderRadius: ROUND, background: v('learn-red'), boxShadow: v('shadow-clay') } },
  ],
  bucket: () => [
    { s: { left: 30, top: -60, width: 150, height: 150, borderRadius: ROUND, border: `10px solid ${v('ink-soft')}`, borderBottomColor: 'transparent', borderLeftColor: 'transparent', transform: 'rotate(-45deg)' } },
    { s: { left: 8, top: 0, width: 194, height: 40, borderRadius: ROUND, background: v('ink-soft') } },
    { cls: 'front', soft: true, s: { left: 12, top: 20, width: 186, height: 130, borderRadius: '10px 10px 40px 40px', background: v('learn-blue'), clipPath: 'polygon(0 0, 100% 0, 90% 100%, 10% 100%)' } },
    { cls: 'front', s: { left: 0, top: 12, width: 210, height: 24, borderRadius: 12, background: v('clay-mint'), boxShadow: v('shadow-clay') } },
    { cls: 'front', s: { left: 70, top: 70, width: 70, height: 40, borderRadius: 20, background: v('learn-yellow') } },
  ],
  car: () => [
    { soft: true, s: { left: 40, top: 0, width: 80, height: 80, borderRadius: 26, background: v('ink-soft') } },
    { s: { left: 150, top: 8, width: 16, height: 66, borderRadius: 8, background: v('sky-top'), transform: 'rotate(18deg)', boxShadow: v('shadow-clay') } },
    { cls: 'front', soft: true, s: { left: 0, top: 50, width: 210, height: 72, borderRadius: '36px 46px 26px 26px', background: v('learn-red') } },
    { cls: 'front', s: { left: 176, top: 68, width: 22, height: 18, borderRadius: 9, background: v('learn-yellow') } },
    { cls: 'front', s: { left: 22, top: 98, width: 52, height: 52, borderRadius: ROUND, background: v('ink'), border: `10px solid ${v('scene-cloud-shade')}` } },
    { cls: 'front', s: { left: 136, top: 98, width: 52, height: 52, borderRadius: ROUND, background: v('ink'), border: `10px solid ${v('scene-cloud-shade')}` } },
  ],
};

export function Thing({ obj }: { obj: RoomObject }) {
  const top = FLOOR_Y - obj.height;
  return (
    <div className={styles.thing} data-testid={`obj-${obj.id}`} style={{ left: obj.left, top, width: obj.width, height: obj.height }}>
      <div className={styles.floorShadow} style={{ left: -10, width: obj.width + 20, top: obj.height - 16 }} />
      {DRAW[obj.id]().map((p, i) => (
        <Part key={i} {...p} />
      ))}
    </div>
  );
}
