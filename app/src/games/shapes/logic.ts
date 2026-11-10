import { LEARN_COLORS, type LearnColor } from '../../core/tokens';

export const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
export type Shape = (typeof SHAPES)[number];

export interface ShapesState {
  colors: Record<Shape, LearnColor>;
  tapped: Set<Shape>;
  placed: Set<Shape>;
}

/**
 * Positions for shadow slots on the shore (near camera, different order from shapes on pond).
 * Order: star, triangle, square, circle (different from SHAPES: circle, square, triangle, star)
 */
export const SLOTS: Record<Shape, [number, number, number]> = {
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
  slots: Record<Shape, [number, number, number]>,
  radius = 0.9
): DropResult {
  const [px, , pz] = point;

  // Find closest slot within radius (using xz distance)
  let closestShape: Shape | null = null;
  let closestDist = Infinity;

  for (const s of SHAPES) {
    const [sx, , sz] = slots[s];
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
  return state.placed.size >= SHAPES.length;
}

/**
 * Randomly assign 4 different colors from LEARN_COLORS to 4 shapes.
 */
export function dealColors(rand = Math.random): Record<Shape, LearnColor> {
  const available = [...LEARN_COLORS];
  const result = {} as Record<Shape, LearnColor>;

  for (const shape of SHAPES) {
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
  return state.tapped.size >= SHAPES.length;
}
