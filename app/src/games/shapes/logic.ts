import { LEARN_COLORS, type LearnColor } from '../../core/tokens';

export const SHAPES = ['circle', 'square', 'triangle', 'star'] as const;
export type Shape = (typeof SHAPES)[number];

export interface ShapesState {
  colors: Record<Shape, LearnColor>;
  tapped: Set<Shape>;
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
