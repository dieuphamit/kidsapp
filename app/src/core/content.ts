import { NAME_TOKEN, validateContent, type ContentItem } from './i18n';

const files = import.meta.glob<unknown>('../content/*.json', { eager: true, import: 'default' });

export function allContent(): ContentItem[] {
  return Object.entries(files).flatMap(([path, data]) => validateContent(data, path));
}

export function contentByKey(): Map<string, ContentItem> {
  return new Map(allContent().map((i) => [i.key, i]));
}

/** Key có mẫu {name}: giọng đọc có một file cho mỗi tên bạn đồng hành (speechUrl). */
export const NAMED_KEYS: ReadonlySet<string> = new Set(
  allContent().filter((i) => i.vi.includes(NAME_TOKEN)).map((i) => i.key),
);
