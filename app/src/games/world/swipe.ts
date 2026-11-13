/**
 * Logic thuần cho dải 5 khu kéo ngang (không phụ thuộc React/DOM, test unit được).
 *
 * `pos` là vị trí liên tục trên dải tính bằng "số khu" (0 = khu đầu, 1 = khu thứ hai...). Kéo một ngón:
 * pos đi theo ngón tay (PAGE_PX điểm khung Stage = một khu), quá hai đầu thì bị ghì lại (rubber band).
 * Thả tay: chọn khu đích theo vị trí + quán tính (vận tốc ngón tay), rồi lò xo hơi dưới tới hạn kéo pos về
 * đích, nên tới nơi có nảy nhẹ. Hai đầu dải không vòng lại.
 */

/** Điểm khung Stage kéo được một khu */
export const PAGE_PX = 760;
/** Ngón tay đi quá ngưỡng này (điểm khung) mới tính là kéo; ít hơn là chạm (con vật) */
export const DRAG_SLOP = 18;
/** Thời gian "phóng" theo quán tính khi thả (giây) */
const FLING_TIME = 0.22;
/** Phần kéo quá hai đầu chỉ đi được một phần (ghì lại) */
const RUBBER = 0.28;
/** Lò xo: độ cứng và hệ số tắt dần (< 1: có nảy nhẹ) */
const STIFF = 70;
const DAMP_RATIO = 0.72;

export type Swipe = {
  count: number;
  pos: number;
  vel: number;
  target: number;
  dragging: boolean;
  /** điểm bắt đầu kéo */
  startX: number;
  startPos: number;
  /** đã vượt ngưỡng kéo chưa */
  moved: boolean;
  /** vận tốc ngón tay (điểm khung/giây), làm mượt */
  fingerVel: number;
  lastX: number;
  lastT: number;
};

export function createSwipe(count: number, start = 0): Swipe {
  return { count, pos: start, vel: 0, target: start, dragging: false, startX: 0, startPos: start, moved: false, fingerVel: 0, lastX: 0, lastT: 0 };
}

export function clampIndex(s: Swipe, i: number): number {
  return Math.max(0, Math.min(s.count - 1, i));
}

/** Kéo quá hai đầu bị ghì lại */
export function rubber(s: Swipe, raw: number): number {
  const max = s.count - 1;
  if (raw < 0) return raw * RUBBER;
  if (raw > max) return max + (raw - max) * RUBBER;
  return raw;
}

export function dragStart(s: Swipe, x: number, t: number): void {
  s.dragging = true;
  s.moved = false;
  s.startX = x;
  s.startPos = s.pos;
  s.lastX = x;
  s.lastT = t;
  s.fingerVel = 0;
  s.vel = 0;
}

/** Ngón tay đi tới x (điểm khung) lúc t (giây). Trả về true nếu đây là kéo (đã vượt ngưỡng). */
export function dragMove(s: Swipe, x: number, t: number): boolean {
  if (!s.dragging) return false;
  if (!s.moved && Math.abs(x - s.startX) < DRAG_SLOP) return false;
  if (!s.moved) {
    s.moved = true;
    // bắt đầu tính từ điểm vượt ngưỡng để không giật
    s.startX = x - Math.sign(x - s.startX) * DRAG_SLOP;
  }
  const dt = t - s.lastT;
  if (dt > 0) {
    const v = (x - s.lastX) / dt;
    s.fingerVel = s.fingerVel * 0.4 + v * 0.6;
  }
  s.lastX = x;
  s.lastT = t;
  s.pos = rubber(s, s.startPos - (x - s.startX) / PAGE_PX);
  return true;
}

/** Thả tay: chọn khu đích (tối đa sang khu kế bên so với lúc bắt đầu kéo). Trả về khu đích. */
export function dragEnd(s: Swipe, t: number): number {
  if (!s.dragging) return s.target;
  s.dragging = false;
  // ngón tay dừng lâu trước khi nhấc thì không còn quán tính
  const v = t - s.lastT > 0.12 ? 0 : s.fingerVel;
  if (!s.moved) return s.target;
  const projected = s.pos - (v * FLING_TIME) / PAGE_PX;
  const from = Math.round(s.startPos);
  let to = Math.round(projected);
  to = Math.max(from - 1, Math.min(from + 1, to));
  s.target = clampIndex(s, to);
  s.vel = -v / PAGE_PX;
  return s.target;
}

/** Nút mũi tên: sang khu bên cạnh (dir = ±1). Ở đầu dải thì nảy nhẹ tại chỗ. */
export function go(s: Swipe, dir: 1 | -1): number {
  const next = clampIndex(s, s.target + dir);
  if (next === s.target) s.vel += dir * 0.9; // nảy: đẩy nhẹ rồi lò xo kéo về
  s.target = next;
  return s.target;
}

/** Bước lò xo dt giây (không chạy khi đang kéo). */
export function stepSwipe(s: Swipe, rawDt: number): void {
  if (s.dragging) return;
  // máy chậm (vài khung hình/giây) vẫn tới nơi đúng thời gian thật; chia bước nhỏ nên lò xo vẫn ổn định
  const dt = Math.min(rawDt, 0.25);
  const c = 2 * Math.sqrt(STIFF) * DAMP_RATIO;
  // chia nhỏ để ổn định khi khung hình chậm
  let left = dt;
  while (left > 1e-6) {
    const h = Math.min(left, 1 / 120);
    left -= h;
    const a = STIFF * (s.target - s.pos) - c * s.vel;
    s.vel += a * h;
    s.pos += s.vel * h;
  }
  if (Math.abs(s.target - s.pos) < 0.0008 && Math.abs(s.vel) < 0.003) {
    s.pos = s.target;
    s.vel = 0;
  }
}

/** Đã đứng yên ở khu đích */
export function settled(s: Swipe): boolean {
  return !s.dragging && s.pos === s.target && s.vel === 0;
}

/** Đã tới khu đích (gần như đứng yên): lúc này đọc tên khu, không cần chờ nảy xong hẳn */
export function arrived(s: Swipe): boolean {
  return !s.dragging && Math.abs(s.target - s.pos) < 0.03 && Math.abs(s.vel) < 0.3;
}

/** Các khu cần dựng: khu đang xem ±1 (theo pos và đích) */
export function mountedRange(s: Swipe): number[] {
  const lo = clampIndex(s, Math.min(Math.floor(s.pos), s.target) - 1);
  const hi = clampIndex(s, Math.max(Math.ceil(s.pos), s.target) + 1);
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

/** Các khu đang thấy trên màn (bật chuyển động): một khu khi đứng yên, hai khu kề khi đang lướt */
export function visibleRange(s: Swipe): number[] {
  const lo = clampIndex(s, Math.floor(s.pos + 0.001));
  const hi = clampIndex(s, Math.ceil(s.pos - 0.001));
  return lo === hi ? [lo] : [lo, hi];
}
