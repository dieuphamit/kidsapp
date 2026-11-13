import { describe, it, expect } from 'vitest';
import { allContent, NAMED_KEYS } from './content';
import { DEFAULT_NAME_ID, fillName } from './buddy';

describe('content', () => {
  it('mọi file content hợp lệ và key không trùng', () => {
    const items = allContent();
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys).toContain('ui.mascot-name');
  });
  it('mọi câu có tiếng Anh, linh vật tên Dau Dau', () => {
    const items = allContent();
    for (const item of items) expect(item.en.trim(), item.key).not.toBe('');
    const mascot = items.find((i) => i.key === 'ui.mascot-name')!;
    // tên viết dạng mẫu {name}; tên mặc định tiếng Anh vẫn là Dau Dau
    expect(fillName(mascot.en, 'en', DEFAULT_NAME_ID)).toBe('Dau Dau');
    expect(fillName(mascot.vi, 'vi', DEFAULT_NAME_ID)).toBe('Đậu Đậu');
    expect(fillName(mascot.ja, 'ja', DEFAULT_NAME_ID)).toBe('ダウダウ');
  });
  it('tên linh vật không viết cứng: mọi câu có tên dùng mẫu {name} ở cả ba ngôn ngữ', () => {
    for (const item of allContent()) {
      for (const lang of ['vi', 'ja', 'en'] as const) {
        expect(item[lang], `${item.key}.${lang}`).not.toMatch(/Đậu Đậu|ダウダウ|Dau Dau/);
      }
    }
    for (const key of ['ui.mascot-name', 'ui.hello', 'ui.sleep', 'buddy.hello', 'game.hide', 'hide.hello', 'hide.ask-in-box', 'path.hello', 'place.house']) {
      expect(NAMED_KEYS.has(key), key).toBe(true);
    }
    expect(NAMED_KEYS.has('ui.great')).toBe(false);
    expect(NAMED_KEYS.size).toBe(93);
  });
});
