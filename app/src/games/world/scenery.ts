/**
 * Cảnh 5 khu dựng bằng hình khối low-poly (dữ liệu thuần, không cần model). `WorldScene.tsx` vẽ dữ liệu này;
 * test đếm tam giác bằng chính các geometry của three nên số đếm khớp với cái được vẽ.
 *
 * Toạ độ tính trong khu (tâm khu ở gốc); khu thứ i đặt ở x = i × SPACING. Thú đi trong vùng x ±3.3 quanh gốc
 * (xem HABITATS), cảnh trang trí đặt ở hai bên và phía sau để không che thú.
 */
import {
  BoxGeometry,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  IcosahedronGeometry,
  PlaneGeometry,
  RingGeometry,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import type { Habitat } from '../../core/worldAnimals';

/** Khoảng cách giữa hai khu: đủ xa để ở khu này không thấy đồ của khu bên cạnh */
export const SPACING = 24;

/** Mã màu chép từ src/core/tokens.css (tên = tên biến CSS, không có `--`); test đối chiếu từng màu */
export const WORLD_COLORS = {
  grass: '#9be38a',
  'scene-hill-far': '#c4e8cf',
  'scene-hill-far-dark': '#a6d8b6',
  'scene-hill-mid': '#aee49a',
  'scene-hill-near': '#96d982',
  'scene-tuft': '#5aa95a',
  'scene-leaf-light': '#98de78',
  'scene-leaf': '#5fc163',
  'scene-leaf-dark': '#3a9550',
  'scene-bark': '#a8774f',
  'scene-bark-dark': '#7a5236',
  'scene-wood-light': '#f6dcb8',
  'scene-sun': '#ffd86b',
  'scene-sun-core': '#fff6d6',
  'scene-sun-edge': '#ffb950',
  'scene-fence': '#fff6e8',
  'clay-peach': '#ffb4a2',
  'clay-lilac': '#cdb4ff',
  'clay-butter': '#ffe29a',
  'learn-red': '#ff6b6b',
  'learn-orange': '#ffa45b',
  'learn-yellow': '#ffd84d',
  'learn-green': '#6fd17a',
  'learn-blue': '#5aa9ff',
  'learn-purple': '#b085ff',
  'world-forest-floor': '#86cf6e',
  'world-pine': '#3f9a5c',
  'world-pine-light': '#58b56b',
  'world-mushroom': '#ff7b72',
  'world-water': '#7fd3e6',
  'world-water-light': '#b8ecf2',
  'world-lily': '#6fcf7a',
  'world-lotus': '#ffc2dc',
  'world-reed': '#8fbf5a',
  'world-mud': '#d9b48a',
  'world-sand': '#f3d9a4',
  'world-sand-dark': '#e2c084',
  'world-seaweed': '#4fbf8a',
  'world-seaweed-dark': '#2f9a6e',
  'world-coral': '#ff8a80',
  'world-coral-pink': '#ff9ecb',
  'world-bubble': '#e6f7ff',
  'world-rock': '#c7b8a8',
  'world-cloud': '#ffffff',
} as const;
export type WorldColor = keyof typeof WORLD_COLORS;

type V3 = [number, number, number];
export type Geo = 'box' | 'sphere' | 'cone' | 'cyl' | 'circle' | 'ring' | 'torus' | 'plane' | 'ico';
/**
 * Chuyển động nhẹ cho cảnh sống động:
 * sway = lắc quanh gốc (cỏ, lau, rong), drift = trôi ngang rồi quay lại (mây), bob = nhấp nhô (lá sen),
 * rise = nổi lên rồi lặp lại (bong bóng), ripple = vòng gợn nước lan ra rồi mờ, spin = xoay chậm (tia nắng).
 */
export type Anim = 'sway' | 'drift' | 'bob' | 'rise' | 'ripple' | 'spin';

/** Một nút cảnh: một group (vị trí, xoay, tỉ lệ, chuyển động), có thể có một mesh và các nút con */
export type Prop = {
  g?: Geo;
  a?: number[];
  c?: WorldColor;
  /** độ trong (0..1) */
  o?: number;
  /** vị trí mesh trong group (để lắc quanh gốc thay vì quanh tâm) */
  off?: V3;
  p?: V3;
  r?: V3;
  s?: number | V3;
  anim?: Anim;
  /** biên độ chuyển động */
  amp?: number;
  /** lệch pha */
  ph?: number;
  kids?: Prop[];
};

export function makeGeometry(g: Geo, a: number[] = []): BufferGeometry {
  switch (g) {
    case 'box':
      return new BoxGeometry(...(a as ConstructorParameters<typeof BoxGeometry>));
    case 'sphere':
      return new SphereGeometry(...(a as ConstructorParameters<typeof SphereGeometry>));
    case 'cone':
      return new ConeGeometry(...(a as ConstructorParameters<typeof ConeGeometry>));
    case 'cyl':
      return new CylinderGeometry(...(a as ConstructorParameters<typeof CylinderGeometry>));
    case 'circle':
      return new CircleGeometry(...(a as ConstructorParameters<typeof CircleGeometry>));
    case 'ring':
      return new RingGeometry(...(a as ConstructorParameters<typeof RingGeometry>));
    case 'torus':
      return new TorusGeometry(...(a as ConstructorParameters<typeof TorusGeometry>));
    case 'plane':
      return new PlaneGeometry(...(a as ConstructorParameters<typeof PlaneGeometry>));
    case 'ico':
      return new IcosahedronGeometry(...(a as ConstructorParameters<typeof IcosahedronGeometry>));
  }
}

export function geometryTris(geo: BufferGeometry): number {
  return (geo.index ? geo.index.count : geo.getAttribute('position').count) / 3;
}

/** Số tam giác của một nút cảnh và mọi nút con */
export function propTris(p: Prop): number {
  let n = 0;
  if (p.g) {
    const geo = makeGeometry(p.g, p.a);
    n += geometryTris(geo);
    geo.dispose();
  }
  for (const k of p.kids ?? []) n += propTris(k);
  return n;
}

/** Số ngẫu nhiên có hạt giống (cảnh giống nhau mỗi lần mở, ảnh chụp e2e lặp lại được) */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FLAT: V3 = [-Math.PI / 2, 0, 0];

// ---------- khối dựng sẵn ----------

function ground(c: WorldColor, zFar = -12, zNear = 8): Prop {
  const d = zNear - zFar;
  return { g: 'plane', a: [SPACING, d], c, p: [0, 0, (zFar + zNear) / 2], r: FLAT };
}

function hill(x: number, z: number, rad: number, c: WorldColor, sy = 0.45, y = 0): Prop {
  return { g: 'sphere', a: [rad, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2], c, p: [x, y, z], s: [1, sy, 0.6] };
}

function roundTree(x: number, z: number, k = 1, ph = 0): Prop {
  return {
    p: [x, 0, z],
    s: k,
    anim: 'sway',
    amp: 0.025,
    ph,
    kids: [
      { g: 'cyl', a: [0.13, 0.2, 1.2, 7], c: 'scene-bark', p: [0, 0.6, 0] },
      { g: 'sphere', a: [0.75, 10, 8], c: 'scene-leaf', p: [0, 1.55, 0] },
      { g: 'sphere', a: [0.5, 9, 7], c: 'scene-leaf-light', p: [0.25, 2.05, 0.15] },
    ],
  };
}

function pine(x: number, z: number, k = 1, ph = 0): Prop {
  return {
    p: [x, 0, z],
    s: k,
    anim: 'sway',
    amp: 0.02,
    ph,
    kids: [
      { g: 'cyl', a: [0.1, 0.16, 0.7, 6], c: 'scene-bark-dark', p: [0, 0.35, 0] },
      { g: 'cone', a: [0.85, 1.1, 8], c: 'world-pine', p: [0, 1.1, 0] },
      { g: 'cone', a: [0.66, 0.95, 8], c: 'world-pine-light', p: [0, 1.65, 0] },
      { g: 'cone', a: [0.45, 0.8, 8], c: 'world-pine', p: [0, 2.15, 0] },
    ],
  };
}

function bush(x: number, z: number, k = 1): Prop {
  return {
    p: [x, 0, z],
    s: k,
    kids: [
      { g: 'sphere', a: [0.42, 9, 7], c: 'scene-leaf', p: [0, 0.3, 0] },
      { g: 'sphere', a: [0.32, 8, 6], c: 'scene-leaf-light', p: [0.38, 0.22, 0.08] },
      { g: 'sphere', a: [0.3, 8, 6], c: 'scene-leaf-dark', p: [-0.36, 0.2, 0.02] },
    ],
  };
}

function tuft(x: number, z: number, ph: number, c: WorldColor = 'scene-tuft'): Prop {
  return {
    p: [x, 0, z],
    anim: 'sway',
    amp: 0.12,
    ph,
    kids: [
      { g: 'cone', a: [0.05, 0.36, 4], c, off: [0, 0.18, 0] },
      { g: 'cone', a: [0.045, 0.28, 4], c, off: [0.07, 0.13, 0.02], r: [0, 0, -0.35] },
      { g: 'cone', a: [0.045, 0.26, 4], c, off: [-0.07, 0.12, 0], r: [0, 0, 0.35] },
    ],
  };
}

function flower(x: number, z: number, c: WorldColor, ph: number): Prop {
  return {
    p: [x, 0, z],
    anim: 'sway',
    amp: 0.1,
    ph,
    kids: [
      { g: 'cyl', a: [0.015, 0.015, 0.3, 4], c: 'scene-tuft', off: [0, 0.15, 0] },
      { g: 'sphere', a: [0.08, 7, 5], c, off: [0, 0.32, 0] },
      { g: 'sphere', a: [0.035, 5, 4], c: 'clay-butter', off: [0, 0.33, 0.06] },
    ],
  };
}

function cloud(x: number, y: number, z: number, k: number, ph: number, amp = 9): Prop {
  return {
    p: [x, y, z],
    s: k,
    anim: 'drift',
    amp,
    ph,
    kids: [
      { g: 'sphere', a: [0.7, 10, 7], c: 'world-cloud', p: [0, 0, 0] },
      { g: 'sphere', a: [0.5, 9, 6], c: 'world-cloud', p: [0.75, -0.12, 0.05] },
      { g: 'sphere', a: [0.55, 9, 6], c: 'world-cloud', p: [-0.7, -0.1, 0] },
      { g: 'sphere', a: [0.4, 8, 6], c: 'world-cloud', p: [0.3, 0.42, -0.1] },
    ],
  };
}

function rock(x: number, z: number, k: number, c: WorldColor = 'world-rock'): Prop {
  return { g: 'ico', a: [0.4, 0], c, p: [x, 0.18 * k, z], s: [k * 1.2, k * 0.8, k] };
}

/** Rải n vật bằng `make` ở chỗ ngẫu nhiên trong các ô, tránh vùng thú (|x| < keepX và z trong khoảng) */
function scatter(n: number, seed: number, xMax: number, zMin: number, zMax: number, keepX: number, make: (x: number, z: number, i: number) => Prop): Prop[] {
  const r = rng(seed);
  const out: Prop[] = [];
  let tries = 0;
  while (out.length < n && tries++ < n * 20) {
    const x = (r() * 2 - 1) * xMax;
    const z = zMin + r() * (zMax - zMin);
    if (Math.abs(x) < keepX && z > -2.2 && z < 2.6) continue;
    out.push(make(x, z, out.length));
  }
  return out;
}

// ---------- 5 khu ----------

function meadow(): Prop[] {
  const flowers: WorldColor[] = ['learn-yellow', 'clay-peach', 'clay-lilac', 'scene-fence'];
  return [
    ground('grass'),
    hill(-8, -11, 5, 'scene-hill-far'),
    hill(-1, -11.5, 6, 'scene-hill-far-dark', 0.35),
    hill(7, -11, 5.5, 'scene-hill-far'),
    hill(-5, -8, 3.5, 'scene-hill-mid', 0.4),
    hill(5, -7.5, 3.2, 'scene-hill-near', 0.4),
    bush(-4.7, -0.6, 1.1),
    bush(4.6, -2.6, 1),
    bush(-2.6, -3.6, 0.9),
    bush(2.2, -4.2, 1),
    bush(4.9, 2.4, 0.8),
    roundTree(-6, -2.2, 1.2, 0.3),
    roundTree(6.2, -0.6, 1.1, 1.7),
    roundTree(-3.8, -6, 1.3, 2.2),
    roundTree(1, -7, 1.1, 0.9),
    ...scatter(34, 11, 7.5, -4.5, 4, 0, (x, z, i) => tuft(x, z, i * 0.7)),
    ...scatter(14, 12, 7, -3.5, 3.8, 3.4, (x, z, i) => flower(x, z, flowers[i % flowers.length], i)),
    cloud(-4, 4.6, -11, 1.3, 0),
    cloud(4, 5, -11.5, 1.1, 6),
  ];
}

function lilyPad(x: number, z: number, k: number, ph: number, lotus: boolean): Prop {
  return {
    p: [x, 0.14, z],
    anim: 'bob',
    amp: 0.025,
    ph,
    kids: [
      { g: 'circle', a: [0.42 * k, 14, 0.3, Math.PI * 2 - 0.6], c: 'world-lily', r: FLAT },
      ...(lotus
        ? [
            { g: 'cone', a: [0.14, 0.2, 6], c: 'world-lotus', p: [0.08, 0.1, 0] } as Prop,
            { g: 'sphere', a: [0.05, 6, 4], c: 'clay-butter', p: [0.08, 0.2, 0] } as Prop,
          ]
        : []),
    ],
  };
}

function reeds(x: number, z: number, seed: number): Prop {
  const r = rng(seed);
  const kids: Prop[] = [];
  for (let i = 0; i < 6; i++) {
    const h = 1 + r() * 0.7;
    const dx = (r() - 0.5) * 0.6;
    const dz = (r() - 0.5) * 0.4;
    kids.push({
      p: [dx, 0, dz],
      anim: 'sway',
      amp: 0.07,
      ph: i * 0.9 + seed,
      kids: [
        { g: 'cyl', a: [0.025, 0.035, h, 4], c: 'world-reed', off: [0, h / 2, 0] },
        ...(i % 2 === 0 ? [{ g: 'cyl', a: [0.06, 0.06, 0.28, 6], c: 'scene-bark-dark', off: [0, h + 0.05, 0] } as Prop] : []),
      ],
    });
  }
  return { p: [x, 0, z], kids };
}

function ripple(x: number, z: number, ph: number): Prop {
  return { g: 'ring', a: [0.42, 0.5, 24], c: 'world-water-light', o: 0.8, r: FLAT, p: [x, 0.15, z], anim: 'ripple', ph };
}

function pond(): Prop[] {
  return [
    ground('grass'),
    hill(-7, -11, 5, 'scene-hill-far'),
    hill(3, -11.5, 6, 'scene-hill-far-dark', 0.35),
    hill(9, -10, 4, 'scene-hill-mid', 0.4),
    roundTree(-5.8, -4.5, 1.2, 0.2),
    roundTree(5.4, -5, 1.3, 1.1),
    roundTree(-2, -7.5, 1.1, 2),
    roundTree(2.8, -7.8, 1, 0.6),
    // bờ đất rồi mặt nước trong suốt nhẹ (cá bơi sát mặt nước)
    { g: 'circle', a: [1, 40], c: 'world-mud', p: [0, 0.02, -0.85], r: FLAT, s: [4.55, 2.35, 1] },
    { g: 'circle', a: [1, 40], c: 'world-water', o: 0.82, p: [0, 0.12, -0.85], r: FLAT, s: [4.2, 2.05, 1] },
    lilyPad(-2.4, -0.3, 1, 0, true),
    lilyPad(-1.2, -2.2, 0.8, 1.3, false),
    lilyPad(1.6, 0.2, 0.9, 2.1, false),
    lilyPad(2.9, -1.6, 1.1, 0.7, true),
    lilyPad(0.2, -2.6, 0.7, 2.8, false),
    ripple(-0.8, -1, 0),
    ripple(1.4, -1.8, 0.35),
    ripple(-2.6, -1.9, 0.7),
    reeds(-4.3, -1.6, 3),
    reeds(4.4, -1.2, 7),
    reeds(-3.6, -2.7, 5),
    reeds(3.6, -2.8, 9),
    rock(-4.6, 0.5, 0.8),
    rock(4.4, 0.8, 0.6),
    rock(-3.9, 2.9, 0.5),
    ...scatter(24, 21, 7.5, -4, 4, 4.9, (x, z, i) => tuft(x, z, i * 0.6)),
    ...scatter(8, 22, 6.5, 2.4, 3.8, 0, (x, z, i) => flower(x, z, i % 2 ? 'clay-lilac' : 'learn-yellow', i)),
    cloud(-3, 4.8, -11, 1.2, 2),
    cloud(5, 4.5, -11, 1, 8),
  ];
}

function mushroom(x: number, z: number, k: number): Prop {
  return {
    p: [x, 0, z],
    s: k,
    kids: [
      { g: 'cyl', a: [0.07, 0.09, 0.26, 6], c: 'scene-fence', p: [0, 0.13, 0] },
      { g: 'sphere', a: [0.2, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2], c: 'world-mushroom', p: [0, 0.24, 0] },
      { g: 'sphere', a: [0.035, 5, 4], c: 'scene-fence', p: [0.08, 0.38, 0.1] },
      { g: 'sphere', a: [0.03, 5, 4], c: 'scene-fence', p: [-0.1, 0.35, 0.06] },
    ],
  };
}

function log(x: number, z: number, rotY: number): Prop {
  return {
    p: [x, 0.22, z],
    r: [0, rotY, Math.PI / 2],
    kids: [
      { g: 'cyl', a: [0.22, 0.24, 1.6, 10], c: 'scene-bark' },
      { g: 'circle', a: [0.21, 10], c: 'scene-wood-light', p: [0, 0.81, 0], r: [-Math.PI / 2, 0, 0] },
      { g: 'circle', a: [0.21, 10], c: 'scene-wood-light', p: [0, -0.81, 0], r: [Math.PI / 2, 0, 0] },
    ],
  };
}

function forest(): Prop[] {
  const r = rng(31);
  const trees: Prop[] = [];
  // hàng cây phía sau và hai bên, dày dần ra xa
  const spots: [number, number][] = [
    [-5.2, -1.2], [-6.4, 1.2], [5.3, -1.6], [6.5, 0.8], [-4.6, -3.2], [4.4, -3.4],
    [-2.6, -3.6], [0.2, -3.9], [2.6, -3.7], [-7.5, -2.8], [7.6, -2.6],
    [-5.6, -5.6], [-3.2, -6.2], [-0.8, -6.6], [1.8, -6.3], [4.2, -6], [6.6, -5.4],
    [-8.8, -7.6], [-6.2, -8.6], [-2, -9.2], [1, -9], [4.4, -8.8], [8.4, -7.8], [-9.5, -1], [9.6, -0.6],
  ];
  spots.forEach(([x, z], i) => {
    const k = 1 + r() * 0.5 + (z < -5 ? 0.3 : 0);
    trees.push(i % 3 === 1 ? roundTree(x, z, k, i * 0.7) : pine(x, z, k, i * 0.7));
  });
  return [
    ground('world-forest-floor'),
    hill(-6, -12, 6, 'scene-leaf-dark', 0.5),
    hill(5, -12, 7, 'world-pine', 0.45),
    ...trees,
    mushroom(-4.3, 1.4, 1.2),
    mushroom(-4.0, 1.75, 0.8),
    mushroom(4.5, 2.1, 1),
    mushroom(3.9, -2.4, 1.1),
    mushroom(-1.2, -2.6, 0.9),
    log(-4.6, 2.6, 0.3),
    log(4.6, -0.4, -0.5),
    rock(5.2, 2.9, 0.7),
    bush(-3.6, -2.5, 0.8),
    bush(3.4, -2.6, 0.9),
    ...scatter(26, 32, 7.5, -4, 4, 0, (x, z, i) => tuft(x, z, i * 0.8, 'scene-leaf-dark')),
  ];
}

function seaweed(x: number, z: number, n: number, c: WorldColor, ph: number): Prop {
  // chuỗi đốt lồng nhau, mỗi đốt lắc lệch pha → rong uốn như sóng
  let node: Prop | undefined;
  for (let i = n - 1; i >= 0; i--) {
    const w = 0.09 - i * 0.012;
    node = {
      p: [0, i === 0 ? 0 : 0.42, 0],
      anim: 'sway',
      amp: 0.16,
      ph: ph + i * 0.6,
      kids: [{ g: 'cyl', a: [w * 0.8, w, 0.46, 5], c, off: [0, 0.21, 0] }, ...(node ? [node] : [])],
    };
  }
  return { p: [x, 0, z], kids: node ? [node] : [] };
}

function coral(x: number, z: number, k: number, c: WorldColor, seed: number): Prop {
  const r = rng(seed);
  const kids: Prop[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + r();
    const tilt = 0.3 + r() * 0.4;
    const h = 0.5 + r() * 0.4;
    kids.push({
      r: [Math.cos(a) * tilt, 0, Math.sin(a) * tilt],
      kids: [
        { g: 'cyl', a: [0.06, 0.09, h, 6], c, p: [0, h / 2, 0] },
        { g: 'sphere', a: [0.1, 7, 5], c, p: [0, h, 0] },
      ],
    });
  }
  return { p: [x, 0, z], s: k, kids };
}

function bubble(x: number, z: number, rad: number, ph: number): Prop {
  return { p: [x, 0.3, z], anim: 'rise', amp: 4.6, ph, kids: [{ g: 'sphere', a: [rad, 8, 6], c: 'world-bubble', o: 0.75 }] };
}

function sea(): Prop[] {
  const weedC: WorldColor[] = ['world-seaweed', 'world-seaweed-dark'];
  const coralC: WorldColor[] = ['world-coral', 'world-coral-pink', 'learn-orange', 'clay-lilac'];
  return [
    ground('world-sand'),
    hill(-6.5, -10, 5, 'world-sand-dark', 0.35),
    hill(4, -11, 6, 'world-sand-dark', 0.3),
    hill(0, -6, 3, 'world-sand', 0.25),
    rock(-4.8, -2.4, 1.6),
    rock(-5.4, -1.6, 1),
    rock(5, -3, 1.8),
    rock(4.3, 2.4, 0.8),
    rock(-1.5, -5.5, 1.4),
    ...[
      [-4.2, -0.6, 6], [-4.6, -1.4, 5], [-3.7, -3.5, 7], [4.2, -0.8, 6], [4.9, -1.8, 7], [3.4, -4, 6],
      [-0.6, -4.6, 5], [1.4, -5, 7], [-6.4, 1.2, 4], [6.6, 1.4, 5], [-2.2, -3.6, 4], [2.4, -3.4, 4],
    ].map(([x, z, n], i) => seaweed(x, z, n, weedC[i % 2], i * 1.3)),
    coral(-3.6, 1.6, 1.2, coralC[0], 41),
    coral(3.4, 1.2, 1.1, coralC[1], 42),
    coral(-5.6, -3.4, 1.4, coralC[2], 43),
    coral(5.8, -0.4, 1.3, coralC[3], 44),
    coral(0.6, -2.4, 1, coralC[0], 45),
    coral(-1.8, 2.8, 0.8, coralC[3], 46),
    ...Array.from({ length: 14 }, (_, i) => {
      const r = rng(50 + i);
      return bubble((r() * 2 - 1) * 5, -3 + r() * 4.5, 0.06 + r() * 0.08, r());
    }),
  ];
}

function sky(): Prop[] {
  const rainbow: WorldColor[] = ['learn-red', 'learn-orange', 'learn-yellow', 'learn-green', 'learn-blue', 'learn-purple'];
  return [
    // đỉnh đồi cỏ phía trước, bồ câu đi trên đó; xa là đồi thấp, cầu vồng và mặt trời
    ground('grass', -20, 8),
    hill(-8, -16, 7, 'scene-hill-far', 0.35, -0.5),
    hill(6, -17, 8, 'scene-hill-far-dark', 0.3, -0.5),
    ...rainbow.map(
      (c, i): Prop => ({ g: 'torus', a: [7.6 - i * 0.42, 0.22, 6, 40, Math.PI], c, o: 0.85, p: [2.5, -0.5, -18] }),
    ),
    {
      p: [-4.9, 7, -10],
      kids: [
        { g: 'circle', a: [1.5, 28], c: 'scene-sun-core', o: 0.6, p: [0, 0, -0.3] },
        { g: 'sphere', a: [1, 16, 10], c: 'scene-sun' },
        {
          anim: 'spin',
          kids: Array.from({ length: 10 }, (_, i): Prop => {
            const a = (i / 10) * Math.PI * 2;
            return { g: 'cone', a: [0.16, 0.5, 4], c: 'scene-sun-edge', p: [Math.cos(a) * 1.35, Math.sin(a) * 1.35, -0.2], r: [0, 0, a - Math.PI / 2] };
          }),
        },
      ],
    },
    cloud(-5, 5.4, -6, 1.2, 0, 10),
    cloud(2, 6.2, -8, 1.5, 7, 10),
    cloud(6, 4.4, -4.5, 1, 13, 10),
    cloud(-1, 4.8, -3.5, 0.9, 4, 10),
    cloud(-7, 3.8, -9, 1.3, 16, 10),
    ...scatter(18, 61, 6.5, -1, 3.8, 0, (x, z, i) => tuft(x, z, i * 0.7)),
    ...scatter(10, 62, 6, -0.8, 3.6, 3.4, (x, z, i) => flower(x, z, i % 2 ? 'clay-peach' : 'learn-yellow', i)),
  ];
}

const BUILDERS: Record<Habitat, () => Prop[]> = { meadow, pond, forest, sea, sky };
const cache = new Map<Habitat, Prop[]>();

export function sceneryFor(h: Habitat): Prop[] {
  let s = cache.get(h);
  if (!s) {
    s = BUILDERS[h]();
    cache.set(h, s);
  }
  return s;
}

export function sceneryTris(h: Habitat): number {
  return sceneryFor(h).reduce((n, p) => n + propTris(p), 0);
}

/** ContactShadows của mỗi khu: dưới biển cá bơi cao nên bóng nhận từ xa hơn */
export const SHADOW_FAR: Record<Habitat, number> = { meadow: 3, pond: 3, forest: 3, sea: 3.6, sky: 4 };

/** Nền phía sau (CSS, lấy biến từ tokens.css) */
export const BACKDROP: Record<Habitat, string> = {
  meadow: 'linear-gradient(to bottom, var(--sky-top), var(--sky-bottom))',
  pond: 'linear-gradient(to bottom, var(--sky-top), var(--clay-mint))',
  forest: 'linear-gradient(to bottom, var(--world-forest-sky), var(--sky-bottom))',
  sea: 'linear-gradient(to bottom, var(--world-sea-top), var(--world-sea-deep))',
  sky: 'linear-gradient(to bottom, var(--world-sky-high), var(--sky-top) 60%, var(--sky-bottom))',
};

/** Biểu tượng khu (hiện thoáng khi tới khu mới) */
export const HABITAT_ICON: Record<Habitat, string> = { meadow: '🌼', pond: '🐸', forest: '🌲', sea: '🐠', sky: '☁️' };
