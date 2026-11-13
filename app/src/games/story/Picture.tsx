import type { CSSProperties } from 'react';
import { isPhoto, type StoryId } from './logic';
import { SCENES, type Shape, type Sprite } from './scenes';
import styles from './Game.module.css';

const BASE = import.meta.env.BASE_URL;

/** Hình vẽ đơn giản trong tranh (viewBox 100×100), màu token. */
function ShapeArt({ shape, color }: { shape: Shape; color?: string }) {
  const c = (token: string) => ({ style: { fill: `var(--${token})` } });
  const tint = color ? `learn-${color}` : 'learn-yellow';
  switch (shape) {
    case 'sun':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <rect key={i} x={46} y={2} width={8} height={18} rx={4} transform={`rotate(${i * 45} 50 50)`} {...c('scene-sun-edge')} />
          ))}
          <circle cx={50} cy={50} r={28} {...c('scene-sun')} />
          <circle cx={44} cy={44} r={12} {...c('scene-sun-core')} />
        </svg>
      );
    case 'moon':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M62 8 A42 42 0 1 0 92 70 A34 34 0 1 1 62 8 Z" {...c('learn-yellow')} />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 4 L62 37 L97 38 L69 59 L79 93 L50 73 L21 93 L31 59 L3 38 L38 37 Z" {...c(tint)} />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 88 C20 66 6 50 6 32 C6 16 18 6 32 6 C42 6 48 12 50 20 C52 12 58 6 68 6 C82 6 94 16 94 32 C94 50 80 66 50 88 Z" {...c(tint)} />
        </svg>
      );
    case 'balloon':
      return (
        <svg viewBox="0 0 100 160" aria-hidden="true">
          <path d="M50 96 Q46 120 54 140 Q60 152 52 160" className={styles.balloonString} />
          <ellipse cx={50} cy={48} rx={40} ry={46} {...c(tint)} />
          <ellipse cx={36} cy={32} rx={9} ry={13} {...c('paper')} opacity={0.6} />
          <path d="M44 92 L56 92 L50 102 Z" {...c(tint)} />
        </svg>
      );
    case 'drop':
    case 'tear':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <path d="M50 4 C64 30 82 48 82 66 A32 32 0 0 1 18 66 C18 48 36 30 50 4 Z" {...c(shape === 'tear' ? 'world-water-light' : tint)} />
        </svg>
      );
    case 'soil':
      return (
        <svg viewBox="0 0 100 40" aria-hidden="true">
          <ellipse cx={50} cy={26} rx={48} ry={14} {...c('scene-bark-dark')} />
          <ellipse cx={50} cy={22} rx={44} ry={11} {...c('scene-bark')} />
        </svg>
      );
    case 'ball':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <circle cx={50} cy={50} r={46} {...c(tint)} />
          <path d="M8 44 Q50 62 92 44 L92 58 Q50 76 8 58 Z" {...c('paper')} />
        </svg>
      );
    case 'zzz':
      return (
        <svg viewBox="0 0 100 100" aria-hidden="true" className={styles.zzz}>
          <path d="M10 60 H40 L10 92 H40" />
          <path d="M52 30 H76 L52 56 H76" />
          <path d="M80 6 H96 L80 24 H96" />
        </svg>
      );
  }
}

function SpriteView({ sprite, buddyImg }: { sprite: Sprite; buddyImg: string }) {
  const style: CSSProperties = { left: `${sprite.x}%`, top: `${sprite.y}%`, width: `${sprite.size}%` };
  if ('shape' in sprite) {
    return (
      <span className={styles.sprite} style={style}>
        <ShapeArt shape={sprite.shape} color={sprite.color} />
      </span>
    );
  }
  const src = 'buddy' in sprite ? buddyImg : `${BASE}cards/${sprite.card}.png`;
  const rot = 'card' in sprite ? sprite.rot ?? 0 : 0;
  return (
    <img
      className={styles.sprite}
      style={{ ...style, transform: `translate(-50%, -50%) rotate(${rot}deg) scaleX(${sprite.flip ? -1 : 1})` }}
      src={src}
      alt=""
      draggable={false}
    />
  );
}

/** Một tranh của chuyện: ảnh chụp, hoặc cảnh ghép (bạn đồng hành + bạn thú). */
export function Picture({ story, step, buddyImg }: { story: StoryId; step: number; buddyImg: string }) {
  const scene = SCENES[story]?.[step - 1];
  if (isPhoto(story) || !scene) {
    return <img src={`${BASE}cards/story/${story}-${step}.png`} alt="" draggable={false} className={styles.img} />;
  }
  return (
    <div className={styles.scenePic} data-bg={scene.bg}>
      {scene.sprites.map((s, i) => (
        <SpriteView key={i} sprite={s} buddyImg={buddyImg} />
      ))}
    </div>
  );
}
