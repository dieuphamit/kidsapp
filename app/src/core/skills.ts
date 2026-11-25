import type { Lang } from './i18n';

/** Nhóm kỹ năng cố định để bố mẹ xem bé đang rèn gì (chỉ hiện ở khu bố mẹ, không hiện cho bé). */
export type Skill = 'math' | 'creativity' | 'language' | 'science' | 'logic' | 'social';

export const SKILLS: Skill[] = ['math', 'logic', 'language', 'science', 'creativity', 'social'];

export const SKILL_INFO: Record<Skill, { icon: string; color: string } & Record<Lang, string>> = {
  math: { icon: '🔢', color: 'var(--learn-blue)', vi: 'Toán', ja: 'かず', en: 'Math' },
  logic: { icon: '🧩', color: 'var(--learn-purple)', vi: 'Logic', ja: 'かんがえる ちから', en: 'Logic' },
  language: { icon: '💬', color: 'var(--learn-orange)', vi: 'Ngôn ngữ', ja: 'ことば', en: 'Language' },
  science: { icon: '🌿', color: 'var(--learn-green)', vi: 'Khoa học – thiên nhiên', ja: 'しぜん・かがく', en: 'Science & nature' },
  creativity: { icon: '🎨', color: 'var(--learn-yellow)', vi: 'Sáng tạo', ja: 'そうぞう', en: 'Creativity' },
  social: { icon: '💗', color: 'var(--learn-red)', vi: 'Cảm xúc – xã hội', ja: 'こころ・かかわり', en: 'Social & emotional' },
};

/**
 * Id trò (manifest.id, không phải tên thư mục) → kỹ năng chính (1–2, cái quan trọng nhất trước).
 * Mọi thư mục trong src/games phải có mục ở đây (skills.test.ts kiểm tra). Có sẵn cả trò sắp có: dots (Nối điểm), feed (Cho thú ăn), words (Đồ vật quanh bé).
 */
export const GAME_SKILLS: Record<string, Skill[]> = {
  animals: ['science', 'language'],
  bakery: ['math', 'creativity'],
  band: ['creativity', 'social'],
  bath: ['social', 'science'],
  coloring: ['creativity'],
  cook: ['language', 'social'],
  counting: ['math'],
  dots: ['math', 'logic'],
  feed: ['science', 'social'],
  hide: ['logic', 'language'],
  mama: ['science', 'social'],
  memory: ['logic'],
  music: ['creativity'],
  path: ['logic'],
  pattern: ['logic', 'math'],
  peekaboo: ['social', 'language'],
  puzzle: ['logic'],
  rescue: ['social', 'logic'],
  shadow: ['logic', 'science'],
  shapes: ['math', 'language'],
  shop: ['math', 'social'],
  sort: ['logic', 'math'],
  'sound-quiz': ['science', 'language'],
  story: ['language', 'logic'],
  words: ['language'],
  world: ['science'],
  zoo3d: ['science', 'language'], // thư mục games/zoo
};

export function skillsOf(gameId: string): Skill[] {
  return GAME_SKILLS[gameId] ?? [];
}
