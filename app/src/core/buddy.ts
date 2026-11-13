import { NAME_TOKEN, type Lang } from './i18n';
import { BUDDY_CHARACTERS, type BuddyCharacter } from './tokens';
import NAMES from './buddyNames.json';

export { BUDDY_CHARACTERS, NAME_TOKEN, type BuddyCharacter };

/**
 * Tên có sẵn của bạn đồng hành. Nguồn duy nhất là buddyNames.json: tools/tts/generate.py và
 * scripts/check-audio.mjs cũng đọc file này. Phần tử đầu là tên mặc định (Đậu Đậu).
 */
export interface BuddyName {
  id: string;
  vi: string;
  ja: string;
  en: string;
}

export const BUDDY_NAMES: readonly BuddyName[] = NAMES;
export const DEFAULT_NAME_ID = BUDDY_NAMES[0].id;

export interface Buddy {
  character: BuddyCharacter;
  name: string;
}

/** Mặc định giữ đúng linh vật cũ: mèo Đậu Đậu. */
export const DEFAULT_BUDDY: Buddy = { character: 'cat', name: DEFAULT_NAME_ID };

export function hasNameToken(text: string): boolean {
  return text.includes(NAME_TOKEN);
}

function nameById(id: string): BuddyName {
  return BUDDY_NAMES.find((n) => n.id === id) ?? BUDDY_NAMES[0];
}

export function buddyName(id: string, lang: Lang): string {
  return nameById(id)[lang];
}

/** Thay {name} bằng tên đang dùng; câu không có mẫu giữ nguyên. */
export function fillName(text: string, lang: Lang, nameId: string): string {
  return hasNameToken(text) ? text.split(NAME_TOKEN).join(buddyName(nameId, lang)) : text;
}

/** Vá dữ liệu lưu cũ hoặc sai: thiếu/lạ thì về mèo + Đậu Đậu từng phần. */
export function sanitizeBuddy(raw: unknown): Buddy {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Buddy, unknown>>;
  const character = (BUDDY_CHARACTERS as readonly unknown[]).includes(r.character)
    ? (r.character as BuddyCharacter)
    : DEFAULT_BUDDY.character;
  const name = BUDDY_NAMES.some((n) => n.id === r.name) ? (r.name as string) : DEFAULT_BUDDY.name;
  return { character, name };
}

/**
 * Ảnh 2D của nhân vật cho các màn 2D (màn chọn trò, kệ, Trốn ở đâu, Đường về nhà...).
 * Mèo giữ ảnh cũ cards/daudau.png; các con khác cards/buddy-<id>.png (scripts/render-daudau.mjs).
 */
export function buddyImageUrl(character: BuddyCharacter, base = import.meta.env.BASE_URL): string {
  return character === 'cat' ? `${base}cards/daudau.png` : `${base}cards/buddy-${character}.png`;
}
