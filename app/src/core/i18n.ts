export type Lang = 'vi' | 'ja' | 'en';
export const LANGS: Lang[] = ['vi', 'ja', 'en'];

/** Mẫu tên bạn đồng hành trong câu: "{name} trốn ở đâu?" (xem src/core/buddy.ts). */
export const NAME_TOKEN = '{name}';

export interface ContentItem {
  key: string;
  vi: string;
  ja: string;
  en: string;
}

const KEY_RE = /^[a-z0-9]+(\.[a-z0-9-]+)+$/;

export function validateContent(raw: unknown, source: string): ContentItem[] {
  if (!Array.isArray(raw)) throw new Error(`${source}: phải là mảng`);
  return raw.map((it, i) => {
    const item = it as Partial<ContentItem>;
    if (!item.key || !KEY_RE.test(item.key)) throw new Error(`${source}[${i}]: key "${item.key}" sai định dạng a.b`);
    for (const lang of LANGS) {
      if (!item[lang] || !String(item[lang]).trim()) throw new Error(`${source}: ${item.key} thiếu ${lang}`);
    }
    // Câu có tên bạn đồng hành: mẫu {name} phải có ở cả ba ngôn ngữ (giọng đọc sinh theo từng tên)
    const named = LANGS.filter((lang) => String(item[lang]).includes(NAME_TOKEN));
    if (named.length > 0 && named.length < LANGS.length) {
      const miss = LANGS.filter((l) => !named.includes(l)).join(', ');
      throw new Error(`${source}: ${item.key} có {name} nhưng thiếu ở ${miss}`);
    }
    return { key: item.key, vi: item.vi!, ja: item.ja!, en: item.en! };
  });
}

export function textOf(item: ContentItem, lang: Lang): string {
  return item[lang];
}
