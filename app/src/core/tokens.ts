export const TOUCH_MIN_PX = 120;
export const TOUCH_GAP_PX = 24;
export const CLAY_COLORS = ['peach', 'mint', 'butter', 'leaf', 'lilac'] as const;
export type ClayColor = (typeof CLAY_COLORS)[number];

export const LEARN_COLORS = ['red', 'yellow', 'green', 'blue', 'orange', 'purple'] as const;
export type LearnColor = (typeof LEARN_COLORS)[number];
export const LEARN_HEX: Record<LearnColor, string> = {
  red: '#ff6b6b',
  yellow: '#ffd84d',
  green: '#6fd17a',
  blue: '#5aa9ff',
  orange: '#ffa45b',
  purple: '#b085ff',
};
