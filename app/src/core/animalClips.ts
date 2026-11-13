/**
 * Chọn clip theo trạng thái chuyển động (logic thuần, test unit): trọng số đích và timeScale cho từng clip.
 * Component trộn trọng số thật dần về trọng số đích trong CROSSFADE giây (crossfade), nên dừng/đi mượt.
 *
 * - Đi bộ: Idle (1 − moving) + Walk/Run (moving); timeScale = tốc độ thật / tốc độ neo để chân không trượt.
 * - Nghỉ ăn: Eat. Được chạm: Happy, không có thì Jump, không có nữa thì clip di chuyển nhanh hơn.
 * - Ếch: tua clip Jump theo tiến độ cú nhảy (scrub), ngồi thì Idle.
 * - Bơi/bay: Swim/Fly với timeScale theo tốc độ.
 */
import type { Agent } from './steer';
import { anchorSpeed, CLIP_NAMES, type ClipName, type WorldAnimal } from './worldAnimals';

/** Thời gian crossfade giữa hai trạng thái (giây) */
export const CROSSFADE = 0.28;
/** timeScale nhỏ/lớn nhất (đi rất chậm vẫn thấy chân nhúc nhích, không quay cuồng) */
const MIN_SCALE = 0.3;
const MAX_SCALE = 2.2;

export type ClipMix = {
  weight: Record<ClipName, number>;
  scale: Record<ClipName, number>;
  /** clip được tua theo tiến độ (thay vì chạy theo thời gian) */
  scrub: ClipName | null;
  scrubP: number;
};

export function createMix(): ClipMix {
  const weight = {} as Record<ClipName, number>;
  const scale = {} as Record<ClipName, number>;
  for (const c of CLIP_NAMES) {
    weight[c] = 0;
    scale[c] = 1;
  }
  return { weight, scale, scrub: null, scrubP: 0 };
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** timeScale để chân không trượt: tốc độ thật / tốc độ neo */
export function clipScale(speed: number, anchor: number): number {
  return anchor > 0 ? clamp(speed / anchor, MIN_SCALE, MAX_SCALE) : 1;
}

/** Ghi trọng số đích và timeScale vào `out` (không cấp phát). `height`: chiều cao hiển thị thật. */
export function mixFor(a: Agent, def: WorldAnimal, out: ClipMix, height = def.height): void {
  for (const c of CLIP_NAMES) {
    out.weight[c] = 0;
    out.scale[c] = 1;
  }
  out.scrub = null;
  out.scrubP = 0;
  const clips = def.clips;
  if (clips.length === 0) return;
  const has = (c: ClipName) => clips.includes(c);
  const moveClip: ClipName = a.motion === 'fly' ? 'Fly' : a.motion === 'swim' || a.motion === 'school' ? 'Swim' : 'Walk';

  if (a.mode === 'react') {
    const c: ClipName = has('Happy') ? 'Happy' : has('Jump') ? 'Jump' : has(moveClip) ? moveClip : clips[0];
    out.weight[c] = 1;
    // Không có động tác vui: vỗ cánh/vẫy đuôi nhanh lên
    if (c === moveClip) out.scale[c] = 1.6;
    return;
  }

  if (moveClip === 'Fly' || moveClip === 'Swim') {
    const c: ClipName = has(moveClip) ? moveClip : clips[0];
    out.weight[c] = 1;
    out.scale[c] = clamp(clipScale(a.speed, anchorSpeed(def, moveClip, height)), 0.6, 1.8);
    return;
  }

  if (a.motion === 'hop') {
    if (a.hop >= 0 && has('Jump')) {
      out.weight.Jump = 1;
      out.scrub = 'Jump';
      out.scrubP = a.hop;
    } else out.weight[has('Idle') ? 'Idle' : clips[0]] = 1;
    return;
  }

  if (a.mode === 'eat' && has('Eat')) {
    out.weight.Eat = 1;
    return;
  }

  // Đi bộ: chạy khi nhanh hơn hẳn tốc độ neo của Walk (nếu có clip Run)
  const walkAnchor = anchorSpeed(def, 'Walk', height);
  const run = has('Run') && def.anchor?.Run !== undefined && a.speed > walkAnchor * 1.5;
  const mc: ClipName = run ? 'Run' : has('Walk') ? 'Walk' : clips[0];
  const m = clamp(a.moving, 0, 1);
  if (has('Idle') && mc !== 'Idle') {
    out.weight.Idle = 1 - m;
    out.weight[mc] = m;
  } else out.weight[mc] = 1;
  out.scale[mc] = clipScale(a.speed, run ? anchorSpeed(def, 'Run', height) : walkAnchor);
}

/** Tiến trọng số thật về trọng số đích, đi hết 0→1 trong CROSSFADE giây */
export function blendWeight(cur: number, target: number, dt: number): number {
  const step = dt / CROSSFADE;
  return target > cur ? Math.min(target, cur + step) : Math.max(target, cur - step);
}
