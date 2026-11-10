import { validateContent, type ContentItem } from './i18n';

const files = import.meta.glob<unknown>('../content/*.json', { eager: true, import: 'default' });

export function allContent(): ContentItem[] {
  return Object.entries(files).flatMap(([path, data]) => validateContent(data, path));
}

export function contentByKey(): Map<string, ContentItem> {
  return new Map(allContent().map((i) => [i.key, i]));
}
