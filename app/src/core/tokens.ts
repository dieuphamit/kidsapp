export const TOUCH_MIN_PX = 120;
export const TOUCH_GAP_PX = 24;
export const CLAY_COLORS = ['peach', 'mint', 'butter', 'leaf', 'lilac'] as const;
export type ClayColor = (typeof CLAY_COLORS)[number];
