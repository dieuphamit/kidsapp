import { describe, it, expect } from 'vitest';
import { validateContent, textOf } from './i18n';

describe('validateContent', () => {
  it('nhận mảng hợp lệ', () => {
    const items = validateContent([{ key: 'animal.cow', vi: 'Con bò', ja: 'うし' }], 'x.json');
    expect(textOf(items[0], 'ja')).toBe('うし');
  });
  it('báo lỗi khi thiếu tiếng Nhật', () => {
    expect(() => validateContent([{ key: 'a.b', vi: 'A', ja: '' }], 'x.json')).toThrow(/x.json.*a.b.*ja/);
  });
  it('báo lỗi key sai định dạng', () => {
    expect(() => validateContent([{ key: 'Bad Key', vi: 'A', ja: 'B' }], 'x.json')).toThrow(/key/);
  });
});
