/**
 * Trò "Nối điểm": lấy đường viền con vật từ kênh alpha của ảnh thật đã tách nền.
 * Hàm thuần (không DOM) để test unit và để scripts/dots-outlines.mjs dùng lại khi sinh outlines.json.
 *
 * Mặt nạ: mảng 0/1 kích thước w×h, hàng nối hàng (mask[y * w + x]).
 * Toạ độ trả về chuẩn hoá 0..1 theo cạnh ảnh (ảnh thẻ là hình vuông).
 */

export type Pt = readonly [number, number];

/** Chỉ giữ mảng liền lớn nhất (bỏ hạt bụi, cọng cỏ sót lại khi tách nền). */
export function largestComponent(mask: Uint8Array, w: number, h: number): Uint8Array {
  const label = new Int32Array(w * h).fill(-1);
  let best = -1;
  let bestSize = 0;
  let next = 0;
  const stack: number[] = [];
  for (let start = 0; start < w * h; start++) {
    if (!mask[start] || label[start] !== -1) continue;
    const id = next++;
    let size = 0;
    label[start] = id;
    stack.push(start);
    while (stack.length) {
      const i = stack.pop()!;
      size++;
      const x = i % w;
      const y = (i - x) / w;
      const near = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
      for (const j of near) {
        if (j >= 0 && mask[j] && label[j] === -1) {
          label[j] = id;
          stack.push(j);
        }
      }
    }
    if (size > bestSize) {
      bestSize = size;
      best = id;
    }
  }
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = label[i] === best && best >= 0 ? 1 : 0;
  return out;
}

function morph(mask: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const out = new Uint8Array(w * h);
  const offs: [number, number][] = [];
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r) offs.push([dx, dy]);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let hit = !dilate;
      for (const [dx, dy] of offs) {
        const xx = x + dx;
        const yy = y + dy;
        const v = xx >= 0 && yy >= 0 && xx < w && yy < h ? mask[yy * w + xx] : 0;
        if (dilate ? v : !v) {
          hit = dilate;
          break;
        }
      }
      out[y * w + x] = hit ? 1 : 0;
    }
  }
  return out;
}

/** Đóng hình thái (nở rồi co, bán kính r ô): lấp khe giữa chân, tai... cho viền tròn trịa, dễ nối. */
export function closeMask(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  // Đệm r ô quanh ảnh để phần nở không bị cắt ở mép rồi co sai
  const pw = w + 2 * r;
  const ph = h + 2 * r;
  const padded = new Uint8Array(pw * ph);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) padded[(y + r) * pw + x + r] = mask[y * w + x];
  const closed = morph(morph(padded, pw, ph, r, true), pw, ph, r, false);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) out[y * w + x] = closed[(y + r) * pw + x + r];
  return out;
}

// 8 hướng theo chiều kim đồng hồ trên màn hình (y hướng xuống): E, SE, S, SW, W, NW, N, NE
const DIRS: Pt[] = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

/**
 * Dò viền ngoài (Moore neighbour) của mảng liền chứa ô đầu tiên khi quét từ trên xuống.
 * Trả về tâm các ô viền theo thứ tự, đi theo chiều kim đồng hồ trên màn hình. Mặt nạ rỗng → [].
 */
export function traceContour(mask: Uint8Array, w: number, h: number): Pt[] {
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  let start = -1;
  for (let i = 0; i < w * h; i++) {
    if (mask[i]) {
      start = i;
      break;
    }
  }
  if (start < 0) return [];
  const sx = start % w;
  const sy = (start - sx) / w;
  const out: Pt[] = [[sx, sy]];
  // Ô đầu là ô trên cùng bên trái nên ô phía Tây (hướng 4) chắc chắn trống: bắt đầu dò từ đó
  let x = sx;
  let y = sy;
  let back = 4;
  for (let guard = 0; guard < 4 * w * h; guard++) {
    let found = -1;
    for (let k = 1; k <= 8; k++) {
      const d = (back + k) % 8;
      if (at(x + DIRS[d][0], y + DIRS[d][1])) {
        found = d;
        break;
      }
    }
    if (found < 0) break; // ô đơn lẻ
    x += DIRS[found][0];
    y += DIRS[found][1];
    // hướng từ ô mới nhìn về ô cũ, lùi thêm một bước để quét tiếp theo chiều kim đồng hồ
    back = (found + 4 + 1) % 8;
    if (x === sx && y === sy) break;
    out.push([x, y]);
  }
  return out;
}

/** Chu vi đường khép kín. */
export function perimeter(poly: readonly Pt[]): number {
  let L = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}

/** Điểm trên đường khép kín ở quãng đường s (tính từ đỉnh 0, vòng lại khi vượt chu vi). */
export function pointAt(poly: readonly Pt[], s: number, total = perimeter(poly)): Pt {
  let rest = ((s % total) + total) % total;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (rest <= seg && seg > 0) {
      const t = rest / seg;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    rest -= seg;
  }
  return poly[0];
}

/** Lấy k điểm cách đều theo chu vi. */
export function resample(poly: readonly Pt[], k: number): Pt[] {
  const total = perimeter(poly);
  return Array.from({ length: k }, (_, i) => pointAt(poly, (i * total) / k, total));
}

/** Làm mượt bậc thang của lưới ô: trung bình trượt vòng tròn bán kính r điểm. */
export function smooth(poly: readonly Pt[], r: number): Pt[] {
  const n = poly.length;
  return poly.map((_, i) => {
    let x = 0;
    let y = 0;
    for (let d = -r; d <= r; d++) {
      const p = poly[(i + d + n) % n];
      x += p[0];
      y += p[1];
    }
    return [x / (2 * r + 1), y / (2 * r + 1)] as Pt;
  });
}

export interface Outline {
  /** Khung chứa phần đục của ảnh, chuẩn hoá 0..1: [x0, y0, x1, y1]. */
  bbox: [number, number, number, number];
  /** Đường viền đã lấp khe, làm mượt, lấy mẫu đều; chuẩn hoá 0..1, chiều kim đồng hồ. */
  pts: [number, number][];
}

/**
 * Từ kênh alpha (0..255, w×h) ra đường viền dùng để đặt chấm.
 * closeR: bán kính lấp khe (ô lưới); k: số điểm lấy mẫu.
 */
export function outlineFromAlpha(alpha: ArrayLike<number>, w: number, h: number, closeR = 4, k = 96): Outline {
  const raw = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) raw[i] = alpha[i] >= 128 ? 1 : 0;
  const body = largestComponent(raw, w, h);
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!body[y * w + x]) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x + 1);
      y1 = Math.max(y1, y + 1);
    }
  }
  const closed = largestComponent(closeMask(body, w, h, closeR), w, h);
  const contour = smooth(traceContour(closed, w, h), 2);
  const round = (v: number) => Math.round(v * 1000) / 1000;
  // +0.5: tâm ô lưới
  const pts = resample(contour, k).map(([x, y]) => [round((x + 0.5) / w), round((y + 0.5) / h)] as [number, number]);
  return { bbox: [round(x0 / w), round(y0 / h), round(x1 / w), round(y1 / h)], pts };
}
