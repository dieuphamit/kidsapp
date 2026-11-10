export type Lang = 'vi' | 'ja';
export const LANGS: Lang[] = ['vi', 'ja'];

export interface ContentItem {
  key: string;
  vi: string;
  ja: string;
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
    return { key: item.key, vi: item.vi!, ja: item.ja! };
  });
}

export function textOf(item: ContentItem, lang: Lang): string {
  return item[lang];
}
