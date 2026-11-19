/**
 * Bản in cho bố mẹ (in ra giấy A4, không cần mạng): tranh tô màu, nối số, tô theo nét đứt.
 * Hình vẽ lấy lại từ thẻ hình khối (public/cards/shapes/*.svg) và tranh truyện (games/story),
 * chỉ giữ nét viền. Toạ độ trong viewBox của từng tờ; trang in vẽ nét đen trên nền trắng.
 */
export type SheetKind = 'color' | 'dots' | 'trace';

export type Pt = { x: number; y: number };
/** Một nét vẽ (SVG path d). dashed: nét đứt để bé tô theo; thin: nét mảnh (chi tiết mặt). */
export type Stroke = { d: string; dashed?: boolean; thin?: boolean };
/** Chấm nối số: vị trí chấm, số thứ tự và chỗ đặt số (đẩy ra ngoài hình). */
export type Dot = Pt & { n: number; label: Pt };

export interface Sheet {
  id: string;
  kind: SheetKind;
  /** Tên tờ cho bố mẹ (vi / ja). */
  title: string;
  icon: string;
  viewBox: { w: number; h: number };
  strokes: Stroke[];
  dots?: Dot[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Đường gấp khúc qua các điểm (closed: khép kín). */
export function pathFromPoints(points: readonly Pt[], closed = true): string {
  if (points.length === 0) return '';
  const [first, ...rest] = points;
  return `M${r1(first.x)} ${r1(first.y)}${rest.map((p) => ` L${r1(p.x)} ${r1(p.y)}`).join('')}${closed ? ' Z' : ''}`;
}

/** Đỉnh ngôi sao (spikes cánh), bắt đầu từ đỉnh trên cùng, theo chiều kim đồng hồ. */
export function starPoints(cx: number, cy: number, outer: number, inner: number, spikes = 5): Pt[] {
  return Array.from({ length: spikes * 2 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / spikes;
    const rad = i % 2 === 0 ? outer : inner;
    return { x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) };
  });
}

/** Hình trái tim (đường cong tham số), n điểm cách đều theo góc, bắt đầu ở chỗ lõm trên giữa. */
export function heartPoints(n: number, cx: number, cy: number, size: number): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const t = (i / n) * 2 * Math.PI;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    return { x: cx + (x / 17) * size, y: cy - (y / 17) * size };
  });
}

/** Chu vi đa giác kín. */
export function perimeter(points: readonly Pt[]): number {
  return points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length];
    return sum + Math.hypot(q.x - p.x, q.y - p.y);
  }, 0);
}

/**
 * n điểm cách đều nhau theo chu vi đa giác kín, điểm đầu là đỉnh đầu tiên.
 * Hình có góc nhọn cần chấm đúng vào góc (như ngôi sao) thì dùng withMidpoints thay vì hàm này.
 */
export function samplePerimeter(points: readonly Pt[], n: number): Pt[] {
  const total = perimeter(points);
  const step = total / n;
  const out: Pt[] = [];
  let seg = 0;
  let segStart = 0; // quãng đường tới đầu cạnh seg
  for (let i = 0; i < n; i++) {
    const target = i * step;
    for (;;) {
      const a = points[seg];
      const b = points[(seg + 1) % points.length];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (target <= segStart + len || seg === points.length - 1) {
        const t = len === 0 ? 0 : (target - segStart) / len;
        out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        break;
      }
      segStart += len;
      seg++;
    }
  }
  return out;
}

/** Thêm điểm giữa mỗi cạnh (đỉnh giữ nguyên): cho hình góc cạnh nhiều chấm hơn mà vẫn trúng góc. */
export function withMidpoints(points: readonly Pt[]): Pt[] {
  return points.flatMap((p, i) => {
    const q = points[(i + 1) % points.length];
    return [p, { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 }];
  });
}

/** Đánh số chấm 1..n, số đặt ra phía ngoài hình (xa trọng tâm) một khoảng `offset`. */
export function numberDots(points: readonly Pt[], offset = 9): Dot[] {
  const cx = points.reduce((s, p) => s + p.x, 0) / points.length;
  const cy = points.reduce((s, p) => s + p.y, 0) / points.length;
  return points.map((p, i) => {
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    return { x: r1(p.x), y: r1(p.y), n: i + 1, label: { x: r1(p.x + (dx / len) * offset), y: r1(p.y + (dy / len) * offset) } };
  });
}

/** Sóng (để bé tô theo): `waves` nhịp từ x0 trên chiều rộng width. */
export function wavePath(x0: number, y: number, width: number, amp: number, waves: number): string {
  const w = width / waves;
  let d = `M${r1(x0)} ${r1(y)}`;
  for (let i = 0; i < waves; i++) {
    const x = x0 + i * w;
    d += ` Q${r1(x + w / 4)} ${r1(y - amp)} ${r1(x + w / 2)} ${r1(y)} Q${r1(x + (3 * w) / 4)} ${r1(y + amp)} ${r1(x + w)} ${r1(y)}`;
  }
  return d;
}

/** Răng cưa: `teeth` răng từ x0 trên chiều rộng width. */
export function zigzagPath(x0: number, y: number, width: number, amp: number, teeth: number): string {
  const w = width / teeth;
  const pts: Pt[] = [{ x: x0, y: y + amp / 2 }];
  for (let i = 0; i < teeth; i++) {
    pts.push({ x: x0 + i * w + w / 2, y: y - amp / 2 }, { x: x0 + (i + 1) * w, y: y + amp / 2 });
  }
  return pathFromPoints(pts, false);
}

/**
 * Co giãn rồi dời một path chỉ gồm lệnh tuyệt đối có cặp toạ độ (M, L, C, Q, Z): số chẵn là x, lẻ là y.
 */
export function transformPath(d: string, scale: number, dx: number, dy: number): string {
  let i = 0;
  return d.replace(/-?\d+(\.\d+)?/g, (m) => String(r1(Number(m) * scale + (i++ % 2 === 0 ? dx : dy))));
}

/** Vòng tròn dạng path (để dùng chung kiểu Stroke). */
export function circlePath(cx: number, cy: number, r: number): string {
  return `M${r1(cx - r)} ${r1(cy)} A${r} ${r} 0 1 0 ${r1(cx + r)} ${r1(cy)} A${r} ${r} 0 1 0 ${r1(cx - r)} ${r1(cy)} Z`;
}

/** Mặt cười (mắt, má, miệng) như trên thẻ hình khối. */
function face(cx: number, cy: number, s: number): Stroke[] {
  return [
    { d: circlePath(cx - 18 * s, cy, 7 * s) },
    { d: circlePath(cx + 18 * s, cy, 7 * s) },
    { d: `M${r1(cx - 10 * s)} ${r1(cy + 14 * s)} Q${r1(cx)} ${r1(cy + 26 * s)} ${r1(cx + 10 * s)} ${r1(cy + 14 * s)}` },
    { d: circlePath(cx - 30 * s, cy + 14 * s, 5 * s), thin: true },
    { d: circlePath(cx + 30 * s, cy + 14 * s, 5 * s), thin: true },
  ];
}

const V = { w: 200, h: 200 };

// ---- Tranh tô màu ----
const STAR = starPoints(100, 106, 88, 38);
const HEART_D = 'M100 178 C60 146 14 118 14 70 C14 40 38 20 64 20 C82 20 94 30 100 44 C106 30 118 20 136 20 C162 20 186 40 186 70 C186 118 140 146 100 178 Z';

const colorStar: Sheet = { id: 'color-star', kind: 'color', title: 'Ngôi sao / ほし', icon: '⭐', viewBox: V, strokes: [{ d: pathFromPoints(STAR) }, ...face(100, 112, 0.85)] };
const colorHeart: Sheet = { id: 'color-heart', kind: 'color', title: 'Trái tim / ハート', icon: '❤️', viewBox: V, strokes: [{ d: HEART_D }, ...face(100, 82, 1)] };

const sunRays: Stroke[] = Array.from({ length: 8 }, (_, i) => {
  const a = (i * Math.PI) / 4;
  const p = (r: number, da = 0) => `${r1(100 + r * Math.cos(a + da))} ${r1(100 + r * Math.sin(a + da))}`;
  return { d: `M${p(62, -0.16)} L${p(94)} L${p(62, 0.16)}` };
});
const colorSun: Sheet = { id: 'color-sun', kind: 'color', title: 'Ông mặt trời / たいよう', icon: '☀️', viewBox: V, strokes: [{ d: circlePath(100, 100, 54) }, ...sunRays, ...face(100, 96, 0.9)] };

const colorFish: Sheet = {
  id: 'color-fish', kind: 'color', title: 'Bạn cá / さかな', icon: '🐟', viewBox: V,
  strokes: [
    { d: 'M30 100 C55 50 125 48 150 100 C125 152 55 150 30 100 Z' },
    { d: 'M148 100 L190 66 L180 100 L190 134 Z' },
    { d: 'M78 60 C88 40 110 40 116 58' },
    { d: 'M84 140 C92 156 108 156 112 142' },
    { d: circlePath(62, 92, 8) },
    { d: 'M48 112 Q58 120 68 112', thin: true },
    { d: 'M96 76 Q106 100 96 124', thin: true },
    { d: 'M114 76 Q124 100 114 124', thin: true },
    { d: circlePath(44, 50, 6), thin: true },
    { d: circlePath(30, 30, 9), thin: true },
  ],
};

const colorCat: Sheet = {
  id: 'color-cat', kind: 'color', title: 'Mèo Đậu Đậu / ダウダウ', icon: '🐱', viewBox: V,
  strokes: [
    { d: 'M40 84 L46 20 L88 50 Q100 47 112 50 L154 20 L160 84 C170 150 140 182 100 182 C60 182 30 150 40 84 Z' },
    { d: 'M52 40 L56 62 L72 52 Z', thin: true },
    { d: 'M148 40 L144 62 L128 52 Z', thin: true },
    { d: circlePath(76, 104, 10) },
    { d: circlePath(124, 104, 10) },
    { d: 'M92 124 L108 124 L100 133 Z' },
    { d: 'M100 133 Q92 146 82 140 M100 133 Q108 146 118 140' },
    { d: 'M64 128 L30 122 M64 136 L32 142', thin: true },
    { d: 'M136 128 L170 122 M136 136 L168 142', thin: true },
  ],
};

// ---- Nối số ----
const dotsStar: Sheet = {
  id: 'dots-star', kind: 'dots', title: 'Nối số: ngôi sao / ほし', icon: '✨', viewBox: V,
  strokes: face(100, 112, 0.85),
  dots: numberDots(withMidpoints(starPoints(100, 106, 84, 36)), 10),
};
const dotsHeart: Sheet = {
  id: 'dots-heart', kind: 'dots', title: 'Nối số: trái tim / ハート', icon: '💗', viewBox: V,
  strokes: face(100, 116, 0.8),
  dots: numberDots(heartPoints(14, 100, 100, 84), 10),
};
const HOUSE: Pt[] = [{ x: 100, y: 24 }, { x: 176, y: 96 }, { x: 156, y: 96 }, { x: 156, y: 182 }, { x: 44, y: 182 }, { x: 44, y: 96 }, { x: 24, y: 96 }];
const dotsHouse: Sheet = {
  id: 'dots-house', kind: 'dots', title: 'Nối số: ngôi nhà / いえ', icon: '🏠', viewBox: V,
  strokes: [{ d: 'M84 182 L84 140 Q100 126 116 140 L116 182' }, { d: 'M58 112 H82 V134 H58 Z' }, { d: 'M118 112 H142 V134 H118 Z' }],
  dots: numberDots(samplePerimeter(HOUSE, 14), 10),
};

// ---- Tô theo nét đứt ----
const T = { w: 200, h: 260 };
const traceLines: Sheet = {
  id: 'trace-lines', kind: 'trace', title: 'Tô nét: đường kẻ / せん', icon: '〰️', viewBox: T,
  strokes: [
    { d: 'M24 34 L176 34', dashed: true },
    { d: wavePath(24, 86, 152, 16, 4), dashed: true },
    { d: zigzagPath(24, 142, 152, 30, 6), dashed: true },
    { d: wavePath(24, 196, 152, 22, 2), dashed: true },
    { d: 'M24 240 Q50 214 62 240 Q74 214 100 240 Q126 214 138 240 Q150 214 176 240', dashed: true },
    // chấm bắt đầu ở đầu mỗi đường
    { d: circlePath(24, 34, 4) }, { d: circlePath(24, 86, 4) }, { d: circlePath(24, 157, 4) }, { d: circlePath(24, 196, 4) }, { d: circlePath(24, 240, 4) },
  ],
};
const traceShapes: Sheet = {
  id: 'trace-shapes', kind: 'trace', title: 'Tô nét: hình khối / かたち', icon: '🔺', viewBox: T,
  strokes: [
    { d: circlePath(56, 56, 36), dashed: true },
    { d: 'M110 20 H182 V92 H110 Z', dashed: true },
    { d: 'M56 112 L96 184 L16 184 Z', dashed: true },
    { d: pathFromPoints(starPoints(146, 152, 40, 17)), dashed: true },
    { d: transformPath(HEART_D, 0.34, 26, 194), dashed: true },
    { d: 'M126 216 H170 L182 238 L170 252 H126 L114 238 Z', dashed: true },
  ],
};

export const SHEETS: readonly Sheet[] = [
  colorStar, colorHeart, colorSun, colorFish, colorCat,
  dotsStar, dotsHeart, dotsHouse,
  traceLines, traceShapes,
];

export function sheetById(id: string): Sheet | undefined {
  return SHEETS.find((s) => s.id === id);
}
