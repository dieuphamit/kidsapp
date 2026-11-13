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
