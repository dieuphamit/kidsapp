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

/** Bạn đồng hành đất sét (src/ui/buddyModel.ts): bốn con vật, mỗi con một bộ màu lông. */
export const BUDDY_CHARACTERS = ['cat', 'dog', 'bunny', 'bear'] as const;
export type BuddyCharacter = (typeof BUDDY_CHARACTERS)[number];
/** fur = lông; belly = bụng, mõm; accent = lòng tai, mũi, tai cụp (cún). */
export type BuddyPalette = { fur: string; belly: string; accent: string };
export const BUDDY_HEX: Record<BuddyCharacter, BuddyPalette> = {
  cat: { fur: '#f6c27a', belly: '#fff3e0', accent: '#ff9fb2' },
  dog: { fur: '#f2d2a9', belly: '#fff3e0', accent: '#b07a52' },
  bunny: { fur: '#fbeef6', belly: '#ffffff', accent: '#ffb3c9' },
  bear: { fur: '#c8916a', belly: '#f6dfc4', accent: '#8d5c40' },
};
/** Mắt và má hồng dùng chung cho mọi bạn đồng hành. */
export const BUDDY_INK = '#3a2a40';
export const BUDDY_CHEEK = '#ff9fb2';

/**
 * Màu cho cảnh 3D (three không đọc được biến CSS): chép từ tokens.css, mỗi mục ghi tên biến gốc.
 * Test tokens.test.ts đối chiếu từng mã với tokens.css, nên đổi màu thì đổi ở cả hai nơi.
 */
export const SCENE_VARS = {
  grass: '--grass',
  leaf: '--scene-leaf',
  leafLight: '--scene-leaf-light',
  leafDark: '--scene-leaf-dark',
  leafShine: '--scene-leaf-shine',
  bark: '--scene-bark',
  wood: '--scene-wood',
  woodDark: '--scene-wood-dark',
  rock: '--world-rock',
  water: '--world-water',
  waterLight: '--world-water-light',
  peach: '--clay-peach',
  mint: '--clay-mint',
  butter: '--clay-butter',
  clayLeaf: '--clay-leaf',
  lilac: '--clay-lilac',
  ink: '--ink',
  paper: '--paper',
} as const;
export type SceneColor = keyof typeof SCENE_VARS;
export const SCENE_HEX: Record<SceneColor, string> = {
  grass: '#9be38a',
  leaf: '#5fc163',
  leafLight: '#98de78',
  leafDark: '#3a9550',
  leafShine: '#d4f7b0',
  bark: '#a8774f',
  wood: '#e2b282',
  woodDark: '#c08a5c',
  rock: '#c7b8a8',
  water: '#7fd3e6',
  waterLight: '#b8ecf2',
  peach: '#ffb4a2',
  mint: '#a0e7e5',
  butter: '#ffe29a',
  clayLeaf: '#b4f8c8',
  lilac: '#cdb4ff',
  ink: '#3b2a6b',
  paper: '#ffffff',
};
