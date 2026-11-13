import { LEARN_COLORS, type LearnColor } from '../../core/tokens';
import { pickFresh, pickManyFresh, shuffle, type Level } from '../../core/variety';

/** Bốn hình cơ bản (mức vừa/dễ chọn từ đây). */
export const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
/** Mọi hình có khối 3D và tiếng đọc `shape.<id>`. */
export const ALL_SHAPES = ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'oval', 'diamond'] as const;
export type Shape = (typeof ALL_SHAPES)[number];

export type Vec3 = [number, number, number];

export interface ShapesState {
  colors: Partial<Record<Shape, LearnColor>>;
  tapped: Set<Shape>;
  placed: Set<Shape>;
  /** Các hình của lượt này; thiếu thì là 4 hình cơ bản. */
  shapes?: readonly Shape[];
}

/**
 * Positions for shadow slots on the shore (near camera, different order from shapes on pond).
 * Order: star, triangle, square, circle (different from SHAPES: circle, square, triangle, star)
 */
export const SLOTS: Record<(typeof SHAPES)[number], Vec3> = {
  star: [-2.4, 0, 3.5],
  triangle: [-0.8, 0, 3.5],
  square: [0.8, 0, 3.5],
  circle: [2.4, 0, 3.5],
};

export type DropResult = 'snap' | 'wrong' | 'none';

/**
 * Determine drop result when a shape is dropped at a point.
 * @param shape - The shape being dropped
 * @param point - The drop position [x, y, z]
 * @param slots - Current slot positions
 * @param radius - Maximum distance for snapping (default 0.9)
 * @returns 'snap' if near correct slot, 'wrong' if near wrong slot, 'none' otherwise
 */
export function dropResult(
  shape: Shape,
  point: [number, number, number],
  slots: Partial<Record<Shape, Vec3>>,
  radius = 0.9
): DropResult {
  const [px, , pz] = point;

  // Find closest slot within radius (using xz distance)
  let closestShape: Shape | null = null;
  let closestDist = Infinity;

  for (const s of Object.keys(slots) as Shape[]) {
    const slot = slots[s];
    if (!slot) continue;
    const [sx, , sz] = slot;
    const dx = px - sx;
    const dz = pz - sz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < radius && dist < closestDist) {
      closestDist = dist;
      closestShape = s;
    }
  }

  if (closestShape === null) return 'none';
  if (closestShape === shape) return 'snap';
  return 'wrong';
}

/**
 * Mark a shape as placed (snapped into slot), return new state.
 */
export function markPlaced(state: ShapesState, shape: Shape): ShapesState {
  if (state.placed.has(shape)) return state;
  const newPlaced = new Set(state.placed);
  newPlaced.add(shape);
  return { ...state, placed: newPlaced };
}

/**
 * Check if all 4 shapes have been placed into their slots.
 */
export function allPlaced(state: ShapesState): boolean {
  return state.placed.size >= (state.shapes ?? SHAPES).length;
}

/**
 * Randomly assign 4 different colors from LEARN_COLORS to 4 shapes.
 */
export function dealColors(rand = Math.random): Record<(typeof SHAPES)[number], LearnColor> {
  return dealColorsFor(SHAPES, rand) as Record<(typeof SHAPES)[number], LearnColor>;
}

/** Mỗi hình một màu khác nhau (tối đa 6 hình). */
export function dealColorsFor(shapes: readonly Shape[], rand = Math.random): Partial<Record<Shape, LearnColor>> {
  const available = [...LEARN_COLORS];
  const result: Partial<Record<Shape, LearnColor>> = {};

  for (const shape of shapes) {
    const idx = Math.floor(rand() * available.length);
    result[shape] = available.splice(idx, 1)[0];
  }

  return result;
}

/**
 * Mark a shape as tapped, return new state.
 */
export function markTapped(state: ShapesState, shape: Shape): ShapesState {
  if (state.tapped.has(shape)) return state;
  const newTapped = new Set(state.tapped);
  newTapped.add(shape);
  return { ...state, tapped: newTapped };
}

/**
 * Check if all 4 shapes have been tapped at least once.
 */
export function allTapped(state: ShapesState): boolean {
  return state.tapped.size >= (state.shapes ?? SHAPES).length;
}

// ---------- Độ khó: số hình, độ giống nhau, độ rộng ô thả ----------

/** Cặp hình dễ nhầm: mức khó luôn có một cặp, cùng màu, để bé phải nhìn kỹ hình dáng. */
export const SIMILAR_PAIRS: readonly (readonly [Shape, Shape])[] = [
  ['square', 'rectangle'],
  ['circle', 'oval'],
  ['square', 'diamond'],
  ['star', 'heart'],
];

export interface LevelRule {
  count: number;
  pool: readonly Shape[];
  /** bán kính hút vào ô bóng (đơn vị 3D) */
  radius: number;
  similar: boolean;
}

export const LEVEL_RULES: Record<Level, LevelRule> = {
  easy: { count: 2, pool: SHAPES, radius: 1.2, similar: false },
  medium: { count: 4, pool: [...SHAPES, 'heart'], radius: 0.9, similar: false },
  hard: { count: 5, pool: ALL_SHAPES, radius: 0.75, similar: true },
};

export interface ShapesRound {
  shapes: Shape[];
  colors: Partial<Record<Shape, LearnColor>>;
  /** vị trí nổi trên hồ */
  positions: Partial<Record<Shape, Vec3>>;
  /** ô bóng trên bờ, thứ tự khác hàng hình */
  slots: Partial<Record<Shape, Vec3>>;
  radius: number;
}

/** Toạ độ x cách đều, căn giữa (5 hình thì sát hơn cho vừa hồ). */
export function rowXs(n: number): number[] {
  const gap = n >= 5 ? 1.5 : 1.6;
  return Array.from({ length: n }, (_, i) => Math.round((i - (n - 1) / 2) * gap * 100) / 100);
}

/**
 * Lượt mới theo mức: dễ 2 hình khác hẳn nhau, ô to; vừa 4 hình; khó 5 hình có một cặp giống nhau
 * cùng màu, ô nhỏ. Ưu tiên hình chưa có ở lượt trước (`recent`).
 */
export function newShapesRound(level: Level, recent: readonly Shape[] = [], rand: () => number = Math.random): ShapesRound {
  const rule = LEVEL_RULES[level];
  let shapes: Shape[];
  let pair: readonly [Shape, Shape] | null = null;
  if (rule.similar) {
    const lastPair = SIMILAR_PAIRS.find(([a, b]) => recent.includes(a) && recent.includes(b)) ?? null;
    pair = pickFresh(SIMILAR_PAIRS, lastPair, rand);
    const chosen = pair;
    const rest = rule.pool.filter((s) => !chosen.includes(s));
    shapes = shuffle([...pair, ...pickManyFresh(rest, rule.count - 2, recent, rand)], rand);
  } else {
    shapes = pickManyFresh(rule.pool, rule.count, recent, rand);
  }
  const colors = dealColorsFor(shapes, rand);
  if (pair) colors[pair[1]] = colors[pair[0]];

  const xs = rowXs(shapes.length);
  const positions: Partial<Record<Shape, Vec3>> = {};
  shapes.forEach((s, i) => {
    positions[s] = [xs[i], 0.8, 0];
  });
  // Ô bóng: xáo thứ tự, không trùng y hệt hàng hình (để bé phải tìm)
  let order = shuffle(shapes.map((_, i) => i), rand);
  if (order.every((v, i) => v === i)) order = order.map((_, i) => (i + 1) % order.length);
  const slots: Partial<Record<Shape, Vec3>> = {};
  shapes.forEach((s, i) => {
    slots[s] = [xs[order[i]], 0, 3.5];
  });
  return { shapes, colors, positions, slots, radius: rule.radius };
}
