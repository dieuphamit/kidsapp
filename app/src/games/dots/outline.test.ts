import { describe, it, expect } from 'vitest';
import { closeMask, largestComponent, outlineFromAlpha, perimeter, resample, traceContour } from './outline';

function grid(rows: string[]): { mask: Uint8Array; w: number; h: number } {
  const h = rows.length;
  const w = rows[0].length;
  const mask = new Uint8Array(w * h);
  rows.forEach((r, y) => [...r].forEach((c, x) => (mask[y * w + x] = c === '#' ? 1 : 0)));
  return { mask, w, h };
}

describe('dò viền', () => {
  it('hình chữ nhật: đi hết các ô viền một vòng, theo chiều kim đồng hồ', () => {
    const { mask, w, h } = grid(['......', '.####.', '.####.', '.####.', '......']);
    const c = traceContour(mask, w, h);
    // 4×3 ô → 10 ô viền
    expect(c).toHaveLength(10);
    expect(c[0]).toEqual([1, 1]);
    expect(c[1]).toEqual([2, 1]); // sang phải trước = chiều kim đồng hồ trên màn hình
    for (const [x, y] of c) expect(mask[y * w + x]).toBe(1);
    expect(new Set(c.map((p) => p.join(','))).size).toBe(10);
  });

  it('hình chữ L và hình có khe vẫn khép vòng, mỗi ô dò được đều thuộc hình', () => {
    const { mask, w, h } = grid(['.......', '.#.....', '.#.....', '.#####.', '.#...#.', '.#...#.', '.......']);
    const c = traceContour(mask, w, h);
    expect(c.length).toBeGreaterThan(10);
    for (const [x, y] of c) expect(mask[y * w + x]).toBe(1);
    // bước liền kề (8 hướng)
    for (let i = 0; i < c.length; i++) {
      const a = c[i];
      const b = c[(i + 1) % c.length];
      expect(Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]))).toBeLessThanOrEqual(1);
    }
  });

  it('mặt nạ rỗng → không có viền', () => {
    expect(traceContour(new Uint8Array(9), 3, 3)).toEqual([]);
  });
});

describe('làm sạch mặt nạ', () => {
  it('giữ mảng liền lớn nhất, bỏ hạt lẻ', () => {
    const { mask, w, h } = grid(['##....', '##..#.', '......', '...###', '...###']);
    const big = largestComponent(mask, w, h);
    expect([...big].reduce((a, b) => a + b, 0)).toBe(6);
    expect(big[3 * w + 3]).toBe(1);
    expect(big[0]).toBe(0);
  });

  it('đóng hình thái lấp khe hẹp giữa hai chân', () => {
    const { mask, w, h } = grid(['..........', '.########.', '.########.', '.##....##.', '.##....##.', '..........']);
    const closed = closeMask(mask, w, h, 3);
    expect(closed[3 * w + 5]).toBe(1); // giữa hai chân đã lấp
    expect(closed[0]).toBe(0); // không phình ra ngoài góc
  });
});

describe('đường viền từ alpha', () => {
  it('hình tròn: khung đúng, điểm lấy mẫu đều nằm trên vòng tròn', () => {
    const w = 64;
    const alpha = new Uint8Array(w * w);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) alpha[y * w + x] = Math.hypot(x + 0.5 - 32, y + 0.5 - 32) < 20 ? 255 : 0;
    const o = outlineFromAlpha(alpha, w, w, 2, 32);
    expect(o.pts).toHaveLength(32);
    expect(o.bbox[0]).toBeCloseTo(12 / 64, 1);
    expect(o.bbox[2]).toBeCloseTo(52 / 64, 1);
    for (const [x, y] of o.pts) expect(Math.hypot(x - 0.5, y - 0.5)).toBeCloseTo(20 / 64, 1);
    const steps = o.pts.map((p, i) => {
      const q = o.pts[(i + 1) % o.pts.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    expect(Math.max(...steps) / Math.min(...steps)).toBeLessThan(1.3);
  });

  it('resample: k điểm, chu vi gần như giữ nguyên', () => {
    const sq: [number, number][] = [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
    ];
    const r = resample(sq, 8);
    expect(r).toHaveLength(8);
    expect(r[1]).toEqual([5, 0]);
    expect(perimeter(r)).toBeCloseTo(40);
  });
});
