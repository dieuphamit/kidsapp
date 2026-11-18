/**
 * Tắm cho thú: logic thuần (không DOM, không canvas) để test được.
 * - Chọn thú, mức theo tuổi (lượng bùn, ngưỡng sạch, cỡ nét chà, có bước lau khăn không).
 * - Lưới bùn thưa (DirtGrid): tính % sạch bằng ô lưới thay vì đọc pixel canvas mỗi khung hình.
 * - Sinh vệt bùn (vị trí, cỡ, hình loang) theo hạt giống để ảnh chụp e2e ổn định.
 */

/** Thú lông sáng (bùn nâu nhìn rõ), đều có ảnh thật cards/bath/<id>.png và tiếng kêu thật sfx/animal-<id>.mp3. */
export const BATH_ANIMALS = ['pig', 'dog', 'sheep', 'duck', 'elephant', 'panda', 'cow', 'rabbit'] as const;
export type BathAnimal = (typeof BATH_ANIMALS)[number];

export function isBathAnimal(id: string): id is BathAnimal {
  return (BATH_ANIMALS as readonly string[]).includes(id);
}

export interface BathLevel {
  /** Số vệt bùn lớn. */
  blobs: number;
  /** Bán kính vệt bùn, tính theo phần cạnh khung thú (0..1). */
  blobSize: number;
  /** Tỉ lệ ô bùn phải sạch để hiện vòi sen. */
  threshold: number;
  /** Bán kính nét chà (px trong khung thú 680px). */
  brush: number;
  /** Bé lớn: sau khi xối nước thì lau khô bằng khăn. */
  towel: boolean;
}

/** Bé nhỏ: bùn ít, nét chà to, ngưỡng thấp. Bé lớn: bùn nhiều hơn, ngưỡng cao, thêm bước lau khăn. */
export function levelForAge(ageMonths: number): BathLevel {
  if (ageMonths < 36) return { blobs: 3, blobSize: 0.16, threshold: 0.7, brush: 62, towel: false };
  if (ageMonths < 48) return { blobs: 5, blobSize: 0.14, threshold: 0.78, brush: 52, towel: false };
  return { blobs: 6, blobSize: 0.13, threshold: 0.85, brush: 44, towel: true };
}

/** Hạt giống ngẫu nhiên nhỏ gọn (mulberry32): cùng seed → cùng vệt bùn. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Thứ tự thú cho cả buổi: xáo trộn, không lặp con vừa tắm ở đầu lượt mới. */
export function animalOrder(seed: number, first?: BathAnimal): BathAnimal[] {
  const r = rng(seed);
  const list = [...BATH_ANIMALS];
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  if (first) {
    const i = list.indexOf(first);
    [list[0], list[i]] = [list[i], list[0]];
  }
  return list;
}

export function nextAnimal(order: readonly BathAnimal[], current: BathAnimal): BathAnimal {
  const i = order.indexOf(current);
  return order[(i + 1) % order.length];
}

/** Mặt nạ hình con vật: alpha 0..255 trên lưới w×h (lấy mẫu từ PNG đã tách nền). */
export interface AlphaMap {
  w: number;
  h: number;
  data: ArrayLike<number>;
}

export function alphaAt(m: AlphaMap, fx: number, fy: number): number {
  const x = Math.min(m.w - 1, Math.max(0, Math.floor(fx * m.w)));
  const y = Math.min(m.h - 1, Math.max(0, Math.floor(fy * m.h)));
  return m.data[y * m.w + x];
}

export interface MudBlob {
  /** Tâm, theo tỉ lệ khung (0..1). */
  x: number;
  y: number;
  /** Bán kính theo tỉ lệ cạnh khung. */
  r: number;
  /** Hệ số bán kính của các đỉnh quanh vệt (mép loang, không tròn trơn). */
  wobble: number[];
  /** Cụm vệt con quanh vệt chính: [dx, dy, r] theo tỉ lệ khung. */
  lumps: [number, number, number][];
  /** Lốm đốm bắn ra quanh vệt: [dx, dy, r]. */
  specks: [number, number, number][];
  /** Vệt chảy xuống: [dx, chiều dài, bề rộng]. */
  drips: [number, number, number][];
}

/**
 * Đặt vệt bùn lên thân thú: tâm vệt nằm ở chỗ alpha đậm (trong viền con vật), các vệt cách nhau
 * để phủ đều. Không có ô nào đủ đậm thì đặt quanh giữa khung.
 */
export function makeMud(level: BathLevel, mask: AlphaMap, seed: number): MudBlob[] {
  const r = rng(seed);
  const inside: [number, number][] = [];
  for (let y = 0; y < mask.h; y++) {
    for (let x = 0; x < mask.w; x++) {
      if (mask.data[y * mask.w + x] > 200) inside.push([(x + 0.5) / mask.w, (y + 0.5) / mask.h]);
    }
  }
  const pick = (): [number, number] =>
    inside.length ? inside[Math.floor(r() * inside.length)] : [0.4 + r() * 0.2, 0.4 + r() * 0.2];

  const blobs: MudBlob[] = [];
  const minGap = level.blobSize * 1.6;
  for (let i = 0; i < level.blobs; i++) {
    // thử vài lần để vệt mới không chồng lên vệt cũ
    let best = pick();
    let bestD = -1;
    for (let k = 0; k < 12; k++) {
      const p = pick();
      const d = Math.min(...blobs.map((b) => Math.hypot(b.x - p[0], b.y - p[1])), 9);
      if (d > bestD) {
        best = p;
        bestD = d;
      }
      if (d >= minGap) break;
    }
    const size = level.blobSize * (0.8 + r() * 0.45);
    const n = 14;
    const wobble = Array.from({ length: n }, () => 0.72 + r() * 0.5);
    const lumps = Array.from({ length: 3 + Math.floor(r() * 3) }, (): [number, number, number] => {
      const a = r() * Math.PI * 2;
      const d = size * (0.45 + r() * 0.5);
      return [Math.cos(a) * d, Math.sin(a) * d * 0.8, size * (0.3 + r() * 0.3)];
    });
    const specks = Array.from({ length: 10 + Math.floor(r() * 10) }, (): [number, number, number] => {
      const a = r() * Math.PI * 2;
      const d = size * (1.05 + r() * 0.7);
      return [Math.cos(a) * d, Math.sin(a) * d, size * (0.03 + r() * 0.07)];
    });
    // vệt chảy ngắn, thon (0–1 vệt mỗi vệt bùn)
    const drips = Array.from({ length: r() < 0.6 ? 1 : 0 }, (): [number, number, number] => [
      (r() - 0.5) * size * 1.0,
      size * (0.3 + r() * 0.35),
      size * (0.14 + r() * 0.08),
    ]);
    blobs.push({ x: best[0], y: best[1], r: size, wobble, lumps, specks, drips });
  }
  return blobs;
}

/**
 * Lưới bùn thưa: mỗi ô là bẩn/sạch. % sạch = ô bẩn ban đầu đã được chà / tổng ô bẩn ban đầu.
 * Toạ độ theo px của khung thú (w×h), bán kính nét chà cùng đơn vị.
 */
export class DirtGrid {
  readonly w: number;
  readonly h: number;
  readonly cols: number;
  readonly rows: number;
  private readonly dirty: Uint8Array;
  private readonly total: number;
  private cleaned = 0;

  constructor(w: number, h: number, cells: ArrayLike<boolean | number>, cols: number, rows: number) {
    this.w = w;
    this.h = h;
    this.cols = cols;
    this.rows = rows;
    this.dirty = new Uint8Array(cols * rows);
    let t = 0;
    for (let i = 0; i < cols * rows; i++) {
      if (cells[i]) {
        this.dirty[i] = 1;
        t++;
      }
    }
    this.total = t;
  }

  /** Tổng số ô bẩn lúc đầu. */
  get dirtyTotal(): number {
    return this.total;
  }

  /** Tỉ lệ đã sạch 0..1 (không có bùn thì coi như sạch hẳn). */
  get cleanFraction(): number {
    return this.total === 0 ? 1 : this.cleaned / this.total;
  }

  isDirty(col: number, row: number): boolean {
    return this.dirty[row * this.cols + col] === 1;
  }

  /** Tâm ô (px) của ô bẩn còn lại gần (fx, fy) nhất; null nếu đã sạch hết. */
  dirtyCellNear(fx: number, fy: number): { x: number; y: number } | null {
    let best: { x: number; y: number } | null = null;
    let bestD = Infinity;
    const cw = this.w / this.cols;
    const ch = this.h / this.rows;
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        if (!this.dirty[row * this.cols + col]) continue;
        const x = (col + 0.5) * cw;
        const y = (row + 0.5) * ch;
        const d = Math.hypot(x - fx * this.w, y - fy * this.h);
        if (d < bestD) {
          bestD = d;
          best = { x, y };
        }
      }
    }
    return best;
  }

  /** Chà một chấm tròn tâm (x, y) bán kính r: ô có tâm nằm trong chấm thành sạch. Trả số ô vừa sạch. */
  scrub(x: number, y: number, r: number): number {
    const cw = this.w / this.cols;
    const ch = this.h / this.rows;
    const c0 = Math.max(0, Math.floor((x - r) / cw));
    const c1 = Math.min(this.cols - 1, Math.floor((x + r) / cw));
    const r0 = Math.max(0, Math.floor((y - r) / ch));
    const r1 = Math.min(this.rows - 1, Math.floor((y + r) / ch));
    let n = 0;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const i = row * this.cols + col;
        if (!this.dirty[i]) continue;
        const cx = (col + 0.5) * cw;
        const cy = (row + 0.5) * ch;
        if ((cx - x) ** 2 + (cy - y) ** 2 <= r * r) {
          this.dirty[i] = 0;
          n++;
        }
      }
    }
    this.cleaned += n;
    return n;
  }

  /** Chà dọc một đoạn thẳng: đặt chấm cách nhau ≤ r/2 để không sót khe. */
  scrubLine(x0: number, y0: number, x1: number, y1: number, r: number): number {
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (r / 2)));
    let n = 0;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      n += this.scrub(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r);
    }
    return n;
  }
}

/** Các điểm đặt chấm dọc đoạn (dùng chung cho xóa bùn trên canvas và cho lưới). */
export function stampsAlong(x0: number, y0: number, x1: number, y1: number, spacing: number): [number, number][] {
  const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / spacing));
  const out: [number, number][] = [];
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return out;
}

export type Phase = 'scrub' | 'rinse' | 'shower' | 'towel' | 'done';

/** Sau khi xối nước: bé lớn sang lau khăn, bé nhỏ xong luôn. */
export function afterShower(level: BathLevel): Phase {
  return level.towel ? 'towel' : 'done';
}

/** Chà/lau đủ sạch chưa (so ngưỡng theo tuổi). */
export function isClean(grid: DirtGrid, level: BathLevel): boolean {
  return grid.cleanFraction >= level.threshold;
}
