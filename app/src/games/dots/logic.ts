/**
 * Trò "Nối điểm": quanh bóng mờ một con vật có các chấm đánh số; bé chạm (hoặc kéo ngón)
 * lần lượt 1, 2, 3... Mỗi chấm đúng sáng lên, đọc số, nối nét từ chấm trước. Nối hết vòng:
 * ảnh thật hiện ra, con vật kêu tiếng thật, "Là con voi!". Chạm sai: chỉ chấm kế nhún nhẹ.
 * Không điểm, không thua.
 *
 * Vị trí chấm tính từ đường viền alpha của ảnh thật (outlines.json, sinh bằng
 * scripts/dots-outlines.mjs): đặt con vật to hết cỡ trong vùng vẽ rồi lấy mẫu đều theo chu vi.
 */
import { perimeter, pointAt, type Outline, type Pt } from './outline';
import OUTLINES from './outlines.json';

export const ANIMALS = ['elephant', 'giraffe', 'rabbit', 'fish', 'horse', 'chicken', 'duck', 'pig'] as const;
export type AnimalId = (typeof ANIMALS)[number];

export const outlineOf = (id: AnimalId): Outline => (OUTLINES as unknown as Record<AnimalId, Outline>)[id];

/** Vùng chạm của chấm (px khung) và khoảng cách tối thiểu giữa hai vùng chạm. */
export const DOT_HIT = 120;
export const DOT_GAP = 24;
/** Hai chấm phải cách nhau (theo trục xa hơn) ít nhất chừng này để hai ô 120 không chạm nhau và hở 24. */
export const MIN_SPACING = DOT_HIT + DOT_GAP;

/**
 * Vùng đặt tâm chấm trong khung 1194×834. Trái 228: ô chạm không đè nút Về nhà (24..144, hở 24).
 * Phải 966: ô chạm cách mép phải ≥ 168 (cổng bố mẹ góc trên phải, giữ nút cách mép phải ≥ 144).
 * Trên 110, dưới 768: ô chạm nằm trọn trong khung.
 */
export const AREA = { x0: 228, y0: 110, x1: 966, y1: 768 } as const;

/** Số chấm muốn có theo tuổi (đã quy độ khó), thử lần lượt tới khi các chấm đủ thưa. */
export function dotCountsForAge(ageMonths: number): number[] {
  if (ageMonths < 36) return [5, 4];
  if (ageMonths < 48) return [8, 7, 6];
  return [10, 9, 8];
}

export interface Placement {
  /** Ảnh thẻ (vuông) đặt trong khung: góc trái trên và cạnh. */
  img: { x: number; y: number; size: number };
  /** Đường viền trong toạ độ khung, chiều kim đồng hồ. */
  poly: Pt[];
}

/**
 * Chấm nằm ngoài viền con vật chừng này (px khung): không che ảnh, và hai bên chỗ hẹp
 * (cổ hươu, đuôi cá) được đẩy xa nhau hơn.
 */
export const OFFSET = 40;

/** Đẩy đường khép kín (chiều kim đồng hồ trên màn hình) ra ngoài d px theo pháp tuyến. */
export function offsetPoly(poly: readonly Pt[], d: number): Pt[] {
  const n = poly.length;
  return poly.map((p, i) => {
    const a = poly[(i - 1 + n) % n];
    const b = poly[(i + 1) % n];
    const tx = b[0] - a[0];
    const ty = b[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    // chiều kim đồng hồ, y hướng xuống: pháp tuyến ngoài là (ty, -tx)
    return [p[0] + (ty / len) * d, p[1] - (tx / len) * d] as Pt;
  });
}

/**
 * Phóng con vật (theo khung phần đục của ảnh) to hết cỡ, căn giữa vùng vẽ; đường đặt chấm
 * là viền đẩy ra ngoài OFFSET px nên con vật vừa vùng vẽ đã thu mỗi bên OFFSET.
 */
export function placeOutline(o: Outline, area = AREA, off = OFFSET): Placement {
  const [bx0, by0, bx1, by1] = o.bbox;
  const aw = area.x1 - area.x0 - 2 * off;
  const ah = area.y1 - area.y0 - 2 * off;
  const size = Math.min(aw / (bx1 - bx0), ah / (by1 - by0));
  const x = (area.x0 + area.x1) / 2 - ((bx0 + bx1) / 2) * size;
  const y = (area.y0 + area.y1) / 2 - ((by0 + by1) / 2) * size;
  const poly = o.pts.map(([px, py]) => [x + px * size, y + py * size] as Pt);
  return { img: { x, y, size }, poly: offsetPoly(poly, off) };
}

/** Khoảng cách theo trục xa hơn: hai ô vuông cạnh 120 hở nhau ≥ 24 khi giá trị này ≥ 144. */
export const spacing = (a: Pt, b: Pt) => Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]));

export function minSpacing(dots: readonly Pt[]): number {
  let m = Infinity;
  for (let i = 0; i < dots.length; i++) for (let j = i + 1; j < dots.length; j++) m = Math.min(m, spacing(dots[i], dots[j]));
  return m;
}

const PHASES = 48;
/** Khoảng cách theo chu vi giữa hai chấm liền nhau được co giãn trong [GAP_MIN, GAP_MAX] × đều. */
const GAP_MIN = 0.6;
const GAP_MAX = 1.5;
const ROUNDS = 30;
const TRIES = 24;

/**
 * n chấm gần cách đều theo chu vi, sao cho hai chấm gần nhau nhất vẫn xa nhất:
 * 1. thử nhiều điểm xuất phát của cách chia đều, lấy cách tốt nhất;
 * 2. nhích từng chấm dọc viền (giữ khoảng cách tới hai chấm kề trong [GAP_MIN, GAP_MAX] × đều)
 *    tới chỗ xa các chấm khác nhất, lặp vài vòng (chỗ hẹp như hai bên cổ hươu được giãn ra).
 * Chấm số 1 là chấm cao nhất (thường là đầu/tai), đánh số theo chiều kim đồng hồ.
 */
export function pickDots(poly: readonly Pt[], n: number): { dots: Pt[]; spacing: number } {
  const total = perimeter(poly);
  const even = total / n;
  let pos: number[] = [];
  let bestScore = -1;
  for (let ph = 0; ph < PHASES; ph++) {
    const p = Array.from({ length: n }, (_, i) => (ph / PHASES + i) * even);
    const score = minSpacing(p.map((s) => pointAt(poly, s, total)));
    if (score > bestScore + 1e-9) {
      bestScore = score;
      pos = p;
    }
  }
  // pos tăng dần, chấm cuối nối vòng về chấm đầu (+total)
  const pts = pos.map((s) => pointAt(poly, s, total));
  const nearest = (q: Pt, skip: number) => {
    let m = Infinity;
    for (let j = 0; j < n; j++) if (j !== skip) m = Math.min(m, spacing(q, pts[j]));
    return m;
  };
  for (let r = 0; r < ROUNDS; r++) {
    for (let i = 0; i < n; i++) {
      const prev = i === 0 ? pos[n - 1] - total : pos[i - 1];
      const next = i === n - 1 ? pos[0] + total : pos[i + 1];
      const lo = Math.max(prev + GAP_MIN * even, next - GAP_MAX * even);
      const hi = Math.min(next - GAP_MIN * even, prev + GAP_MAX * even);
      let bestS = pos[i];
      let bestD = nearest(pts[i], i);
      for (let k = 0; k <= TRIES && hi > lo; k++) {
        const s = lo + ((hi - lo) * k) / TRIES;
        const q = pointAt(poly, s, total);
        const d = nearest(q, i);
        if (d > bestD + 1e-9) {
          bestD = d;
          bestS = s;
        }
      }
      pos[i] = bestS;
      pts[i] = pointAt(poly, bestS, total);
    }
  }
  const best = pts;
  let top = 0;
  best.forEach((p, i) => {
    if (p[1] < best[top][1]) top = i;
  });
  const dots = best.map((_, i) => best[(top + i) % n]).map(([x, y]) => [Math.round(x), Math.round(y)] as Pt);
  return { dots, spacing: minSpacing(dots) };
}

export interface Puzzle {
  animal: AnimalId;
  img: Placement['img'];
  dots: Pt[];
}

/** Con vật + vị trí chấm cho tuổi này: số chấm nhiều nhất trong dotCountsForAge mà vẫn đủ thưa. */
export function makePuzzle(animal: AnimalId, ageMonths: number): Puzzle {
  const place = placeOutline(outlineOf(animal));
  const counts = dotCountsForAge(ageMonths);
  let pick = pickDots(place.poly, counts[counts.length - 1]);
  for (const n of counts) {
    const p = pickDots(place.poly, n);
    if (p.spacing >= MIN_SPACING) {
      pick = p;
      break;
    }
  }
  return { animal, img: place.img, dots: pick.dots };
}

export interface State {
  puzzle: Puzzle;
  /** Số chấm đã nối (cũng là chỉ số chấm kế tiếp cần chạm). */
  next: number;
}

export const newState = (puzzle: Puzzle): State => ({ puzzle, next: 0 });

export const isDone = (s: State) => s.next >= s.puzzle.dots.length;

/** Chạm chấm i: đúng chấm kế thì nối, còn lại (chấm sai, chấm đã nối) giữ nguyên. */
export function tapDot(s: State, i: number): { state: State; ok: boolean } {
  if (isDone(s) || i !== s.next) return { state: s, ok: false };
  return { state: { ...s, next: s.next + 1 }, ok: true };
}

/** Chấm (chỉ số) có vùng chạm 120×120 chứa điểm p, hoặc -1. */
export function dotAt(dots: readonly Pt[], p: { x: number; y: number }): number {
  const half = DOT_HIT / 2;
  return dots.findIndex(([x, y]) => Math.abs(p.x - x) <= half && Math.abs(p.y - y) <= half);
}

function shuffle<T>(list: readonly T[], rand: () => number): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Thứ tự con vật: con chưa gặp gần đây lên trước, xáo trộn. */
export function animalOrder(rand: () => number = Math.random, avoid: readonly string[] = []): AnimalId[] {
  return [...shuffle(ANIMALS.filter((a) => !avoid.includes(a)), rand), ...shuffle(ANIMALS.filter((a) => avoid.includes(a)), rand)];
}

/** Key câu nói. Tiếng kêu thật: public/audio/sfx/animal-<id>.mp3. */
export const numberKey = (i: number) => `number.${i + 1}`;
export const soundKey = (id: AnimalId) => `animal.${id}-sound`;
export const isKey = (id: AnimalId) => `dots.is.${id}`;
export const HELLO_KEY = 'dots.hello';
